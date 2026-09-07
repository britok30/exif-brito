'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ClearUnpublished({ count }: { count: number }) {
  const router = useRouter();
  const lock = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  async function prepare() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(''); setConfirmation('');
    try {
      const response = await fetch('/api/photos/clear-unpublished', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setIds(data.ids); setOpen(true);
    } catch { setMessage('Couldn’t load unpublished photographs. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function clear() {
    if (lock.current || confirmation !== 'CLEAR' || !ids.length) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/photos/clear-unpublished', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, confirmation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOpen(false); setMessage(`${data.removed.toLocaleString()} unpublished photographs cleared. Stored image files were kept.`);
      router.refresh();
    } catch { setMessage('Couldn’t confirm the result. Close this window and refresh before trying again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div>
    <button className="studio-button" disabled={!count || busy} onClick={prepare}>{busy ? 'Please wait…' : 'Clear unpublished'}</button>
    {!open && message && <p role="status" className="studio-note">{message}</p>}
    <Dialog open={open} onOpenChange={value => { if (!lock.current) setOpen(value); }}>
      <DialogContent showCloseButton={!busy}>
        <DialogTitle>Clear unpublished work?</DialogTitle>
        <DialogDescription>Remove all {ids.length.toLocaleString()} unpublished photographs from your library, including their collection memberships. Published photographs stay. Stored image files and your SD card are untouched. Restoring these photographs requires importing them again.</DialogDescription>
        <label htmlFor="clear-confirmation" className="studio-confirm-label">Type CLEAR to confirm</label>
        <input id="clear-confirmation" className="studio-confirm-input" autoComplete="off" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} />
        <p role="status">{message}</p>
        <div className="studio-intro-actions"><button className="studio-button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button><button className="studio-button primary" disabled={busy || confirmation !== 'CLEAR' || !ids.length} onClick={clear}>{busy ? 'Clearing…' : 'Clear unpublished'}</button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
