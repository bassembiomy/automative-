import { findAll, type DtcInfo } from '../data/dtc';
import { Dialog } from './Dialog';
import { Explanation } from './CodeCard';
import { SectionBadge, SeverityPill } from './ui';

export function CodeDrawer({ info, onClose }: { info: DtcInfo | null; onClose: () => void }) {
  const variants = info ? findAll(info.code).filter((e) => e !== info) : [];
  return (
    <Dialog open={!!info} title={info ? `${info.code} - ${info.title}` : ''} onClose={onClose} variant="drawer">
      {info && (
        <>
          <div className="row">
            <SectionBadge section={info.section} />
            <SeverityPill severity={info.severity} />
            <span className="badge">{info.system}</span>
            {info.makes && <span className="badge accent">{info.makes.join(', ')}</span>}
          </div>
          <Explanation info={info} />
          {variants.length > 0 && (
            <div className="stack">
              <h3 className="muted" style={{ fontSize: 13 }}>Same code on other makes</h3>
              {variants.map((v) => (
                <div key={`${v.code}-${v.makes?.join()}`} className="card raised">
                  <div className="row" style={{ marginBottom: 6 }}>
                    <strong>{v.title}</strong>
                    <span className="badge accent">{v.makes?.join(', ') ?? 'Generic'}</span>
                  </div>
                  <p>{v.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
