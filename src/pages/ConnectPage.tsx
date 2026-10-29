import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleAlert, CircleCheck, CircleX, FlaskConical, Minus, Plug, Usb } from 'lucide-react';
import { isWebSerialSupported } from '../obd/transport/SerialTransport';
import { BAUD_RATES } from '../obd/transport/Transport';
import { SIM_VEHICLES } from '../obd/transport/simulatorVehicles';
import { MAKES, REGIONS, makesByRegion, modelYears, type Region } from '../data/makes';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Button, Card, Notice, Spinner } from '../components/ui';

type Adapter = 'serial' | 'simulator';

export function ConnectPage() {
  const dx = useDiagnostics();
  const navigate = useNavigate();
  const serialOk = isWebSerialSupported();
  const [params] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adapter, setAdapter] = useState<Adapter>(serialOk && !params.get('sim') ? 'serial' : 'simulator');
  const [simId, setSimId] = useState(SIM_VEHICLES[0].id);
  const years = modelYears();
  const { vehicle } = dx;
  const connecting = dx.status === 'connecting';
  const connected = dx.status === 'connected';

  const go = async () => {
    setStep(3);
    await dx.connect(adapter, simId);
  };

  const quickSim = async () => {
    setAdapter('simulator');
    setStep(3);
    await dx.connect('simulator', simId);
  };

  const stepTitles = ['Adapter', 'Vehicle', 'Connect'];
  const stepDone = (n: number) => n < step || (n === 3 && connected);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Connect</h1>
          <p>Plug the adapter into the OBD2 port, switch the ignition ON, then follow the three steps.</p>
        </div>
        <Button variant="primary" onClick={() => void quickSim()} disabled={connecting || connected} icon={<FlaskConical size={16} />}>
          Try the simulator
        </Button>
      </div>

      <div className="stepper" role="tablist" aria-label="Connection steps">
        {stepTitles.map((t, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={step === n}
              className={`step-tab ${step === n ? 'active' : ''} ${stepDone(n) ? 'done' : ''}`}
              onClick={() => !connecting && setStep(n)}
            >
              <span className="n">{stepDone(n) && step !== n ? <Check size={14} aria-hidden /> : n}</span>
              <span className="t">{t}</span>
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <Card>
          <h2>1. Choose an adapter</h2>
          {!serialOk && (
            <div style={{ marginBottom: 16 }}>
              <Notice kind="warn">
                <strong>Web Serial is not available in this browser.</strong> USB adapters need Chrome or Edge on a desktop computer (Windows, macOS, Linux or ChromeOS).
                You can still use the <strong>Simulator</strong> and the offline <strong>Code Lookup</strong>.
              </Notice>
            </div>
          )}
          <div className="grid cols-2">
            <button type="button" className="option" aria-pressed={adapter === 'serial'} disabled={!serialOk} onClick={() => setAdapter('serial')}>
              <span className="ico"><Usb size={22} aria-hidden /></span>
              <span>
                <strong>USB ELM327 adapter</strong>
                <span className="muted" style={{ display: 'block' }}>
                  OBDLink SX/EX, vLinker FS, FTDI or CH340 clones. {serialOk ? 'Browser supported.' : 'Browser not supported.'}
                </span>
              </span>
            </button>
            <button type="button" className="option" aria-pressed={adapter === 'simulator'} onClick={() => setAdapter('simulator')}>
              <span className="ico"><FlaskConical size={22} aria-hidden /></span>
              <span>
                <strong>Simulator</strong>
                <span className="muted" style={{ display: 'block' }}>No hardware needed. A virtual ELM327 and car with real protocol framing.</span>
              </span>
            </button>
          </div>

          {adapter === 'serial' && serialOk && (
            <div className="field" style={{ marginTop: 16, maxWidth: 280 }}>
              <label htmlFor="baud">Baud rate</label>
              <select id="baud" className="select" value={dx.settings.baud} onChange={(e) => dx.updateSettings({ baud: Number(e.target.value) })}>
                {BAUD_RATES.map((b) => (
                  <option key={b} value={b}>{b}{b === 38400 ? ' (default)' : ''}</option>
                ))}
              </select>
              <span className="muted" style={{ fontSize: 13 }}>Most ELM327 clones use 38400. OBDLink and vLinker often use 115200 or 500000.</span>
            </div>
          )}

          {adapter === 'simulator' && (
            <fieldset style={{ border: 0, padding: 0, margin: '16px 0 0' }}>
              <legend className="label" style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Simulated vehicle</legend>
              <div className="grid auto">
                {SIM_VEHICLES.map((v) => (
                  <label key={v.id} className={`option ${simId === v.id ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
                    <input type="radio" name="sim" className="sr-only" checked={simId === v.id} onChange={() => setSimId(v.id)} />
                    <span>
                      <strong>{v.label}</strong>
                      <span className="muted" style={{ display: 'block', fontSize: 13 }}>{v.note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="actions" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setStep(adapter === 'simulator' ? 3 : 2)} icon={<ArrowRight size={16} />}>
              Next
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2>2. Tell us about the vehicle</h2>
          <p className="muted" style={{ marginBottom: 12 }}>Used to pick brand-specific explanations and module addresses. You can also let the app read the VIN.</p>
          <div className="tabs" role="tablist" aria-label="Region" style={{ marginBottom: 16 }}>
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                className="tab"
                aria-selected={vehicle.region === r}
                onClick={() => dx.setVehicle({ region: r as Region, make: makesByRegion(r).some((m) => m.name === vehicle.make) ? vehicle.make : undefined })}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Make">
            {makesByRegion(vehicle.region).map((m) => (
              <button key={m.name} type="button" className="chip" aria-pressed={vehicle.make === m.name} onClick={() => dx.setVehicle({ make: m.name })}>
                {m.name}
              </button>
            ))}
          </div>
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="year">Model year</label>
              <select id="year" className="select" value={vehicle.year ?? ''} onChange={(e) => dx.setVehicle({ year: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Select year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="model">Model (optional)</label>
              <input id="model" className="input" value={vehicle.model ?? ''} onChange={(e) => dx.setVehicle({ model: e.target.value })} placeholder="e.g. Elantra" />
            </div>
          </div>
          <label className="check" style={{ marginTop: 16 }}>
            <input type="checkbox" checked={vehicle.autoDetect} onChange={(e) => dx.setVehicle({ autoDetect: e.target.checked })} />
            <span>Auto-detect make and year from the VIN after connecting ({MAKES.length} makes supported)</span>
          </label>
          <div className="actions" style={{ marginTop: 20, justifyContent: 'space-between' }}>
            <Button onClick={() => setStep(1)} icon={<ArrowLeft size={16} />}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)} icon={<ArrowRight size={16} />}>Next</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2>3. Connect</h2>
          {dx.status === 'disconnected' && (
            <p className="muted" style={{ marginBottom: 12 }}>
              {adapter === 'serial'
                ? 'Your browser will ask you to pick the serial port of the adapter. Ignition ON, engine OFF is fine.'
                : `Simulator: ${SIM_VEHICLES.find((v) => v.id === simId)?.label}.`}
            </p>
          )}
          <ol className="checklist" aria-label="Connection progress">
            {dx.steps.map((s) => (
              <li key={s.id}>
                <span className={`st ${s.state === 'ok' ? 'ok' : s.state === 'fail' ? 'fail' : s.state === 'skipped' ? 'skip' : ''}`} aria-hidden>
                  {s.state === 'running' ? <Spinner size={18} /> : s.state === 'ok' ? <CircleCheck size={20} /> : s.state === 'fail' ? <CircleX size={20} /> : s.state === 'skipped' ? <Minus size={20} /> : <span className="muted">○</span>}
                </span>
                <span>
                  <strong>{s.label}</strong>
                  <span className="sr-only"> {s.state}</span>
                  {s.detail && <span className="muted" style={{ display: 'block', fontSize: 13 }}>{s.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
          {dx.status === 'error' && dx.error && (
            <div style={{ marginTop: 16 }}>
              <Notice kind="err">
                <strong>Could not connect.</strong> {dx.error}
                <div className="muted" style={{ marginTop: 4 }}>Check the ignition is ON, the adapter is seated in the OBD2 port, and the baud rate matches the adapter (try 38400, then 115200).</div>
              </Notice>
            </div>
          )}
          {connected && dx.info && (
            <div style={{ marginTop: 16 }}>
              <Notice kind="ok">
                Connected via <strong>{dx.info.protocol.name}</strong>
                {dx.info.vin ? <> - VIN <span className="mono">{dx.info.vin}</span></> : null}.
              </Notice>
            </div>
          )}
          <div className="actions" style={{ marginTop: 20, justifyContent: 'space-between' }}>
            <Button onClick={() => setStep(adapter === 'simulator' ? 1 : 2)} disabled={connecting} icon={<ArrowLeft size={16} />}>Back</Button>
            {connected ? (
              <Button variant="primary" onClick={() => navigate('/')} icon={<ArrowRight size={16} />}>Go to dashboard</Button>
            ) : (
              <Button variant="primary" onClick={() => void go()} disabled={connecting} icon={connecting ? <Spinner size={16} /> : adapter === 'serial' ? <Plug size={16} /> : <CircleAlert size={16} style={{ display: 'none' }} />}>
                {connecting ? 'Connecting…' : dx.status === 'error' ? 'Try again' : 'Connect'}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
