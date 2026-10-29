import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Cpu, Gauge as GaugeIcon, History, LayoutDashboard, Moon, Plug, Search, Settings, Sun, TriangleAlert, Unplug, X } from 'lucide-react';
import { useDiagnostics } from '../state/DiagnosticContext';
import { ConsoleLog } from './ConsoleLog';
import { Button } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/codes', label: 'Trouble Codes', short: 'Codes', icon: TriangleAlert },
  { to: '/modules', label: 'Modules', short: 'Modules', icon: Cpu },
  { to: '/live', label: 'Live Data', short: 'Live', icon: Activity },
  { to: '/lookup', label: 'Code Lookup', short: 'Lookup', icon: Search },
  { to: '/history', label: 'History', short: 'History', icon: History },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
];

export function ConnectionPill() {
  const { status, info, voltage } = useDiagnostics();
  const text =
    status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Connection failed' : 'Disconnected';
  return (
    <span className={`pill ${status}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden />
      <span className="pill-text">
        {text}
        {status === 'connected' && info && <span className="pill-extra"> · {info.protocol.name}{voltage ? ` · ${voltage.replace(/\s+/g, '')}` : ''}</span>}
      </span>
    </span>
  );
}

export function Layout() {
  const { status, vehicle, scan, disconnect, settings, updateSettings, notice, dismissNotice } = useDiagnostics();
  const navigate = useNavigate();
  const count = scan ? scan.stored.length : 0;
  const name = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const connected = status === 'connected';
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            <GaugeIcon size={20} />
          </div>
          <div>
            AutoScan
            <small>OBD2 diagnostics</small>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map(({ to, label, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={label}>
              <Icon size={20} aria-hidden />
              <span className="nav-label">
                <span className="desk-only">{label}</span>
              </span>
              <span className="nav-short" aria-hidden>{short}</span>
              {to === '/codes' && connected && count > 0 && <span className="badge-dot" aria-label={`${count} codes`}>{count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">Not affiliated with any vehicle manufacturer.</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="brand-mobile">
            <div className="brand-mark" style={{ width: 28, height: 28 }} aria-hidden>
              <GaugeIcon size={16} />
            </div>
          </div>
          <ConnectionPill />
          {connected && name && <span className="vehicle-name">{name}</span>}
          <span className="spacer" />
          <Button
            variant="ghost"
            className="icon-btn"
            aria-label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            icon={settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          />
          {connected ? (
            <Button onClick={() => void disconnect()} icon={<Unplug size={16} />}>
              <span className="btn-label">Disconnect</span>
            </Button>
          ) : (
            <Button variant="primary" onClick={() => navigate('/connect')} icon={<Plug size={16} />} disabled={status === 'connecting'}>
              <span className="btn-label">Connect</span>
            </Button>
          )}
        </header>
        {notice && (
          <div className="page" style={{ paddingBottom: 0, flex: 'none' }}>
            <div className={`notice ${notice.kind === 'ok' ? 'ok' : 'err'}`} role={notice.kind === 'err' ? 'alert' : 'status'}>
              <span style={{ flex: 1 }}>{notice.text}</span>
              <button type="button" className="btn ghost sm icon-btn" aria-label="Dismiss message" onClick={dismissNotice}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        <main className="page">
          <Outlet />
        </main>
        {settings.showConsole && <ConsoleLog />}
      </div>
    </div>
  );
}
