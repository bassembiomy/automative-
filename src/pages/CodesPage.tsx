import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Plug, RefreshCw, Save, Snowflake, Trash2 } from 'lucide-react';
import { lookup, type DtcInfo } from '../data/dtc';
import type { DtcKind, DtcRecord } from '../obd/types';
import { ecuLabel } from '../obd/modules';
import { toDisplayUnit } from '../obd/pids';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Button, Card, EmptyState, Spinner } from '../components/ui';
import { CodeCard } from '../components/CodeCard';
import { CodeDrawer } from '../components/CodeDrawer';
import { ClearCodesDialog } from '../components/ClearCodesDialog';

const KINDS: { id: DtcKind; label: string; hint: string }[] = [
  { id: 'stored', label: 'Stored', hint: 'Confirmed faults (Mode 03). These turn the check-engine light on.' },
  { id: 'pending', label: 'Pending', hint: 'Faults seen once, not yet confirmed (Mode 07).' },
  { id: 'permanent', label: 'Permanent', hint: 'Cannot be cleared with a scan tool; they clear themselves after the repair and a drive cycle (Mode 0A).' },
];

export function CodesPage() {
  const dx = useDiagnostics();
  const [kind, setKind] = useState<DtcKind>('stored');
  const [confirm, setConfirm] = useState(false);
  const [detail, setDetail] = useState<DtcInfo | null>(null);

  if (dx.status !== 'connected' || !dx.scan) {
    return (
      <div className="stack">
        <div className="page-head"><h1>Trouble codes</h1></div>
        <EmptyState icon={<Plug size={28} />} title="Not connected" action={<Link className="btn primary" to="/connect">Connect an adapter</Link>}>
          Connect your USB adapter or the simulator to read stored, pending and permanent codes. You can look up any code offline on the Code Lookup page.
        </EmptyState>
      </div>
    );
  }

  const scan = dx.scan;
  const list: DtcRecord[] = scan[kind];
  const make = dx.vehicle.make;
  const busy = dx.busy !== null;

  const doClear = async () => {
    const ok = await dx.clearCodes();
    if (ok) setConfirm(false);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Trouble codes</h1>
          <p>Read {new Date(scan.timestamp).toLocaleTimeString()} - MIL {scan.mil ? 'ON' : 'off'}</p>
        </div>
        <div className="actions">
          <Button onClick={() => void dx.refreshCodes()} disabled={busy} icon={dx.busy === 'codes' ? <Spinner size={16} /> : <RefreshCw size={16} />}>Read codes</Button>
          <Button onClick={dx.saveScan} icon={<Save size={16} />}>Save</Button>
          <Button variant="danger" onClick={() => setConfirm(true)} disabled={busy || (scan.stored.length + scan.pending.length + scan.permanent.length === 0)} icon={<Trash2 size={16} />}>
            Clear codes
          </Button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Code type">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="tab" className="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label} <span className="count">{scan[k.id].length}</span>
          </button>
        ))}
      </div>
      <p className="muted">{KINDS.find((k) => k.id === kind)?.hint}</p>

      {list.length === 0 ? (
        <EmptyState icon={<CircleCheck size={28} />} title={`No ${kind} codes`}>
          {kind === 'stored' ? 'The engine control unit reports no confirmed trouble codes.' : 'Nothing to report in this category.'}
        </EmptyState>
      ) : (
        <div className="stack" aria-live="polite">
          {list.map((d, i) => (
            <CodeCard key={`${d.ecu}-${d.code}-${i}`} info={lookup(d.code, make)} ecu={ecuLabel(d.ecu)} defaultOpen={list.length === 1} onDetails={setDetail} />
          ))}
        </div>
      )}

      {scan.freezeFrame && kind === 'stored' && (
        <Card>
          <h2 className="row" style={{ gap: 8 }}><Snowflake size={18} aria-hidden /> Freeze frame {scan.freezeFrame.dtc && <span className="mono">{scan.freezeFrame.dtc}</span>}</h2>
          <p className="muted" style={{ marginBottom: 10 }}>Engine conditions at the moment the first fault was recorded.</p>
          <div className="grid auto">
            {scan.freezeFrame.values.map((v) => {
              const d = toDisplayUnit(v.value, v.unit, dx.settings.imperial);
              return (
                <div key={v.pid} className="card raised stat">
                  <span className="num" style={{ fontSize: 22 }}>{d.value.toFixed(d.value >= 100 ? 0 : 1)} <span className="muted" style={{ fontSize: 13 }}>{d.unit}</span></span>
                  <span className="lbl">{v.name}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <ClearCodesDialog open={confirm} busy={dx.busy === 'clear'} onCancel={() => setConfirm(false)} onConfirm={() => void doClear()} />
      <CodeDrawer info={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
