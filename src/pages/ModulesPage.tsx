import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, CircleX, Cpu, Plug, ScanLine, Trash2, TriangleAlert } from 'lucide-react';
import { lookup } from '../data/dtc';
import { isCanProtocol } from '../obd/protocols';
import { describeStatus } from '../obd/uds';
import type { ModuleResult } from '../obd/types';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Button, Card, EmptyState, Notice, Spinner } from '../components/ui';
import { CodeCard } from '../components/CodeCard';
import { ClearCodesDialog } from '../components/ClearCodesDialog';

export function ModulesPage() {
  const dx = useDiagnostics();
  const [target, setTarget] = useState<ModuleResult | null>(null);

  if (dx.status !== 'connected' || !dx.info) {
    return (
      <div className="stack">
        <div className="page-head"><h1>Modules</h1></div>
        <EmptyState icon={<Plug size={28} />} title="Not connected" action={<Link className="btn primary" to="/connect">Connect an adapter</Link>}>
          Connect to a CAN-bus car to query the engine, transmission, ABS, airbag and body modules.
        </EmptyState>
      </div>
    );
  }

  const can = isCanProtocol(dx.info.protocol);
  const prog = dx.moduleProgress;

  if (!can) {
    return (
      <div className="stack">
        <div className="page-head"><h1>Modules</h1></div>
        <Notice kind="warn">
          <strong>Module scan needs a CAN connection.</strong> This car is using {dx.info.protocol.name}. On K-line and J1850 cars the OBD2 port only exposes the engine
          control unit; ABS, airbag and body modules need a manufacturer-specific tool. The engine codes are on the <Link to="/codes">Trouble Codes</Link> page.
        </Notice>
      </div>
    );
  }

  const results = dx.modules;
  const make = dx.vehicle.make;
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Modules</h1>
          <p>Queries every module that answers standard UDS on the CAN bus (service 19 02).</p>
        </div>
        <Button variant="primary" onClick={() => void dx.scanModules()} disabled={dx.busy !== null} icon={dx.busy === 'modules' ? <Spinner size={16} /> : <ScanLine size={16} />}>
          {results ? 'Scan again' : 'Scan modules'}
        </Button>
      </div>

      {prog && (
        <Card aria-live="polite">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>Scanning: {prog.current}</span>
            <span className="mono">{prog.done}/{prog.total}</span>
          </div>
          <div className="progress" style={{ marginTop: 8 }} role="progressbar" aria-valuemin={0} aria-valuemax={prog.total} aria-valuenow={prog.done}>
            <div style={{ width: `${(prog.done / Math.max(1, prog.total)) * 100}%` }} />
          </div>
        </Card>
      )}

      {!results && !prog && (
        <EmptyState icon={<Cpu size={28} />} title="No module scan yet">
          Press &quot;Scan modules&quot;. Modules that do not support standard UDS are reported as not responding, which is normal and not an error.
        </EmptyState>
      )}

      {results && (
        <>
          <p className="muted">
            {results.filter((r) => r.status === 'ok').length} modules answered, {results.reduce((n, r) => n + r.dtcs.length, 0)} codes in total.
          </p>
          <div className="stack">
            {results.map((r) => (
              <Card key={r.module.tx}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: r.dtcs.length ? 12 : 0 }}>
                  <div className="row" style={{ gap: 10 }}>
                    {r.status === 'ok' ? <CircleCheck size={20} color="var(--sev-low)" aria-hidden /> : r.status === 'error' ? <TriangleAlert size={20} color="var(--mil)" aria-hidden /> : <CircleX size={20} color="var(--muted)" aria-hidden />}
                    <div>
                      <strong>{r.module.name}</strong>
                      <div className="muted mono" style={{ fontSize: 12 }}>{r.module.tx} / {r.module.rx} - {r.module.section}</div>
                    </div>
                  </div>
                  <div className="row">
                    <span className="badge">
                      {r.status === 'ok' ? `${r.dtcs.length} code${r.dtcs.length === 1 ? '' : 's'}` : r.status === 'error' ? (r.message ?? 'Error') : 'Not responding'}
                    </span>
                    {r.status === 'ok' && r.dtcs.length > 0 && (
                      <Button size="sm" variant="danger" onClick={() => setTarget(r)} disabled={dx.busy !== null} icon={<Trash2 size={14} />}>Clear</Button>
                    )}
                  </div>
                </div>
                {r.dtcs.length > 0 && (
                  <div className="stack">
                    {r.dtcs.map((d) => (
                      <CodeCard key={d.code + d.failureType} info={lookup(d.code, make)} extra={`-${d.failureType} · ${describeStatus(d.status).join(', ')}`} />
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <ClearCodesDialog
        open={!!target}
        title={target ? `Clear codes in ${target.module.name}?` : ''}
        busy={dx.busy === 'clear-module'}
        onCancel={() => setTarget(null)}
        onConfirm={() => target && void dx.clearModule(target.module).then(() => setTarget(null))}
      />
    </div>
  );
}
