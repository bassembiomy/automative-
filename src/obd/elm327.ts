import type { Transport } from './transport/Transport';
import { parseResponse, type EcuResponse } from './parser';
import { protocolFromDpn, type ProtocolInfo } from './protocols';

export type ElmErrorKind =
  | 'NO_DATA' | 'UNABLE_TO_CONNECT' | 'CAN_ERROR' | 'BUS_ERROR' | 'BUS_INIT_ERROR' | 'UNKNOWN_COMMAND'
  | 'STOPPED' | 'BUFFER_FULL' | 'FB_ERROR' | 'DATA_ERROR' | 'RX_ERROR' | 'BUS_BUSY' | 'TIMEOUT' | 'NOT_OPEN';

export class ElmError extends Error {
  readonly kind: ElmErrorKind;
  readonly command: string;
  constructor(kind: ElmErrorKind, command: string, message?: string) {
    super(message ?? `${kind.replace(/_/g, ' ')} (${command})`);
    this.name = 'ElmError';
    this.kind = kind;
    this.command = command;
  }
}

const ERROR_TOKENS: [RegExp, ElmErrorKind][] = [
  [/UNABLE TO CONNECT/, 'UNABLE_TO_CONNECT'],
  [/NO DATA/, 'NO_DATA'],
  [/BUS INIT:.*ERROR/, 'BUS_INIT_ERROR'],
  [/BUS ERROR/, 'BUS_ERROR'],
  [/BUS BUSY/, 'BUS_BUSY'],
  [/CAN ERROR/, 'CAN_ERROR'],
  [/BUFFER FULL/, 'BUFFER_FULL'],
  [/FB ERROR/, 'FB_ERROR'],
  [/DATA ERROR/, 'DATA_ERROR'],
  [/RX ERROR/, 'RX_ERROR'],
  [/STOPPED/, 'STOPPED'],
  [/^\?$/, 'UNKNOWN_COMMAND'],
];

export type LogDirection = 'tx' | 'rx' | 'info' | 'error';
export type LogFn = (dir: LogDirection, text: string) => void;

export interface Elm327Options {
  defaultTimeoutMs?: number;
  onLog?: LogFn;
  /** Extra wait after ATZ in ms (real adapters need time to reboot). */
  resetDelayMs?: number;
}

export interface AdapterInfo {
  version: string;
  voltage?: string;
  protocol: ProtocolInfo;
}

export const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Strip echo, searching banners, blank lines; collapse whitespace. */
export function cleanLines(raw: string, command: string): string[] {
  const cmd = command.replace(/\s+/g, '').toUpperCase();
  return raw
    .split(/[\r\n]+/)
    .map((l) => l.replace(/\0/g, '').trim().replace(/\s+/g, ' '))
    .filter((l) => {
      if (!l) return false;
      const u = l.toUpperCase();
      if (u.replace(/\s+/g, '') === cmd) return false; // echo
      if (u.startsWith('SEARCHING')) return false;
      if (/^BUS INIT:\s*(\.\.\.)?\s*OK$/.test(u)) return false;
      return true;
    });
}

export function detectError(lines: string[], command: string): ElmError | undefined {
  for (const line of lines) {
    const u = line.toUpperCase();
    for (const [re, kind] of ERROR_TOKENS) {
      if (re.test(u)) return new ElmError(kind, command, `${kind.replace(/_/g, ' ')} in reply to ${command}`);
    }
  }
  return undefined;
}

export class Elm327 {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly timeoutMs: number;
  private readonly log: LogFn;
  private readonly resetDelayMs: number;
  headers = true;
  /** Set after a timeout: the adapter may still send a late reply and prompt that must not leak into the next command. */
  private stale = false;

  constructor(readonly transport: Transport, opts: Elm327Options = {}) {
    this.timeoutMs = opts.defaultTimeoutMs ?? 3000;
    this.log = opts.onLog ?? (() => {});
    this.resetDelayMs = opts.resetDelayMs ?? 500;
  }

