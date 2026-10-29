import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Pause, Play, Plug } from 'lucide-react';
import { PIDS, PID_MAP, toDisplayUnit } from '../obd/pids';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Button, Card, EmptyState } from '../components/ui';
import { Gauge, Sparkline } from '../components/Gauge';
import { readJson, writeJson } from '../state/storage';

const SEL_KEY = 'autoscan.livepids.v1';
const DEFAULT_SEL = [0x0c, 0x0d, 0x05, 0x04, 0x11, 0x0b];

export function LiveDataPage() {
  const dx = useDiagnostics();
  const { status, info, setLive, live, settings } = dx;
  const [selected, setSelected] = useState<number[]>(() => readJson<number[]>(SEL_KEY, DEFAULT_SEL));
  const [running, setRunning] = useState(true);
  const connected = status === 'connected';
  const supported = info?.supportedPids ?? [];
  const offered = PIDS.filter((p) => supported.length === 0 || supported.includes(p.pid));
  const active = selected.filter((p) => offered.some((o) => o.pid === p));

  useEffect(() => {
    if (!connected) return;
    setLive(active, running);
    return () => setLive([], false);
    // active is derived from selected + offered; join keeps the dependency stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, running, active.join(','), setLive]);

  if (!connected) {
    return (
      <div className="stack">
        <div className="page-head"><h1>Live data</h1></div>
        <EmptyState icon={<Plug size={28} />} title="Not connected" action={<Link className="btn primary" to="/connect">Connect an adapter</Link>}>
          Live sensor values (rpm, speed, temperatures, fuel trims…) are shown as gauges once an adapter or the simulator is connected.
        </EmptyState>
      </div>
    );
  }

  const toggle = (pid: number) => {
    const next = selected.includes(pid) ? selected.filter((p) => p !== pid) : [...selected, pid];
    setSelected(next);
    writeJson(SEL_KEY, next);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Live data</h1>
          <p>{offered.length} PIDs supported by this vehicle. Polling every {settings.pollMs} ms plus adapter latency.</p>
        </div>
        <Button onClick={() => setRunning((r) => !r)} variant={running ? 'default' : 'primary'} icon={running ? <Pause size={16} /> : <Play size={16} />}>
          {running ? 'Pause' : 'Resume'}
        </Button>
      </div>

      <Card>
        <h3>Choose sensors</h3>
        <div className="chips" role="group" aria-label="Sensors">
          {offered.map((p) => (
            <button key={p.pid} type="button" className="chip" aria-pressed={selected.includes(p.pid)} onClick={() => toggle(p.pid)}>
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      {active.length === 0 ? (
        <EmptyState icon={<Activity size={28} />} title="No sensors selected">Select one or more sensors above.</EmptyState>
      ) : (
        <div className="grid auto gauges" aria-live="off">
          {active.map((pid) => {
            const def = PID_MAP.get(pid);
            if (!def) return null;
            const raw = live.values[pid];
            const conv = raw === undefined ? undefined : toDisplayUnit(raw, def.unit, settings.imperial);
            const lo = toDisplayUnit(def.min, def.unit, settings.imperial).value;
            const hi = toDisplayUnit(def.max, def.unit, settings.imperial).value;
            const range = def.pid === 0x0c ? { min: 0, max: 7000 } : def.pid === 0x0d ? { min: 0, max: settings.imperial ? 150 : 240 } : { min: Math.min(lo, hi), max: Math.max(lo, hi) };
            return (
              <Card key={pid}>
                <Gauge label={def.name} value={conv?.value} min={Math.round(range.min)} max={Math.round(range.max)} unit={conv?.unit ?? def.unit} decimals={def.scale < 1 ? 1 : 0} />
                <Sparkline data={(live.series[pid] ?? []).map((v) => toDisplayUnit(v, def.unit, settings.imperial).value)} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
