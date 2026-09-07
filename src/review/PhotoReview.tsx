'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2, X } from 'lucide-react';
import { ImageReveal } from '@/photo/ImageReveal';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { uploadDraftStore } from '@/photo/upload-drafts';
import { prepareReview } from './prepare';
type Item = { id: string; name: string; size: number; width: number; height: number; takenAt: string | null; focus: 'clear' | 'check' | 'blurred'; note: string };
export function PhotoReview({ version, items }: { version: string; items: Item[] }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [showBlurred, setShowBlurred] = useState(false);
  const [preview, setPreview] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const blurred = items.filter(item => item.focus === 'blurred').length;
  const visible = showBlurred ? items : items.filter(item => item.focus !== 'blurred');
  async function prepare() {
    if (working.current || !selected.size) return;
    working.current = true; setBusy(true);
    try {
      await prepareReview(version, items, selected, uploadDraftStore, fetch, (done, total) => setMessage(`Preparing ${done} of ${total}…`));
      router.push('/admin/upload');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Couldn’t prepare the selection. Please try again.'); working.current = false; setBusy(false); }
  }
  const continueButton = <button className="studio-button primary" disabled={busy || !selected.size} onClick={() => void prepare()}>{busy ? 'Preparing…' : `Continue with ${selected.size}`}</button>;
  return <section className="local-review">
    <header className="archive-toolbar review-toolbar">
      <p>{selected.size} selected</p>
      <span className="archive-total">{visible.length} of {items.length} photographs{blurred ? ` / ${blurred} soft` : ''}</span>
      <div className="review-controls">
        {blurred > 0 && <div className="slash-toggle" role="group" aria-label="Which photographs to show">
          <button type="button" aria-pressed={!showBlurred} disabled={busy} onClick={() => setShowBlurred(false)}>Sharp</button><span aria-hidden="true">/</span>
          <button type="button" aria-pressed={showBlurred} disabled={busy} onClick={() => setShowBlurred(true)}>All</button>
        </div>}
        {continueButton}
      </div>
    </header>
    <div className="review-grid">{visible.map(item => <ImageReveal key={item.id}><article className="review-card">
      <button type="button" className="review-image" aria-label={`Enlarge ${item.name}`} onClick={() => { setPreview(item); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/review/${item.id}`} alt={item.name} width={item.width} height={item.height} loading="lazy" /><Maximize2 size={15} strokeWidth={1.5} aria-hidden="true" /></button>
      <label><input type="checkbox" checked={selected.has(item.id)} disabled={busy} onChange={event => setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} /><span>{item.name}</span>{item.focus === 'blurred' && <span className="review-focus">Soft focus</span>}</label>
      {item.note && <p>{item.note}</p>}
    </article></ImageReveal>)}</div>
    {!visible.length && <div className="archive-empty"><h2>Nothing sharp in this roll.</h2><button type="button" className="underline underline-offset-4" onClick={() => setShowBlurred(true)}>Show every photograph</button></div>}
    <footer className="review-prepare"><p>Your selection is uploaded next. Publish when you’re ready.</p>{continueButton}<p role="status">{message}</p></footer>
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}>
      {preview && <DialogContent className="review-lightbox" showCloseButton={false}><header><DialogTitle className="gallery-label">{preview.name}</DialogTitle><button className="studio-button icon" aria-label="Close preview" onClick={() => setPreview(null)}><X size={20} strokeWidth={1.25} /></button></header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/review/${preview.id}`} alt={preview.name} /><a className="studio-button" href={`/api/review/${preview.id}?original=1`} target="_blank" rel="noopener noreferrer">Open original</a><p>{preview.note}</p></DialogContent>}
    </Dialog>
  </section>;
}
