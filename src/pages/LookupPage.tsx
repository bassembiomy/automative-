import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { isValidCodeFormat, lookup, normalizeCode, search, stats, type DtcInfo, type Section } from '../data/dtc';
import { MAKES } from '../data/makes';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Card, EmptyState } from '../components/ui';
import { CodeCard } from '../components/CodeCard';
import { CodeDrawer } from '../components/CodeDrawer';

const SECTIONS: (Section | 'All')[] = ['All', 'Powertrain', 'Chassis', 'Body', 'Network'];
const LIMIT = 60;

export function LookupPage() {
  const { vehicle } = useDiagnostics();
  const [q, setQ] = useState('');
  const [section, setSection] = useState<Section | 'All'>('All');
  const [make, setMake] = useState<string>('All');
  const [detail, setDetail] = useState<DtcInfo | null>(null);

  const results = useMemo(() => search(q, { section, make }), [q, section, make]);
  const code = normalizeCode(q);
  const exactMissing = isValidCodeFormat(code) && !results.some((r) => r.code === code);
  const shown = results.slice(0, LIMIT);
  const lookupMake = make !== 'All' && make !== 'Generic' ? make : vehicle.make;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Code lookup</h1>
          <p>Works offline. {stats.total} explanations: {stats.generic} generic, {stats.korean} Korean, {stats.german} German, {stats.japanese} Japanese.</p>
        </div>
      </div>

      <Card>
        <div className="grid cols-3">
          <div className="field" style={{ gridColumn: 'span 1' }}>
            <label htmlFor="q">Code or keyword</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} aria-hidden style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              <input id="q" className="input mono" style={{ paddingLeft: 36 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="P0420, misfire, ABS…" autoComplete="off" spellCheck={false} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="make">Brand</label>
            <select id="make" className="select" value={make} onChange={(e) => setMake(e.target.value)}>
              <option value="All">All brands</option>
              <option value="Generic">Generic codes only</option>
              {['Korean', 'German', 'Japanese'].map((r) => (
                <optgroup key={r} label={r}>
                  {MAKES.filter((m) => m.region === r).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label">System</span>
            <div className="chips" role="group" aria-label="Section">
              {SECTIONS.map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={section === s} onClick={() => setSection(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {exactMissing && (
        <div className="stack">
          <p className="muted">{code} is not in the database. Here is what its structure tells us:</p>
          <CodeCard info={lookup(code, lookupMake)} defaultOpen />
        </div>
      )}

      {shown.length === 0 && !exactMissing ? (
        <EmptyState icon={<Search size={28} />} title="No matching codes">Try a code such as P0301, or a keyword like &quot;oxygen&quot;, &quot;EVAP&quot; or &quot;wheel speed&quot;.</EmptyState>
      ) : (
        <div className="stack" aria-live="polite">
          <p className="muted">{results.length} result{results.length === 1 ? '' : 's'}{results.length > LIMIT ? ` (showing first ${LIMIT} - refine your search)` : ''}</p>
          {shown.map((e) => (
            <CodeCard key={`${e.code}-${e.makes?.join('|') ?? 'g'}`} info={e} defaultOpen={shown.length === 1} onDetails={setDetail} />
          ))}
        </div>
      )}
      <CodeDrawer info={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
