import { Elm327, ElmError, type LogFn } from './elm327';
import type { Transport } from './transport/Transport';
import { parseDtcResponses, parseMonitorStatus } from './dtc';
import { decodePid, parseSupportedPids, pidHex, PID_MAP } from './pids';
import { parseVinResponses } from './vin';
import { FREEZE_PIDS, parseFreezeValue, type FreezeFrame } from './freezeFrame';
import { candidateModules, type ModuleDef } from './modules';
import { parseUdsClear, parseUdsReadDtc as parseUdsRead, UDS_CLEAR_DTC_REQUEST, UDS_READ_DTC_REQUEST } from './uds';
import type { ConnectionInfo, ConnectStepId, DtcRecord, ModuleResult, ScanResult, StepState } from './types';
import { isCanProtocol } from './protocols';

export type ProgressFn = (id: ConnectStepId, state: StepState, detail?: string) => void;

export interface ServiceOptions {
  onLog?: LogFn;
  resetDelayMs?: number;
  timeoutMs?: number;
}

/** High level diagnostic operations built on the ELM327 driver. */
export class DiagnosticService {
  readonly elm: Elm327;
  info: ConnectionInfo | null = null;
  /** While true (module scan / clear changes the CAN header), live polling is suspended. */
  paused = false;

  constructor(readonly transport: Transport, opts: ServiceOptions = {}) {
    this.elm = new Elm327(transport, { onLog: opts.onLog, resetDelayMs: opts.resetDelayMs, defaultTimeoutMs: opts.timeoutMs });
  }

  get isCan(): boolean {
    return isCanProtocol(this.info?.protocol);
  }

  async connect(progress: ProgressFn = () => {}): Promise<ConnectionInfo> {
    progress('open', 'running');
    try {
      await this.transport.open();
      progress('open', 'ok');
    } catch (e) {
      progress('open', 'fail', e instanceof Error ? e.message : 'Could not open the port');
      throw e;
    }

    progress('reset', 'running');
    let banner: string;
    try {
      banner = await this.elm.resetAdapter();
      await this.elm.configure();
      progress('reset', 'ok', banner);
    } catch (e) {
      progress('reset', 'fail', e instanceof Error ? e.message : 'Adapter did not answer');
      await this.transport.close().catch(() => undefined);
      throw e;
    }

    progress('protocol', 'running', 'Searching for the vehicle protocol (can take 10 s)');
    let protocol;
    try {
      protocol = await this.elm.detectProtocol();
      progress('protocol', 'ok', protocol.name);
    } catch (e) {
      const msg = e instanceof ElmError && e.kind === 'UNABLE_TO_CONNECT'
        ? 'Unable to connect to the vehicle. Turn the ignition ON and check the adapter is plugged into the OBD port.'
        : e instanceof Error ? e.message : 'Protocol detection failed';
      progress('protocol', 'fail', msg);
      await this.transport.close().catch(() => undefined);
      throw e;
    }

    const voltage = await this.elm.readVoltage();
    const version = (await this.elm.readVersion()) ?? banner;
    const supportedPids = await this.readSupportedPids();

    progress('vin', 'running');
    let vin: string | undefined;
    try {
      vin = await this.readVin();
      progress('vin', vin ? 'ok' : 'skipped', vin ?? 'Vehicle did not report a VIN');
    } catch {
      progress('vin', 'skipped', 'Vehicle did not report a VIN');
    }

    this.info = { adapter: version, voltage, protocol, supportedPids, vin, transport: this.transport.kind };
    return this.info;
  }

  async disconnect(): Promise<void> {
    this.info = null;
    await this.transport.close();
  }

  async readSupportedPids(): Promise<number[]> {
    const all: number[] = [];
    for (const base of [0x00, 0x20, 0x40, 0x60]) {
      const res = await this.elm.requestOrEmpty(`01${pidHex(base)}`, 5000);
      const r = res.find((x) => x.data[0] === 0x41 && x.data[1] === base);
      if (!r) break;
      const pids = parseSupportedPids(base, r.data.slice(2, 6));
      all.push(...pids);
      if (!pids.includes(base + 0x20)) break;
    }
    return all.filter((p) => p % 0x20 !== 0);
  }

  async readVin(): Promise<string | undefined> {
    const res = await this.elm.requestOrEmpty('0902', 8000);
    return parseVinResponses(res);
  }

  async readBattery(): Promise<string | undefined> {
    return this.elm.readVoltage();
  }

  async readStatus(): Promise<{ mil: boolean; count: number }> {
    const res = await this.elm.requestOrEmpty('0101');
    for (const r of res) {
      const s = parseMonitorStatus(r.data);
      if (s) return s;
    }
    return { mil: false, count: 0 };
  }

  private async readCodeList(hex: string, sid: 0x43 | 0x47 | 0x4a, kind: DtcRecord['kind']): Promise<DtcRecord[]> {
    try {
      const res = await this.elm.requestOrEmpty(hex, 6000);
      return parseDtcResponses(res, sid, { can: this.isCan }).map((d) => ({ ...d, kind }));
    } catch (e) {
      if (e instanceof ElmError && (e.kind === 'UNKNOWN_COMMAND' || e.kind === 'DATA_ERROR')) return [];
      throw e;
    }
  }

