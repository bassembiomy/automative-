import { useId, useState } from 'react';
import { ChevronDown, Car, ExternalLink } from 'lucide-react';
import type { DtcInfo } from '../data/dtc';
import { SectionBadge, SeverityPill } from './ui';

interface Props {
  info: DtcInfo;
  ecu?: string;
  defaultOpen?: boolean;
  extra?: string;
  onDetails?: (info: DtcInfo) => void;
}

export function Explanation({ info }: { info: DtcInfo }) {
  return (
    <div className="code-body">
      <div style={{ paddingTop: 12 }}>
        <h4>Why it happens</h4>
        <p>{info.description}</p>
        {info.fallback && (
          <p className="muted" style={{ marginTop: 6 }}>
            This code is not in the offline database, so the explanation is built from the code structure.
          </p>
        )}
      </div>
      <div className="two">
        <div>
          <h4>Symptoms</h4>
          <ul>{info.symptoms.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <h4>Likely causes</h4>
          <ul>{info.causes.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
      <div>
        <h4>Suggested fixes</h4>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 3 }}>{info.fixes.map((s) => <li key={s}>{s}</li>)}</ol>
      </div>
      <div className={`drive-box ${info.severity}`}>
        <Car size={18} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
        <div>
          <strong>Can I drive?</strong> {info.canDrive}
        </div>
      </div>
    </div>
  );
}

/** A trouble code with big monospace id, badges and an expandable explanation. */
export function CodeCard({ info, ecu, defaultOpen = false, extra, onDetails }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <article className={`code-card ${info.severity} ${open ? 'open' : ''}`}>
      <button type="button" className="code-head" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        <span className="code-id">{info.code}</span>
        <span className="code-main">
          <span className="code-title">{info.title}</span>
          <span className="code-meta">
            <SectionBadge section={info.section} />
            <SeverityPill severity={info.severity} />
            {info.makes && <span className="badge accent">{info.makes.length > 3 ? `${info.makes.slice(0, 3).join(', ')}…` : info.makes.join(', ')}</span>}
            {info.fallback && <span className="badge">Not in database</span>}
            {ecu && <span className="badge mono">ECU {ecu}</span>}
            {extra && <span className="badge mono">{extra}</span>}
          </span>
        </span>
        <ChevronDown className="chev" size={20} aria-hidden />
      </button>
      {open && (
        <div id={bodyId}>
          <Explanation info={info} />
          {onDetails && (
            <div style={{ padding: '0 16px 14px' }}>
              <button type="button" className="btn sm" onClick={() => onDetails(info)}>
                <ExternalLink size={14} aria-hidden /> Full details
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
