import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, X } from 'lucide-react';
import { useDiagnostics } from '../state/DiagnosticContext';
import { Button } from './ui';

/** Raw ELM327 traffic panel for advanced users. */
export function ConsoleLog() {
  const { log, clearLog, sendRaw, status, updateSettings } = useDiagnostics();
  const [cmd, setCmd] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const prefix = { tx: '>> ', rx: '<< ', info: '', error: '!! ' } as const;
  return (
    <section className="console" aria-label="Raw ELM327 console">
      <div className="console-head">
        <span>ELM327 console</span>
        <span className="muted" style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" onClick={clearLog} icon={<Trash2 size={14} />} aria-label="Clear console" />
        <Button size="sm" variant="ghost" onClick={() => updateSettings({ showConsole: false })} icon={<X size={14} />} aria-label="Hide console" />
      </div>
      <div className="console-body" ref={bodyRef} role="log" aria-live="off" tabIndex={0}>
        {log.length === 0 && <span className="info">No traffic yet. Connect an adapter or the simulator.</span>}
        {log.map((l) => (
          <div key={l.id} className={l.dir}>
            {prefix[l.dir]}
            {l.text}
          </div>
        ))}
      </div>
      <form
        className="console-form"
        onSubmit={(e) => {
          e.preventDefault();
          void sendRaw(cmd);
          setCmd('');
        }}
      >
        <input className="input mono" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="AT command or hex request (e.g. ATRV, 0100)" aria-label="Raw command" disabled={status !== 'connected'} />
        <Button type="submit" disabled={status !== 'connected' || !cmd.trim()} icon={<Send size={14} />}>
          Send
        </Button>
      </form>
    </section>
  );
}
