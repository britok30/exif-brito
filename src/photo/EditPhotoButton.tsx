'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import type { Photo } from '@/db';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { parseUploadTags } from './upload-policy';
import { LocationInput } from './LocationInput';
import { shortPhotoLocation } from './location';
import { PhotoImage } from './PhotoImage';

export function EditPhotoButton({ photo, previewUrl }: { photo: Photo; previewUrl?: string }) {
  const router = useRouter();
  const initial = () => ({ title: photo.title || '', caption: photo.caption || '', locationName: photo.locationName || '', tags: (photo.tags || []).join(', '), hidden: !!photo.hidden });
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const preview = shortPhotoLocation({ locationName: values.locationName, tags: parseUploadTags(values.tags) });

  function changeOpen(next: boolean) {
    if (pending) return;
    if (!next && dirty) { setDiscard(true); return; }
    if (next) { const nextValues = initial(); setValues(nextValues); setBaseline(nextValues); setError(''); setDiscard(false); setSaved(false); }
    setOpen(next);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/photos/${photo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, tags: parseUploadTags(values.tags) }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Your changes couldn’t be saved. Please try again.'); return; }
      setBaseline(values); setOpen(false); setSaved(true);
      if (values.hidden && !photo.hidden) router.push('/admin/photos');
      router.refresh();
    } catch { setError('The connection was interrupted. Your changes are still here; try saving again.'); }
    finally { setPending(false); }
  }
  return <>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger className="photo-edit-trigger" aria-label="Edit photograph"><Pencil size={14} strokeWidth={1.25} />Edit</DialogTrigger>
      <DialogContent className="photo-editor max-[540px]:translate-x-0 max-[540px]:translate-y-0" showCloseButton={false}>
        <header className="photo-editor-header">
          {previewUrl && <div className="photo-editor-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <PhotoImage imageKey={photo.thumbnailUrl || photo.url} src={previewUrl} alt="" />
          </div>}
          <div><p className="gallery-label">Private studio</p><DialogTitle className="photo-editor-title">Edit photograph.</DialogTitle>
            <DialogDescription className="mt-2 text-xs">Details for your gallery.</DialogDescription></div>
          <button type="button" className="photo-editor-close" aria-label="Close editor" disabled={pending} onClick={() => changeOpen(false)}><X size={20} strokeWidth={1.25} /></button>
        </header>
        <form onSubmit={save}>
          <div className="photo-editor-body">
          <fieldset disabled={pending} className="photo-editor-fields">
            <label>Title<Input maxLength={255} value={values.title} onChange={event => setValues({ ...values, title: event.target.value })} placeholder="Untitled" /></label>
            <label>Caption<Textarea maxLength={10000} value={values.caption} onChange={event => setValues({ ...values, caption: event.target.value })} rows={3} placeholder="The story behind this frame" /></label>
            <LocationInput value={values.locationName} onChange={locationName => setValues(current => ({ ...current, locationName }))} />
            <p className="photo-editor-note">Shown in the gallery as <strong>{preview || 'No location'}</strong>.</p>
            <label>Tags<Input value={values.tags} onChange={event => setValues({ ...values, tags: event.target.value })} placeholder="Japan, travel, summer" /></label>
            <p className="photo-editor-note">Separate tags with commas.</p>
            <label className="photo-editor-visibility"><input type="checkbox" checked={values.hidden} onChange={event => setValues({ ...values, hidden: event.target.checked })} />Hide from public gallery</label>
            <p className="photo-editor-note">You can restore visibility anytime in Studio.</p>
          </fieldset>
          {error && <p className="photo-editor-error" role="alert">{error}</p>}
          {discard && <div className="photo-editor-discard" role="alert">
            <p>Discard your unsaved changes?</p>
            <div className="flex flex-wrap gap-3 mt-3"><button type="button" className="studio-button" onClick={() => setDiscard(false)}>Keep editing</button>
              <button type="button" className="studio-button primary" onClick={() => { setOpen(false); setDiscard(false); }}>Discard changes</button></div>
          </div>}
          </div>
          <footer className="photo-editor-footer"><button type="button" className="studio-button" disabled={pending} onClick={() => changeOpen(false)}>Cancel</button>
            <button type="submit" className="studio-button primary" disabled={pending || !dirty} aria-live="polite">{pending ? 'Saving…' : 'Save changes'}</button></footer>
        </form>
      </DialogContent>
    </Dialog>
    {saved && <span className="gallery-label" role="status">Saved</span>}
  </>;
}