  /** Send a command and return cleaned reply lines. Throws ElmError for adapter error tokens or timeouts. */
  send(command: string, timeoutMs?: number): Promise<string[]> {
    const run = async () => {
      if (this.stale) await this.drain();
      return this.exec(command, timeoutMs ?? this.timeoutMs);
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Like send() but returns the lines even when an error token is present. */
  async sendLenient(command: string, timeoutMs?: number): Promise<{ lines: string[]; error?: ElmError }> {
    try {
      return { lines: await this.send(command, timeoutMs) };
    } catch (e) {
      if (e instanceof ElmError && e.kind !== 'TIMEOUT' && e.kind !== 'NOT_OPEN') return { lines: [], error: e };
      throw e;
    }
  }

  /** Interrupt any command still running on the adapter and discard output up to its prompt. */
  private drain(): Promise<void> {
    this.stale = false;
    return new Promise<void>((resolve) => {
      const unsubscribe = this.transport.onData((chunk) => {
        if (chunk.includes('>')) finish();
      });
      const timer = setTimeout(() => finish(), 1000);
      function finish() {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
      // Any character stops a running ELM327 command, which then prints its prompt.
      this.transport.write('\r').catch(() => finish());
    });
  }

  private exec(command: string, timeoutMs: number): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      if (!this.transport.isOpen) {
        reject(new ElmError('NOT_OPEN', command, 'Adapter connection is not open'));
        return;
      }
      let buffer = '';
      let done = false;
      const finish = (fn: () => void) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        unsubscribe();
        fn();
      };
      const timer = setTimeout(() => {
        this.log('error', `timeout waiting for reply to ${command}`);
        this.stale = true;
        finish(() => reject(new ElmError('TIMEOUT', command, `No reply from adapter to ${command}`)));
      }, timeoutMs);
      const unsubscribe = this.transport.onData((chunk) => {
        buffer += chunk;
        const idx = buffer.indexOf('>');
        if (idx < 0) return;
        const raw = buffer.slice(0, idx);
        this.log('rx', raw.replace(/\r/g, '\n').trim());
        const lines = cleanLines(raw, command);
        const err = detectError(lines, command);
        finish(() => (err ? reject(err) : resolve(lines)));
      });
      this.log('tx', command);
      this.transport.write(`${command}\r`).catch((e: unknown) => {
        finish(() => reject(new ElmError('NOT_OPEN', command, e instanceof Error ? e.message : 'Write failed')));
      });
    });
  }

  /** Send an OBD request in hex (e.g. "0100") and parse it. Throws on NO DATA etc. */
  async request(hex: string, timeoutMs?: number): Promise<EcuResponse[]> {
    const lines = await this.send(hex, timeoutMs);
    return parseResponse(lines, { headers: this.headers });
  }

  /** Like request() but returns an empty list for NO DATA. */
  async requestOrEmpty(hex: string, timeoutMs?: number): Promise<EcuResponse[]> {
    try {
      return await this.request(hex, timeoutMs);
    } catch (e) {
      if (e instanceof ElmError && e.kind === 'NO_DATA') return [];
      throw e;
    }
  }

  async resetAdapter(): Promise<string> {
    const lines = await this.send('ATZ', 5000);
    if (this.resetDelayMs > 0) await delay(this.resetDelayMs);
    return lines.find((l) => /ELM|OBD|STN/i.test(l)) ?? lines.join(' ');
  }

  async configure(): Promise<void> {
    for (const cmd of ['ATE0', 'ATL0', 'ATS1', 'ATH1', 'ATAT1']) await this.send(cmd);
    this.headers = true;
  }

  async detectProtocol(): Promise<ProtocolInfo> {
    await this.send('ATSP0');
    await this.send('0100', 15000);
    const lines = await this.send('ATDPN');
    return protocolFromDpn(lines[0] ?? '');
  }

  async readVoltage(): Promise<string | undefined> {
    try {
      const lines = await this.send('ATRV');
      return lines[0];
    } catch {
      return undefined;
    }
  }

  async readVersion(): Promise<string | undefined> {
    try {
      const lines = await this.send('ATI');
      return lines[0];
    } catch {
      return undefined;
    }
  }

  /** Full init sequence: ATZ, ATE0, ATL0, ATS1, ATH1, ATAT1, ATSP0, 0100, ATDPN, ATRV, ATI. */
  async init(): Promise<AdapterInfo> {
    const banner = await this.resetAdapter();
    await this.configure();
    const protocol = await this.detectProtocol();
    const voltage = await this.readVoltage();
    const version = (await this.readVersion()) ?? banner;
    return { version, voltage, protocol };
  }
}
