import type { Transport } from './Transport';
import { SIM_VEHICLES, type SimDtc, type SimModule, type SimVehicle, findSimVehicle } from './simulatorVehicles';
import { buildSupportedBitmap, encodePid } from '../pids';
import { encodeDtc } from '../dtc';

export interface SimulatorOptions {
  /** [min, max] artificial latency per command in ms. Default [20, 60]. */
  latencyMs?: [number, number];
  /** Clock source (ms) used for live-data generators. */
  now?: () => number;
}

interface Reply {
  lines: string[];
}

const hex2 = (n: number) => (n & 0xff).toString(16).toUpperCase().padStart(2, '0');

const PROTOCOL_NAMES: Record<string, string> = {
  '3': 'ISO 9141-2',
  '5': 'ISO 14230-4 (KWP FAST)',
  '6': 'ISO 15765-4 (CAN 11/500)',
};

interface UdsModule {
  name: string;
  tx: string;
  rx: string;
  dtcs: { code: string; ftb: number; status: number }[];
  /** engine / transmission modules mirror the OBD ECU code lists */
  obdIndex?: number;
}

/**
 * In-memory ELM327 emulator with scripted vehicles. Replies use the framing of the preset's protocol
 * (CAN ISO-TP frames, K-line headers with checksum) so the real parser is exercised.
 */
export class SimulatorTransport implements Transport {
  readonly kind = 'simulator' as const;
  readonly vehicle: SimVehicle;
  private opened = false;
  private listeners = new Set<(chunk: string) => void>();
  private inbox = '';
  private chain: Promise<void> = Promise.resolve();
  private readonly latency: [number, number];
  private readonly now: () => number;
  private startedAt = 0;
  private clearedAt = 0;

  // mutable vehicle state
  private stored: SimDtc[] = [];
  private pending: SimDtc[] = [];
  private permanent: SimDtc[] = [];
  private modules: UdsModule[] = [];
  private mil = true;
  private hasFreeze = true;

  // ELM state
  private echo = true;
  private linefeed = true;
  private spaces = true;
  private headers = false;
  private header = '7DF';
  private cra: string | null = null;
  private protocolSel = '0';
  private searched = false;

  constructor(vehicle: SimVehicle | string = SIM_VEHICLES[0], opts: SimulatorOptions = {}) {
    this.vehicle = typeof vehicle === 'string' ? findSimVehicle(vehicle) : vehicle;
    this.latency = opts.latencyMs ?? [20, 60];
    this.now = opts.now ?? (() => Date.now());
    this.resetVehicle();
  }

  get isOpen(): boolean {
    return this.opened;
  }

  private resetVehicle(): void {
    const v = this.vehicle;
    this.stored = v.stored.map((d) => ({ ...d }));
    this.pending = v.pending.map((d) => ({ ...d }));
    this.permanent = v.permanent.map((d) => ({ ...d }));
    this.mil = v.mil;
    this.hasFreeze = !!v.freeze;
    this.modules = [];
    if (v.protocol === '6') {
      this.modules.push({ name: 'Engine control (ECM)', tx: '7E0', rx: v.obdEcus[0], dtcs: [], obdIndex: 0 });
      if (v.obdEcus[1]) this.modules.push({ name: 'Transmission control (TCM)', tx: '7E1', rx: v.obdEcus[1], dtcs: [], obdIndex: 1 });
      for (const m of v.modules as SimModule[]) this.modules.push({ ...m, dtcs: m.dtcs.map((d) => ({ ...d })) });
    }
  }

  async open(): Promise<void> {
    this.opened = true;
    this.startedAt = this.now();
    this.clearedAt = this.startedAt;
    this.resetVehicle();
    this.resetElm();
  }

  async close(): Promise<void> {
    this.opened = false;
    this.listeners.clear();
  }