  async readAllCodes(): Promise<ScanResult> {
    const status = await this.readStatus();
    const stored = await this.readCodeList('03', 0x43, 'stored');
    const pending = await this.readCodeList('07', 0x47, 'pending');
    const permanent = await this.readCodeList('0A', 0x4a, 'permanent');
    let freezeFrame: FreezeFrame | undefined;
    if (stored.length > 0 || status.count > 0) {
      try {
        freezeFrame = await this.readFreezeFrame();
      } catch {
        freezeFrame = undefined;
      }
    }
    return { timestamp: Date.now(), stored, pending, permanent, mil: status.mil, reportedCount: status.count, freezeFrame };
  }

  async readFreezeFrame(): Promise<FreezeFrame | undefined> {
    const frame: FreezeFrame = { values: [] };
    const dtcRes = await this.elm.requestOrEmpty('020200');
    const first = dtcRes.find((r) => r.data[0] === 0x42 && r.data[1] === 0x02);
    if (!first) return undefined;
    const found = parseDtcResponses([{ ecu: first.ecu, data: [0x43, 0, ...first.data.slice(3, 5)] }], 0x43, { can: true });
    frame.dtc = found[0]?.code;
    for (const pid of FREEZE_PIDS) {
      if (this.info && this.info.supportedPids.length && !this.info.supportedPids.includes(pid)) continue;
      const res = await this.elm.requestOrEmpty(`02${pidHex(pid)}00`);
      const r = res.find((x) => x.data[0] === 0x42 && x.data[1] === pid);
      const val = r ? parseFreezeValue(r.data) : undefined;
      if (val) frame.values.push(val);
    }
    return frame.dtc || frame.values.length ? frame : undefined;
  }

  /** Mode 04. Throws if the ECU does not confirm. */
  async clearCodes(): Promise<void> {
    const res = await this.elm.request('04', 8000);
    if (!res.some((r) => r.data[0] === 0x44)) throw new Error('The vehicle did not confirm that codes were cleared.');
  }

  async readLive(pids: number[]): Promise<Map<number, number>> {
    const out = new Map<number, number>();
    for (const pid of pids) {
      if (this.paused) break;
      if (!PID_MAP.has(pid)) continue;
      const res = await this.elm.requestOrEmpty(`01${pidHex(pid)}`, 2500);
      const r = res.find((x) => x.data[0] === 0x41 && x.data[1] === pid);
      if (!r) continue;
      const v = decodePid(pid, r.data.slice(2));
      if (v !== undefined) out.set(pid, v);
    }
    return out;
  }

  // ---- UDS module scan (CAN only) --------------------------------------------------------

  private async selectModule(m: ModuleDef): Promise<void> {
    await this.elm.send(`ATSH ${m.tx}`);
    await this.elm.send(`ATCRA ${m.rx}`);
  }

  private async restoreHeaders(): Promise<void> {
    try {
      await this.elm.send('ATSH 7DF');
      await this.elm.send('ATAR');
    } catch {
      /* best effort */
    }
  }

  async scanModules(make: string | undefined, onProgress?: (done: number, total: number, current: ModuleDef) => void): Promise<ModuleResult[]> {
    if (!this.isCan) throw new Error('Module scan needs a CAN (ISO 15765-4) connection.');
    const candidates = candidateModules(make);
    const results: ModuleResult[] = [];
    this.paused = true;
    try {
      for (let i = 0; i < candidates.length; i++) {
        const module = candidates[i];
        onProgress?.(i, candidates.length, module);
        try {
          await this.selectModule(module);
          const res = await this.elm.request(UDS_READ_DTC_REQUEST, 2500);
          const reply = res.find((r) => r.data[0] === 0x59 || r.data[0] === 0x7f);
          if (!reply) {
            results.push({ module, status: 'no-response', dtcs: [] });
            continue;
          }
          const parsed = parseUdsRead(reply.data);
          if (parsed.ok) results.push({ module, status: 'ok', dtcs: parsed.dtcs });
          else results.push({ module, status: 'error', message: parsed.reason, dtcs: [] });
        } catch (e) {
          if (e instanceof ElmError && (e.kind === 'NO_DATA' || e.kind === 'TIMEOUT' || e.kind === 'CAN_ERROR' || e.kind === 'BUS_BUSY')) {
            results.push({ module, status: 'no-response', dtcs: [] });
          } else {
            throw e;
          }
        }
      }
      onProgress?.(candidates.length, candidates.length, candidates[candidates.length - 1]);
    } finally {
      await this.restoreHeaders();
      this.paused = false;
    }
    return results;
  }

  async clearModule(module: ModuleDef): Promise<{ ok: boolean; reason?: string }> {
    if (!this.isCan) throw new Error('Module clear needs a CAN connection.');
    this.paused = true;
    try {
      await this.selectModule(module);
      const res = await this.elm.request(UDS_CLEAR_DTC_REQUEST, 5000);
      const reply = res.find((r) => r.data[0] === 0x54 || r.data[0] === 0x7f);
      return reply ? parseUdsClear(reply.data) : { ok: false, reason: 'No response' };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Failed' };
    } finally {
      await this.restoreHeaders();
      this.paused = false;
    }
  }
}
