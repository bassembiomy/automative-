import { useState } from 'react';
import { Download, FileJson, History, Printer, Trash2 } from 'lucide-react';
import { lookup } from '../data/dtc';
import { useDiagnostics } from '../state/DiagnosticContext';
import { historyToJson, totalCodes, vehicleLabel, type HistoryEntry } from '../state/history';
import { Button, Card, EmptyState, SeverityPill } from '../components/ui';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EntryCodes({ e }: { e: HistoryEntry }) {
  const groups = [
    ['Stored', e.stored],
    ['Pending', e.pending],
    ['Permanent', e.permanent],
  ] as const;
  return (
    <div className="stack">
      {groups.map(([label, list]) =>
        list.length ? (
          <div key={label}>
            <h3>{label}</h3>
            <div className="scroll-x">
              <table className="tbl">
                <thead><tr><th>Code</th><th>Description</th><th>Severity</th><th>ECU</th></tr></thead>
                <tbody>
                  {list.map((d, i) => {
                    const info = lookup(d.code, e.vehicle.make);
                    return (
                      <tr key={d.code + i}>
                        <td className="mono"><strong>{d.code}</strong></td>
                        <td>{info.title}</td>
                        <td><SeverityPill severity={info.severity} /></td>
                        <td className="mono">{d.ecu}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null,
      )}
      {totalCodes(e) === 0 && <p className="muted">No trouble codes were stored in this scan.</p>}
    </div>
  );
}

export function HistoryPage() {
  const { history, deleteHistory, clearHistory } = useDiagnostics();
  const [open, setOpen] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const print = (id: string) => {
    setPrintId(id);
    setTimeout(() => {
      window.print();
      setPrintId(null);
    }, 50);
  };

  const printEntry = history.find((h) => h.id === printId);

  return (
    <div className="stack">
      <div className="page-head no-print">
        <div>
          <h1>History</h1>
          <p>Scans are saved only in this browser. Nothing is uploaded.</p>
        </div>
        <div className="actions">
          <Button onClick={() => download('autoscan-history.json', historyToJson(history), 'application/json')} disabled={history.length === 0} icon={<FileJson size={16} />}>Export JSON</Button>
          <Button variant="danger" onClick={() => window.confirm('Delete all saved scans?') && clearHistory()} disabled={history.length === 0} icon={<Trash2 size={16} />}>Delete all</Button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="no-print">
          <EmptyState icon={<History size={28} />} title="No saved scans yet">Every code read is saved here automatically (you can turn this off in Settings).</EmptyState>
        </div>
      ) : (
        <div className="stack no-print">
          {history.map((h) => (
            <Card key={h.id} className="hist-item">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{vehicleLabel(h.vehicle)}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{new Date(h.timestamp).toLocaleString()} - {h.protocol || 'unknown protocol'}{h.vehicle.vin ? ` - ${h.vehicle.vin}` : ''}</div>
                </div>
                <div className="row">
                  <span className="badge">{totalCodes(h)} code{totalCodes(h) === 1 ? '' : 's'}</span>
                  {h.mil && <span className="badge accent">MIL on</span>}
                  <Button size="sm" onClick={() => setOpen(open === h.id ? null : h.id)} aria-expanded={open === h.id}>{open === h.id ? 'Hide' : 'View'}</Button>
                  <Button size="sm" onClick={() => print(h.id)} icon={<Printer size={14} />}>Print</Button>
                  <Button size="sm" onClick={() => download(`autoscan-${new Date(h.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`, historyToJson([h]), 'application/json')} icon={<Download size={14} />} aria-label="Export this scan as JSON">JSON</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteHistory(h.id)} icon={<Trash2 size={14} />} aria-label="Delete this scan" />
                </div>
              </div>
              {open === h.id && <EntryCodes e={h} />}
            </Card>
          ))}
        </div>
      )}

      {printEntry && (
        <section className="print-only" aria-label="Printable report">
          <h1>AutoScan OBD2 - diagnostic report</h1>
          <p>{vehicleLabel(printEntry.vehicle)}{printEntry.vehicle.vin ? ` - VIN ${printEntry.vehicle.vin}` : ''}</p>
          <p>{new Date(printEntry.timestamp).toLocaleString()} - {printEntry.protocol} - MIL {printEntry.mil ? 'on' : 'off'}</p>
          <EntryCodes e={printEntry} />
          <p style={{ marginTop: 16, fontSize: 12 }}>This report is informational only. Have faults inspected by a qualified technician.</p>
        </section>
      )}
    </div>
  );
}
