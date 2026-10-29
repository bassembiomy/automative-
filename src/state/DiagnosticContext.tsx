import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { DiagnosticService } from '../obd/service';
import { SerialTransport } from '../obd/transport/SerialTransport';
import { SimulatorTransport } from '../obd/transport/SimulatorTransport';
import { findSimVehicle } from '../obd/transport/simulatorVehicles';
import type { Transport } from '../obd/transport/Transport';
import type { LogDirection } from '../obd/elm327';
import type { ModuleDef } from '../obd/modules';
import { decodeVin } from '../obd/vin';
import type { ConnectionInfo, ConnectStep, ConnectStepId, ModuleResult, ScanResult, StepState } from '../obd/types';
import type { Region } from '../data/makes';
import { findMake } from '../data/makes';
import { applyTheme, DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './settings';
import { clearStoredHistory, entryFromScan, loadHistory, persistHistory, type HistoryEntry, type HistoryVehicle } from './history';
import { readJson, writeJson } from './storage';

export type ConnStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Busy = 'codes' | 'clear' | 'modules' | 'clear-module' | null;

export interface VehicleSelection {
  region: Region;
  make?: string;
  year?: number;
  model?: string;
  autoDetect: boolean;
}

export interface LogEntry {
  id: number;
  dir: LogDirection;
  text: string;
  time: number;
}

export interface Notice {
  kind: 'ok' | 'err';
  text: string;
}

export interface LiveState {
  running: boolean;
  pids: number[];
  values: Record<number, number>;
  series: Record<number, number[]>;
}

export interface DiagnosticState {
  status: ConnStatus;
  steps: ConnectStep[];
  error?: string;
  info: ConnectionInfo | null;
  vehicle: VehicleSelection;
  scan: ScanResult | null;
  modules: ModuleResult[] | null;
  moduleProgress: { done: number; total: number; current?: string } | null;
  busy: Busy;
  live: LiveState;
  log: LogEntry[];
  settings: Settings;
  history: HistoryEntry[];
  notice: Notice | null;
  voltage?: string;
}

export interface DiagnosticApi extends DiagnosticState {
  connect: (kind: 'serial' | 'simulator', simId?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshCodes: () => Promise<void>;
  clearCodes: () => Promise<boolean>;
  scanModules: () => Promise<void>;
  clearModule: (m: ModuleDef) => Promise<boolean>;
  setVehicle: (v: Partial<VehicleSelection>) => void;
  setLive: (pids: number[], running: boolean) => void;
  updateSettings: (s: Partial<Settings>) => void;
  sendRaw: (cmd: string) => Promise<void>;
  clearLog: () => void;
  saveScan: () => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
  dismissNotice: () => void;
}

const STEP_LABELS: Record<ConnectStepId, string> = {
  open: 'Open port',
  reset: 'Reset adapter',
  protocol: 'Detect protocol',
  vin: 'Read VIN',
};
const freshSteps = (): ConnectStep[] =>
  (['open', 'reset', 'protocol', 'vin'] as ConnectStepId[]).map((id) => ({ id, label: STEP_LABELS[id], state: 'pending' as StepState }));

type Action =
  | { t: 'connecting' }
  | { t: 'step'; id: ConnectStepId; state: StepState; detail?: string }
  | { t: 'connected'; info: ConnectionInfo }
  | { t: 'connect-failed'; error: string }
  | { t: 'disconnected' }
  | { t: 'scan'; scan: ScanResult }
  | { t: 'busy'; busy: Busy }
  | { t: 'modules'; modules: ModuleResult[] | null }
  | { t: 'module-progress'; p: DiagnosticState['moduleProgress'] }
  | { t: 'vehicle'; v: Partial<VehicleSelection> }
  | { t: 'live-config'; pids: number[]; running: boolean }
  | { t: 'live-values'; values: Record<number, number> }
  | { t: 'log'; entries: LogEntry[] }
  | { t: 'clear-log' }
  | { t: 'settings'; s: Settings }
  | { t: 'history'; list: HistoryEntry[] }
  | { t: 'notice'; n: Notice | null }
  | { t: 'voltage'; v?: string };

const SERIES_LEN = 60;

function reducer(state: DiagnosticState, a: Action): DiagnosticState {
  switch (a.t) {
    case 'connecting':
      return { ...state, status: 'connecting', steps: freshSteps(), error: undefined, scan: null, modules: null };
    case 'step':
      return { ...state, steps: state.steps.map((s) => (s.id === a.id ? { ...s, state: a.state, detail: a.detail } : s)) };
    case 'connected':
      return { ...state, status: 'connected', info: a.info, voltage: a.info.voltage, error: undefined };
    case 'connect-failed':
      return { ...state, status: 'error', error: a.error, info: null };
    case 'disconnected':
      return { ...state, status: 'disconnected', info: null, scan: null, modules: null, busy: null, moduleProgress: null, live: { ...state.live, running: false, values: {}, series: {} } };
    case 'scan':
      return { ...state, scan: a.scan };
    case 'busy':
      return { ...state, busy: a.busy };
    case 'modules':
      return { ...state, modules: a.modules };
    case 'module-progress':
      return { ...state, moduleProgress: a.p };
    case 'vehicle':
      return { ...state, vehicle: { ...state.vehicle, ...a.v } };
    case 'live-config':
      return { ...state, live: { ...state.live, pids: a.pids, running: a.running } };
    case 'live-values': {
      const series = { ...state.live.series };
      for (const [k, v] of Object.entries(a.values)) {
        const pid = Number(k);
        series[pid] = [...(series[pid] ?? []), v].slice(-SERIES_LEN);
      }
      return { ...state, live: { ...state.live, values: { ...state.live.values, ...a.values }, series } };
    }
    case 'log':
      return { ...state, log: [...state.log, ...a.entries].slice(-400) };
    case 'clear-log':
      return { ...state, log: [] };
    case 'settings':
      return { ...state, settings: a.s };
    case 'history':
      return { ...state, history: a.list };
    case 'notice':
      return { ...state, notice: a.n };
    case 'voltage':
      return { ...state, voltage: a.v };
    default:
      return state;
  }
}

const VEHICLE_KEY = 'autoscan.vehicle.v1';

export function initialState(overrides: Partial<DiagnosticState> = {}): DiagnosticState {
  const settings = typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings();
  const vehicle = readJson<VehicleSelection>(VEHICLE_KEY, { region: 'Korean', autoDetect: true });
  return {
    status: 'disconnected',
    steps: freshSteps(),
    info: null,
    vehicle,
    scan: null,
    modules: null,
    moduleProgress: null,
    busy: null,
    live: { running: false, pids: [], values: {}, series: {} },
    log: [],
    settings,
    history: typeof window === 'undefined' ? [] : loadHistory(),
    notice: null,
    ...overrides,
  };
}

export const DiagnosticContext = createContext<DiagnosticApi | null>(null);

export function useDiagnostics(): DiagnosticApi {
  const ctx = useContext(DiagnosticContext);
  if (!ctx) throw new Error('useDiagnostics must be used inside <DiagnosticProvider>');
  return ctx;
}

interface ProviderProps {
  children: ReactNode;
  /** Test hook: artificial simulator latency in ms. */
  simLatency?: [number, number];
}

export function DiagnosticProvider({ children, simLatency }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const serviceRef = useRef<DiagnosticService | null>(null);
  const stateRef = useRef(state);
  const logSeq = useRef(0);
  const logBuf = useRef<LogEntry[]>([]);
  const logTimer = useRef<number | null>(null);
  const livePids = useRef<number[]>([]);
  const disconnectRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    applyTheme(state.settings.theme);
  }, [state.settings.theme]);

  useEffect(() => {
    if (!state.notice) return;
    const t = window.setTimeout(() => dispatch({ t: 'notice', n: null }), 7000);
    return () => window.clearTimeout(t);
  }, [state.notice]);

  const pushLog = useCallback((dir: LogDirection, text: string) => {
    logBuf.current.push({ id: ++logSeq.current, dir, text, time: Date.now() });
    if (logTimer.current === null) {
      logTimer.current = window.setTimeout(() => {
        logTimer.current = null;
        const entries = logBuf.current;
        logBuf.current = [];
        dispatch({ t: 'log', entries });
      }, 150);
    }
  }, []);

  const fail = useCallback((e: unknown, prefix: string) => {
    const msg = e instanceof Error ? e.message : String(e);
    dispatch({ t: 'notice', n: { kind: 'err', text: `${prefix}: ${msg}` } });
  }, []);

  const refreshCodesInner = useCallback(
    async (save: boolean): Promise<ScanResult | null> => {
      const svc = serviceRef.current;
      if (!svc) return null;
      dispatch({ t: 'busy', busy: 'codes' });
      try {
        const scan = await svc.readAllCodes();
        dispatch({ t: 'scan', scan });
        const cur = stateRef.current;
        if (save && cur.settings.autoSave) {
          const v = cur.vehicle;
          const hv: HistoryVehicle = { make: v.make, year: v.year, model: v.model, vin: svc.info?.vin };
          const list = [entryFromScan(scan, hv, svc.info?.protocol.name ?? ''), ...cur.history];
          persistHistory(list);
          dispatch({ t: 'history', list });
        }
        return scan;
      } catch (e) {
        fail(e, 'Could not read codes');
        return null;
      } finally {
        dispatch({ t: 'busy', busy: null });
      }
    },
    [fail],
  );

  const connect = useCallback(
    async (kind: 'serial' | 'simulator', simId?: string): Promise<boolean> => {
      const cur = stateRef.current;
      if (cur.status === 'connecting') return false;
      let transport: Transport;
      if (kind === 'simulator') {
        transport = new SimulatorTransport(simId ?? 'elantra-2015', simLatency ? { latencyMs: simLatency } : undefined);
      } else {
        transport = new SerialTransport(cur.settings.baud);
      }
      const svc = new DiagnosticService(transport, {
        onLog: pushLog,
        timeoutMs: cur.settings.timeoutMs,
        resetDelayMs: kind === 'simulator' ? 0 : 500,
      });
      dispatch({ t: 'connecting' });
      try {
        const info = await svc.connect((id, st, detail) => dispatch({ t: 'step', id, state: st, detail }));
        serviceRef.current = svc;
        if (kind === 'simulator') {
          const sim = findSimVehicle(simId ?? 'elantra-2015');
          const region = findMake(sim.make)?.region ?? 'Korean';
          dispatch({ t: 'vehicle', v: { region, make: sim.make, year: sim.year, model: sim.model } });
        } else if (info.vin && stateRef.current.vehicle.autoDetect) {
          const d = decodeVin(info.vin);
          if (d.make) dispatch({ t: 'vehicle', v: { make: d.make, region: d.region, year: d.year } });
        }
        dispatch({ t: 'connected', info });
        stateRef.current = { ...stateRef.current, status: 'connected', info };
        await refreshCodesInner(true);
        return true;
      } catch (e) {
        dispatch({ t: 'connect-failed', error: e instanceof Error ? e.message : String(e) });
        return false;
      }
    },
    [pushLog, refreshCodesInner, simLatency],
  );

  const disconnect = useCallback(async () => {
    const svc = serviceRef.current;
    serviceRef.current = null;
    dispatch({ t: 'disconnected' });
    try {
      await svc?.disconnect();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  const clearCodes = useCallback(async (): Promise<boolean> => {
    const svc = serviceRef.current;
    if (!svc) return false;
    dispatch({ t: 'busy', busy: 'clear' });
    try {
      await svc.clearCodes();
      dispatch({ t: 'notice', n: { kind: 'ok', text: 'Codes cleared. Drive the car so the readiness monitors can complete; the codes return if the fault is still present.' } });
      dispatch({ t: 'busy', busy: null });
      await refreshCodesInner(false);
      return true;
    } catch (e) {
      fail(e, 'Could not clear codes');
      dispatch({ t: 'busy', busy: null });
      return false;
    }
  }, [fail, refreshCodesInner]);

  const scanModules = useCallback(async () => {
    const svc = serviceRef.current;
    if (!svc) return;
    dispatch({ t: 'busy', busy: 'modules' });
    dispatch({ t: 'modules', modules: null });
    try {
      const results = await svc.scanModules(stateRef.current.vehicle.make, (done, total, m) =>
        dispatch({ t: 'module-progress', p: { done, total, current: m.name } }),
      );
      dispatch({ t: 'modules', modules: results });
    } catch (e) {
      fail(e, 'Module scan failed');
    } finally {
      dispatch({ t: 'module-progress', p: null });
      dispatch({ t: 'busy', busy: null });
    }
  }, [fail]);

  const clearModule = useCallback(
    async (m: ModuleDef): Promise<boolean> => {
      const svc = serviceRef.current;
      if (!svc) return false;
      dispatch({ t: 'busy', busy: 'clear-module' });
      try {
        const res = await svc.clearModule(m);
        if (res.ok) {
          dispatch({ t: 'notice', n: { kind: 'ok', text: `${m.name}: codes cleared.` } });
          const updated = await svc.scanModules(stateRef.current.vehicle.make);
          dispatch({ t: 'modules', modules: updated });
        } else {
          dispatch({ t: 'notice', n: { kind: 'err', text: `${m.name}: ${res.reason ?? 'could not clear codes'}` } });
        }
        return res.ok;
      } catch (e) {
        fail(e, 'Could not clear module');
        return false;
      } finally {
        dispatch({ t: 'busy', busy: null });
      }
    },
    [fail],
  );

  const setVehicle = useCallback((v: Partial<VehicleSelection>) => {
    dispatch({ t: 'vehicle', v });
    writeJson(VEHICLE_KEY, { ...stateRef.current.vehicle, ...v });
  }, []);

  const setLive = useCallback((pids: number[], running: boolean) => {
    livePids.current = pids;
    dispatch({ t: 'live-config', pids, running });
  }, []);

  // live data polling loop
  const liveRunning = state.live.running && state.status === 'connected';
  useEffect(() => {
    if (!liveRunning) return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        const svc = serviceRef.current;
        if (!svc) break;
        const pids = livePids.current;
        if (pids.length) {
          try {
            const values = await svc.readLive(pids);
            if (cancelled) break;
            if (values.size) dispatch({ t: 'live-values', values: Object.fromEntries(values) });
          } catch {
            // transient adapter errors: keep polling, unless the port went away (unplugged)
            if (!svc.transport.isOpen && !cancelled) {
              dispatch({ t: 'notice', n: { kind: 'err', text: 'The adapter connection was lost. Check the USB cable and reconnect.' } });
              void disconnectRef.current();
              break;
            }
          }
        }
        await new Promise((r) => setTimeout(r, Math.max(50, stateRef.current.settings.pollMs)));
      }
    };
    void loop();
    return () => {
      cancelled = true;
    };
  }, [liveRunning]);

  // battery voltage refresh while connected
  useEffect(() => {
    if (state.status !== 'connected') return;
    const id = window.setInterval(() => {
      const svc = serviceRef.current;
      if (!svc || stateRef.current.busy) return;
      svc.readBattery().then((v) => v && dispatch({ t: 'voltage', v })).catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(id);
  }, [state.status]);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    const next = { ...stateRef.current.settings, ...s };
    saveSettings(next);
    dispatch({ t: 'settings', s: next });
  }, []);

  const sendRaw = useCallback(
    async (cmd: string) => {
      const svc = serviceRef.current;
      if (!svc || !cmd.trim()) return;
      try {
        await svc.elm.sendLenient(cmd.trim().toUpperCase(), 8000);
      } catch (e) {
        pushLog('error', e instanceof Error ? e.message : String(e));
      }
    },
    [pushLog],
  );

  const saveScan = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.scan) return;
    const v = cur.vehicle;
    const entry = entryFromScan(cur.scan, { make: v.make, year: v.year, model: v.model, vin: cur.info?.vin }, cur.info?.protocol.name ?? '');
    const list = [{ ...entry, id: `${entry.id}-m` }, ...cur.history];
    persistHistory(list);
    dispatch({ t: 'history', list });
    dispatch({ t: 'notice', n: { kind: 'ok', text: 'Scan saved to history.' } });
  }, []);

  const deleteHistory = useCallback((id: string) => {
    const list = stateRef.current.history.filter((h) => h.id !== id);
    persistHistory(list);
    dispatch({ t: 'history', list });
  }, []);

  const clearHistory = useCallback(() => {
    clearStoredHistory();
    dispatch({ t: 'history', list: [] });
  }, []);

  const api = useMemo<DiagnosticApi>(
    () => ({
      ...state,
      connect,
      disconnect,
      refreshCodes: async () => {
        await refreshCodesInner(true);
      },
      clearCodes,
      scanModules,
      clearModule,
      setVehicle,
      setLive,
      updateSettings,
      sendRaw,
      clearLog: () => dispatch({ t: 'clear-log' }),
      saveScan,
      deleteHistory,
      clearHistory,
      dismissNotice: () => dispatch({ t: 'notice', n: null }),
    }),
    [state, connect, disconnect, refreshCodesInner, clearCodes, scanModules, clearModule, setVehicle, setLive, updateSettings, sendRaw, saveScan, deleteHistory, clearHistory],
  );

  return <DiagnosticContext.Provider value={api}>{children}</DiagnosticContext.Provider>;
}