  onData(cb: (chunk: string) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async write(data: string): Promise<void> {
    if (!this.opened) throw new Error('Simulator is not open');
    this.inbox += data;
    let idx: number;
    while ((idx = this.inbox.search(/[\r\n]/)) >= 0) {
      const cmd = this.inbox.slice(0, idx);
      this.inbox = this.inbox.slice(idx + 1);
      if (cmd.trim() === '') continue;
      this.enqueue(cmd);
    }
  }

  private enqueue(cmd: string): void {
    const [lo, hi] = this.latency;
    const wait = lo + Math.random() * Math.max(0, hi - lo);
    this.chain = this.chain.then(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            if (this.opened) this.emit(cmd);
            resolve();
          }, wait);
        }),
    );
  }

  private emit(cmd: string): void {
    const echoText = this.echo ? `${cmd}\r` : '';
    const { lines } = this.handle(cmd);
    const eol = this.linefeed ? '\r\n' : '\r';
    const body = lines.length ? lines.join(eol) + eol : '';
    const text = `${echoText}${body}${eol}>`;
    // Deliver in two chunks to exercise the driver's buffering.
    const cut = Math.floor(text.length / 2);
    this.push(text.slice(0, cut));
    setTimeout(() => this.push(text.slice(cut)), 0);
  }

  private push(chunk: string): void {
    this.listeners.forEach((l) => l(chunk));
  }

  private resetElm(): void {
    this.echo = true;
    this.linefeed = true;
    this.spaces = true;
    this.headers = false;
    this.header = '7DF';
    this.cra = null;
    this.protocolSel = '0';
    this.searched = false;
  }

  // ---- command handling -------------------------------------------------------------------

  private handle(raw: string): Reply {
    const cmd = raw.replace(/\s+/g, '').toUpperCase();
    if (cmd.startsWith('AT')) return this.handleAt(cmd.slice(2));
    if (!/^[0-9A-F]+$/.test(cmd) || cmd.length % 2 !== 0) return { lines: ['?'] };
    return this.handleObd(cmd);
  }

  private handleAt(at: string): Reply {
    const ok: Reply = { lines: ['OK'] };
    if (at === 'Z' || at === 'WS' || at === 'FI') {
      this.resetElm();
      return { lines: ['', 'ELM327 v1.5'] };
    }
    if (at === 'D') {
      this.resetElm();
      return ok;
    }
    if (at.startsWith('E')) { this.echo = at[1] === '1'; return ok; }
    if (at.startsWith('L')) { this.linefeed = at[1] === '1'; return ok; }
    if (at.startsWith('S') && at.length === 2) { this.spaces = at[1] === '1'; return ok; }
    if (at.startsWith('H') && at.length === 2) { this.headers = at[1] === '1'; return ok; }
    if (at === 'DPN') return { lines: [(this.protocolSel === '0' ? 'A' : '') + (this.searched ? this.vehicle.protocol : this.protocolSel)] };
    if (at === 'DP') {
      const p = this.searched ? this.vehicle.protocol : this.protocolSel;
      return { lines: [(this.protocolSel === '0' ? 'AUTO, ' : '') + (PROTOCOL_NAMES[p] ?? 'AUTOMATIC')] };
    }
    if (at.startsWith('SP')) {
      this.protocolSel = at.slice(2) || '0';
      this.searched = false;
      return ok;
    }
    if (at.startsWith('TP')) {
      this.protocolSel = at.slice(2) || '0';
      this.searched = false;
      return ok;
    }
    if (at === 'RV') return { lines: [`${(12.2 + (Math.sin(this.now() / 4000) + 1) * 0.15).toFixed(1)}V`] };
    if (at === 'I') return { lines: ['ELM327 v1.5'] };
    if (at === '@1') return { lines: ['OBDII to RS232 Interpreter'] };
    if (at.startsWith('SH')) { this.header = at.slice(2).padStart(3, '0'); return ok; }
    if (at.startsWith('CRA')) { this.cra = at.slice(3) || null; return ok; }
    if (at === 'AR') { this.cra = null; return ok; }
    if (/^(AT|CAF|ST|PC|BD|CF|CM|FC|IB|IIA|KW|M|NL|R|SW|SI|CV|CP|FCSH|FCSD|FCSM|SS|JE|TA|V|CEA|CS|AL|BI|DM1|RA|RD|SD|PP|PPS|SR|SPB|WM)/.test(at)) return ok;
    return { lines: ['?'] };
  }

  private clock(): number {
    return (this.now() - this.startedAt) / 1000;
  }

  private handleObd(cmd: string): Reply {
    const v = this.vehicle;
    const lines: string[] = [];

    // Automatic protocol search on the first data request.
    if (!this.searched) {
      if (this.protocolSel !== '0' && this.protocolSel !== v.protocol) {
        return { lines: ['UNABLE TO CONNECT'] };
      }
      lines.push('SEARCHING...');
      if (v.protocol !== '6') lines.push('BUS INIT: OK');
      this.searched = true;
    }

    const bytes: number[] = [];
    for (let i = 0; i < cmd.length; i += 2) bytes.push(parseInt(cmd.slice(i, i + 2), 16));
    const responses = this.respond(bytes);
    const filtered = this.cra ? responses.filter((r) => r.ecu === this.cra) : responses;
    if (filtered.length === 0) {
      lines.push('NO DATA');
      return { lines };
    }
    for (const r of filtered) lines.push(...this.frame(r.ecu, r.payload));
    return { lines };
  }

  /** Decide which ECUs answer a request and what they say. */
  private respond(req: number[]): { ecu: string; payload: number[] }[] {
    const v = this.vehicle;
    const can = v.protocol === '6';
    const sid = req[0];
    const out: { ecu: string; payload: number[] }[] = [];

    // UDS on a specific module
    if (can && (sid === 0x19 || sid === 0x14)) {
      const mod = this.modules.find((m) => m.tx === this.header);
      if (!mod) return out;
      if (sid === 0x19) {
        if (req[1] !== 0x02) return [{ ecu: mod.rx, payload: [0x7f, 0x19, 0x12] }];
        const dtcs = this.udsDtcs(mod);
        const payload = [0x59, 0x02, 0xff];
        for (const d of dtcs) {
          const [b1, b2] = encodeDtc(d.code);
          payload.push(b1, b2, d.ftb, d.status);
        }
        return [{ ecu: mod.rx, payload }];
      }
      this.clearModule(mod);
      return [{ ecu: mod.rx, payload: [0x54] }];
    }

    // Standard OBD services: functional address, or physical addresses of the OBD ECUs
    let targets: number[] = v.obdEcus.map((_, i) => i);
    if (can && this.header !== '7DF') {
      const mod = this.modules.find((m) => m.tx === this.header);
      if (!mod || mod.obdIndex === undefined) return out;
      targets = [mod.obdIndex];
    }

    switch (sid) {
      case 0x01: {
        const payload = [0x41];
        let idx = 1;
        while (idx < req.length) {
          const pid = req[idx++];
          const data = this.mode01(pid);
          if (!data) continue;
          payload.push(pid, ...data);
          if (!can) break; // one PID per K-line request
        }
        if (payload.length > 1) out.push({ ecu: v.obdEcus[0], payload });
        break;
      }
      case 0x02: {
        const pid = req[1];
        if (!v.freeze || !this.hasFreeze) break;
        if (pid === 0x02) {
          const [b1, b2] = encodeDtc(v.freeze.dtc);
          out.push({ ecu: v.obdEcus[0], payload: [0x42, 0x02, 0x00, b1, b2] });
        } else if (v.freeze.values[pid] !== undefined) {
          out.push({ ecu: v.obdEcus[0], payload: [0x42, pid, 0x00, ...encodePid(pid, v.freeze.values[pid])] });
        }
        break;
      }
      case 0x03:
      case 0x07:
      case 0x0a: {
        const list = sid === 0x03 ? this.stored : sid === 0x07 ? this.pending : this.permanent;
        const resp = sid + 0x40;
        if (sid === 0x0a && !can) break; // permanent DTCs are not available on pre-CAN cars
        for (const idx of targets) {
          const codes = list.filter((d) => (d.ecu ?? 0) === idx).map((d) => d.code);
          if (can) {
            const payload = [resp, codes.length];
            for (const c of codes) payload.push(...encodeDtc(c));
            out.push({ ecu: v.obdEcus[idx], payload });
          } else {
            // K-line: messages of up to 3 codes, padded with 00 00
            const groups = codes.length ? Math.ceil(codes.length / 3) : 1;
            for (let g = 0; g < groups; g++) {
              const payload = [resp];
              const slice = codes.slice(g * 3, g * 3 + 3);
              for (const c of slice) payload.push(...encodeDtc(c));
              while (payload.length < 7) payload.push(0x00);
              out.push({ ecu: v.obdEcus[idx], payload });
            }
          }
        }
        break;
      }
      case 0x04: {
        this.clearAllCodes();
        out.push(...targets.map((i) => ({ ecu: v.obdEcus[i], payload: [0x44] })));
        break;
      }
      case 0x09: {
        const pid = req[1];
        if (pid === 0x00) {
          out.push({ ecu: v.obdEcus[0], payload: [0x49, 0x00, 0x40, 0x00, 0x00, 0x00] });
        } else if (pid === 0x02) {
          const chars = Array.from(v.vin).map((c) => c.charCodeAt(0));
          if (can) {
            out.push({ ecu: v.obdEcus[0], payload: [0x49, 0x02, 0x01, ...chars] });
          } else {
            const padded = [0, 0, 0, ...chars];
            for (let i = 0, n = 1; i < padded.length; i += 4, n++) {
              out.push({ ecu: v.obdEcus[0], payload: [0x49, 0x02, n, ...padded.slice(i, i + 4)] });
            }
          }
        }
        break;
      }
      default:
        break;
    }
    return out;
  }

  private udsDtcs(mod: UdsModule): { code: string; ftb: number; status: number }[] {
    if (mod.obdIndex === undefined) return mod.dtcs;
    const idx = mod.obdIndex;
    const mk = (list: SimDtc[], status: number) =>
      list.filter((d) => (d.ecu ?? 0) === idx).map((d) => ({ code: d.code, ftb: 0x00, status }));
    return [...mk(this.stored, 0x2f), ...mk(this.pending, 0x24)];
  }

  private clearModule(mod: UdsModule): void {
    if (mod.obdIndex === undefined) {
      mod.dtcs = [];
      return;
    }
    const idx = mod.obdIndex;
    this.stored = this.stored.filter((d) => (d.ecu ?? 0) !== idx);
    this.pending = this.pending.filter((d) => (d.ecu ?? 0) !== idx);
    this.permanent = this.permanent.filter((d) => (d.ecu ?? 0) !== idx);
    this.afterClear();
  }

  private clearAllCodes(): void {
    this.stored = [];
    this.pending = [];
    this.permanent = []; // the simulator assumes the fault has been repaired
    for (const m of this.modules) if (m.obdIndex === undefined) m.dtcs = [];
    this.afterClear();
  }

  private afterClear(): void {
    this.mil = this.stored.length > 0;
    this.hasFreeze = this.stored.length > 0;
    this.clearedAt = this.now();
  }

  // ---- Mode 01 ---------------------------------------------------------------------------

  private mode01(pid: number): number[] | undefined {
    const v = this.vehicle;
    if (pid === 0x00 || pid === 0x20 || pid === 0x40 || pid === 0x60) {
      return buildSupportedBitmap(pid, v.supportedPids);
    }
    if (pid === 0x01) {
      const count = this.stored.length;
      return [(this.mil && count > 0 ? 0x80 : 0) | (count & 0x7f), 0x07, 0xe5, 0x00];
    }
    if (!v.supportedPids.includes(pid)) return undefined;
    const t = this.clock();
    const val = this.live(t)[pid];
    return val === undefined ? undefined : encodePid(pid, val);
  }

  private live(t: number): Record<number, number> {
    const v = this.vehicle;
    const warm = Math.min(1, t / 150);
    const n = (k: number) => Math.sin(t * k + k * 7.13) * 0.5 + Math.sin(t * k * 2.3) * 0.5;
    const speed = Math.max(0, 22 + 38 * Math.sin(t / 18));
    const rpm = 780 + 25 * n(1.7) + speed * 32 + (speed > 0 ? 120 * n(0.3) : 0);
    const load = 16 + speed * 0.55 + 2 * n(2.1);
    const throttle = 11 + speed * 0.4 + n(1.3);
    const dist = Math.max(0, (this.now() - this.clearedAt) / 1000) * 0.012;
    return {
      0x04: load,
      0x05: 28 + 62 * warm + n(0.2),
      0x06: 2 * n(0.9) + (v.ltft > 4 ? 3 : 0),
      0x07: v.ltft,
      0x0b: 28 + load * 0.7,
      0x0c: rpm,
      0x0d: speed,
      0x0e: 12 + 8 * n(0.7),
      0x0f: 26 + 9 * warm,
      0x10: 2.2 + (rpm - 700) * 0.0065,
      0x11: throttle,
      0x1f: t,
      0x21: 112 + dist,
      0x2f: Math.max(5, 62 - t * 0.003),
      0x31: dist,
      0x33: 101,
      0x42: 14.05 + 0.15 * n(0.5),
      0x46: 21,
      0x49: throttle * 1.15,
      0x5c: 24 + 70 * warm,
    };
  }

  // ---- framing ---------------------------------------------------------------------------

  private fmt(bytes: number[]): string {
    return bytes.map(hex2).join(this.spaces ? ' ' : '');
  }

  private frame(ecu: string, payload: number[]): string[] {
    const v = this.vehicle;
    const sep = this.spaces ? ' ' : '';
    if (v.protocol === '6') {
      const head = this.headers ? ecu + sep : '';
      const pad = (arr: number[]) => {
        const a = [...arr];
        while (a.length < 8) a.push(v.pad);
        return a;
      };
      if (payload.length <= 7) {
        if (!this.headers) return [this.fmt(payload)];
        return [head + this.fmt(pad([payload.length, ...payload]))];
      }
      if (!this.headers) {
        // ATH0: ELM shows byte count, then numbered lines
        const lines = [payload.length.toString(16).toUpperCase().padStart(3, '0')];
        let n = 0;
        for (let i = 0; i < payload.length; i += 7) lines.push(`${n++}: ${this.fmt(payload.slice(i, i + 7))}`);
        return lines;
      }
      const lines: string[] = [];
      const len = payload.length;
      lines.push(head + this.fmt([0x10 | (len >> 8), len & 0xff, ...payload.slice(0, 6)]));
      let seq = 1;
      for (let i = 6; i < len; i += 7) {
        lines.push(head + this.fmt(pad([0x20 | (seq & 0x0f), ...payload.slice(i, i + 7)])));
        seq++;
      }
      return lines;
    }
    // K-line (ISO 9141-2 / KWP): format, target, source, data, checksum
    if (!this.headers) return [this.fmt(payload)];
    const src = parseInt(ecu, 16);
    const header = v.protocol === '3' ? [0x48, 0x6b, src] : [0x80 | payload.length, 0xf1, src];
    const msg = [...header, ...payload];
    const cs = msg.reduce((a, b) => (a + b) & 0xff, 0);
    return [this.fmt([...msg, cs])];
  }
}

