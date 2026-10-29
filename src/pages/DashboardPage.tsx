import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Cpu, FlaskConical, Lightbulb, Plug, RefreshCw, Search, Trash2, TriangleAlert } from 'lucide-react';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Button, Card, Spinner } from '../components/ui';
import { Gauge } from '../components/Gauge';
import { toDisplayUnit } from '../obd/pids';
import { ClearCodesDialog } from '../components/ClearCodesDialog';

const HEADLINE = [0x0c, 0x0d, 0x05, 0x04];

export function DashboardPage() {
  const dx = useDiagnostics();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const { status, setLive } = dx;
  const connected = status === 'connected';

  useEffect(() => {
    if (!connected) return;
    setLive(HEADLINE, true);
    return () => setLive([], false);
  }, [connected, setLive]);

  if (!connected || !dx.info) {
    return (
      <div className="stack">
        <div className="card hero stack" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 28 }}>Read, understand and clear your car&apos;s trouble codes</h1>
          <p className="muted" style={{ maxWidth: 680 }}>
            AutoScan talks to a USB ELM327 adapter through your browser (Chrome or Edge). It explains every code in plain language, works for 2002+ Korean, German and Japanese cars and keeps a local history.
          </p>
          <div className="actions">
            <Button variant="primary" onClick={() => navigate('/connect')} icon={<Plug size={16} />} disabled={status === 'connecting'}>Connect an adapter</Button>
            <Button onClick={() => navigate('/connect?sim=1')} icon={<FlaskConical size={16} />}>Try the simulator</Button>
            <Link className="btn" to="/lookup"><Search size={16} aria-hidden /> Look up a code</Link>
          </div>
        </div>
        <div className="grid cols-3">
          <Card><h2>1. Plug in</h2><p className="muted">Insert the adapter into the OBD2 port under the dashboard and turn the ignition ON.</p></Card>
          <Card><h2>2. Connect</h2><p className="muted">Pick the USB port in your browser. The protocol and VIN are detected automatically.</p></Card>
          <Card><h2>3. Understand</h2><p className="muted">Each code gets a plain-language explanation, causes, fixes and a can-I-drive answer.</p></Card>
        </div>
      </div>
    );
  }

  const { info, scan, vehicle, live } = dx;
  const imperial = dx.settings.imperial;
  const disp = (v: number | undefined, unit: string) => (v === undefined ? { value: undefined, unit } : toDisplayUnit(v, unit, imperial));
  const speed = disp(live.values[0x0d], 'km/h');
  const cool = disp(live.values[0x05], '°C');
  const total = scan ? scan.stored.length + scan.pending.length + scan.permanent.length : 0;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle connected'}</p>
        </div>
        <div className="actions">
          <Button onClick={() => void dx.refreshCodes()} disabled={dx.busy !== null} icon={dx.busy === 'codes' ? <Spinner size={16} /> : <RefreshCw size={16} />}>Read codes</Button>
        </div>
      </div>

      <div className="grid cols-3">
        <Card>
          <div className={`mil ${scan?.mil ? 'on' : ''}`}>
            <div className="mil-icon" aria-hidden><Lightbulb size={28} /></div>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>Check-engine light (MIL)</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{scan?.mil ? 'ON' : 'OFF'}</div>
              <div className="muted" style={{ fontSize: 13 }}>ECU reports {scan?.reportedCount ?? 0} stored code{scan?.reportedCount === 1 ? '' : 's'}</div>
            </div>
          </div>
        </Card>
        <Card>
          <h3>Codes found</h3>
          <div className="grid cols-3" style={{ gap: 8 }}>
            <Link to="/codes" className="stat" style={{ color: 'inherit', textDecoration: 'none' }}><span className="num" data-testid="count-stored">{scan?.stored.length ?? 0}</span><span className="lbl">Stored</span></Link>
            <Link to="/codes" className="stat" style={{ color: 'inherit', textDecoration: 'none' }}><span className="num" data-testid="count-pending">{scan?.pending.length ?? 0}</span><span className="lbl">Pending</span></Link>
            <Link to="/codes" className="stat" style={{ color: 'inherit', textDecoration: 'none' }}><span className="num" data-testid="count-permanent">{scan?.permanent.length ?? 0}</span><span className="lbl">Permanent</span></Link>
          </div>
        </Card>
        <Card>
          <h3>Vehicle</h3>
          <dl className="kv">
            <dt>VIN</dt><dd className="mono">{info.vin ?? 'Not reported'}</dd>
            <dt>Protocol</dt><dd>{info.protocol.name}</dd>
            <dt>Adapter</dt><dd>{info.adapter}{info.transport === 'simulator' ? ' (simulated)' : ''}</dd>
            <dt>Battery</dt><dd>{dx.voltage ?? 'n/a'}</dd>
          </dl>
        </Card>
      </div>

      <div className="grid cols-4 gauges">
        <Card><Gauge label="Engine speed" value={live.values[0x0c]} min={0} max={7000} unit="rpm" warnAt={0.8} dangerAt={0.92} /></Card>
        <Card><Gauge label="Vehicle speed" value={speed.value} min={0} max={imperial ? 150 : 240} unit={speed.unit} /></Card>
        <Card><Gauge label="Coolant temperature" value={cool.value} min={imperial ? -40 : -40} max={imperial ? 266 : 130} unit={cool.unit} warnAt={0.8} dangerAt={0.9} decimals={0} /></Card>
        <Card><Gauge label="Engine load" value={live.values[0x04]} min={0} max={100} unit="%" decimals={0} warnAt={0.85} dangerAt={0.97} /></Card>
      </div>

      <Card>
        <h2>Quick actions</h2>
        <div className="actions">
          <Link className="btn" to="/codes"><TriangleAlert size={16} aria-hidden /> View codes{total ? ` (${total})` : ''}</Link>
          <Link className="btn" to="/modules"><Cpu size={16} aria-hidden /> Scan modules</Link>
          <Link className="btn" to="/live"><Activity size={16} aria-hidden /> Live data</Link>
          <Link className="btn" to="/lookup"><Search size={16} aria-hidden /> Code lookup</Link>
          <Button variant="danger" onClick={() => setConfirm(true)} disabled={dx.busy !== null || total === 0} icon={<Trash2 size={16} />}>Clear codes</Button>
        </div>
      </Card>
      <ClearCodesDialog open={confirm} busy={dx.busy === 'clear'} onCancel={() => setConfirm(false)} onConfirm={() => void dx.clearCodes().then((ok) => ok && setConfirm(false))} />
    </div>
  );
}
