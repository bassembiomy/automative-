import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button, Spinner } from './ui';

interface Props {
  open: boolean;
  title?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Clearing codes needs an explicit checkbox before the red button becomes active. */
export function ClearCodesDialog({ open, title = 'Clear trouble codes?', busy, onCancel, onConfirm }: Props) {
  // the inner body is re-mounted every time the dialog opens, which resets the checkbox
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <ClearBody busy={busy} onCancel={onCancel} onConfirm={onConfirm} />
    </Dialog>
  );
}

function ClearBody({ busy, onCancel, onConfirm }: Omit<Props, 'open' | 'title'>) {
  const [ack, setAck] = useState(false);
  return (
    <>
      <p>Before you continue, make sure of the following:</p>
      <ul>
        <li>The ignition is <strong>ON</strong> and the engine is <strong>OFF</strong>. Never clear codes while driving.</li>
        <li>The fault has been <strong>repaired</strong>. Clearing does not fix anything - the code returns if the problem persists.</li>
        <li>Clearing <strong>resets the readiness monitors</strong> and erases freeze-frame data. The car may fail an emissions inspection until a full drive cycle completes.</li>
        <li>Write down the codes first (they are also saved to History).</li>
      </ul>
      <label className="check">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span>I understand, the engine is off, and I want to clear the codes.</span>
      </label>
      <div className="dialog-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" disabled={!ack || busy} onClick={onConfirm} icon={busy ? <Spinner size={16} /> : <Trash2 size={16} />}>
          Clear codes
        </Button>
      </div>
    </>
  );
}
