import { Info, ShieldAlert } from 'lucide-react';
import { BAUD_RATES } from '../obd/transport/Transport';
import { stats } from '../data/dtc';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Card, Notice } from '../components/ui';

export function SettingsPage() {
  const { settings, updateSettings } = useDiagnostics();
  return (
    <div className="stack">
      <div className="page-head"><h1>Settings</h1></div>
      <div className="grid cols-2">
        <Card>
          <h2>Adapter</h2>
          <div className="stack">
            <div className="field">
              <label htmlFor="s-baud">Baud rate</label>
              <select id="s-baud" className="select" value={settings.baud} onChange={(e) => updateSettings({ baud: Number(e.target.value) })}>
                {BAUD_RATES.map((b) => <option key={b} value={b}>{b}{b === 38400 ? ' (default)' : ''}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-timeout">Command timeout (ms)</label>
              <input id="s-timeout" type="number" min={500} max={20000} step={500} className="input" value={settings.timeoutMs} onChange={(e) => updateSettings({ timeoutMs: Math.min(20000, Math.max(500, Number(e.target.value) || 3000)) })} />
            </div>
            <div className="field">
              <label htmlFor="s-poll">Live data pause between samples (ms)</label>
              <input id="s-poll" type="number" min={50} max={5000} step={50} className="input" value={settings.pollMs} onChange={(e) => updateSettings({ pollMs: Math.min(5000, Math.max(50, Number(e.target.value) || 250)) })} />
            </div>
            <p className="muted" style={{ fontSize: 13 }}>Changes to baud rate and timeout apply to the next connection.</p>
          </div>
        </Card>
        <Card>
          <h2>Display</h2>
          <div className="stack">
            <div className="field">
              <label htmlFor="s-theme">Theme</label>
              <select id="s-theme" className="select" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value === 'light' ? 'light' : 'dark' })}>
                <option value="dark">Dark (instrument cluster)</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-units">Units</label>
              <select id="s-units" className="select" value={settings.imperial ? 'imperial' : 'metric'} onChange={(e) => updateSettings({ imperial: e.target.value === 'imperial' })}>
                <option value="metric">Metric (°C, km/h, kPa)</option>
                <option value="imperial">Imperial (°F, mph, psi)</option>
              </select>
            </div>
            <label className="check">
              <input type="checkbox" checked={settings.showConsole} onChange={(e) => updateSettings({ showConsole: e.target.checked })} />
              <span>Show the raw ELM327 console (advanced)</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={settings.autoSave} onChange={(e) => updateSettings({ autoSave: e.target.checked })} />
              <span>Save every code read to History automatically</span>
            </label>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="row" style={{ gap: 8 }}><ShieldAlert size={18} aria-hidden /> Safety and limits</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>Clearing codes does <strong>not</strong> fix the fault. The code returns if the problem persists.</li>
          <li>Clearing resets the readiness monitors and erases freeze-frame data; the car may fail an inspection until a drive cycle completes.</li>
          <li>Clear codes only with the ignition ON and the engine OFF. Never operate this app while driving.</li>
          <li>Reading ABS, airbag and body modules works only on CAN cars, and only for modules that answer standard UDS. Older K-line cars need manufacturer tools for those modules.</li>
          <li>Airbag (SRS) work can be dangerous. Do not probe SRS circuits yourself.</li>
          <li>Manufacturer-specific explanations are best-effort guidance. Always confirm against the service information for your exact vehicle.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="row" style={{ gap: 8 }}><Info size={18} aria-hidden /> About</h2>
        <p>AutoScan OBD2 reads and explains diagnostic trouble codes through a USB ELM327 adapter using the Web Serial API (Chrome or Edge on desktop).</p>
        <p className="muted" style={{ marginTop: 6 }}>Offline code database: {stats.total} entries ({stats.generic} generic, {stats.korean} Korean, {stats.german} German, {stats.japanese} Japanese). Scan history and settings are stored only in this browser.</p>
        <div style={{ marginTop: 12 }}>
          <Notice>This project is independent and is not affiliated with or endorsed by any vehicle manufacturer.</Notice>
        </div>
      </Card>
    </div>
  );
}
