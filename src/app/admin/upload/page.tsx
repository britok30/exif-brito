'use client';

import { GalleryHeader } from '@/components/gallery-header';

import './upload.css';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, CheckCheck, FolderPlus, ImagePlus, Pause, Play, RotateCcw, X, ImageOff } from 'lucide-react';
import { extractClientExif } from '@/exif/client';
import { presignAndUpload, geocode, finalizePhoto, discardUpload } from '@/photo/upload-client';
import { UploadQueue, type QueueSnapshot, type UploadItem } from '@/photo/upload-queue';
import { uploadDraftStore } from '@/photo/upload-drafts';
import { parseUploadTags, UPLOAD_ACCEPT } from '@/photo/upload-policy';
import { formatExposureTime } from '@/photo/format';
import { formatCameraName } from '@/photo/camera';
import { StudioIntro } from '@/components/studio-intro';
import { SelectField } from '@/components/ui/select';

const initial: QueueSnapshot = { items: [], paused: false, restoring: true, notices: [] };
const labels = { queued: 'Waiting', reading: 'Reading EXIF', uploading: 'Uploading original', ready: 'Ready to publish', saving: 'Publishing', saved: 'Published', error: 'Needs attention' };
const pageSize = 20;

export default function UploadPage() {
  const [queue, setQueue] = useState<UploadQueue>();
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(0);
  const [bulkTags, setBulkTags] = useState('');
  const [bulkLocation, setBulkLocation] = useState('');
  const [bulkVisibility, setBulkVisibility] = useState('unchanged');
  const input = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const instance = new UploadQueue({ extract: extractClientExif, geocode, upload: presignAndUpload, publish: finalizePhoto,
      discard: discardUpload, store: uploadDraftStore, preview: file => URL.createObjectURL(file), revoke: URL.revokeObjectURL });
    const unsubscribe = instance.subscribe(setState);
    setQueue(instance);
    void instance.restore();
    return () => { unsubscribe(); instance.destroy(); };
  }, []);

  const unfinished = state.items.filter(item => item.status !== 'saved');
  useEffect(() => {
    if (!unfinished.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unfinished.length]);

  const ready = state.items.filter(item => item.status === 'ready');
  const saved = state.items.filter(item => item.status === 'saved');
  const failed = state.items.filter(item => item.status === 'error');
  const busy = state.items.filter(item => ['reading', 'uploading', 'saving'].includes(item.status));
  const waiting = state.items.filter(item => item.status === 'queued');
  const editable = state.items.filter(item => ['queued', 'ready', 'error'].includes(item.status));
  const selection = editable.filter(item => selected.has(item.id));
  const publishable = unfinished.filter(item => !['error', 'saving'].includes(item.status));
  const lastPage = Math.max(0, Math.ceil(state.items.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = state.items.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalBytes = state.items.reduce((sum, item) => sum + item.file.size, 0);
  const transferred = state.items.reduce((sum, item) => sum + item.file.size * (item.progress / 100), 0);
  const progress = totalBytes ? Math.round(transferred / totalBytes * 100) : 0;
  const addFiles = (files: FileList | null) => { if (files) queue?.add(Array.from(files)); };

  return <main id="main" tabIndex={-1} className="archive-page upload-studio">
    <GalleryHeader />
    <StudioIntro title="Add photographs." note={<>One frame or an entire collection.<br />Original quality, every detail kept.</>}
      actions={<Link href="/admin/unpublished" className="studio-button">Review unpublished</Link>} />

    <section aria-label="Choose photographs" className={`archive-content upload-dropzone ${dragging ? 'is-dragging' : ''}`}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
      <header className="archive-toolbar upload-choose">
        <p><ImagePlus size={15} strokeWidth={1.5} aria-hidden="true" />{dragging ? 'Drop to add' : 'Drop photographs here'}</p>
        <span className="archive-total">JPEG, PNG, WebP, HEIC or HEIF / up to 50 MB each</span>
        <div className="upload-choose-actions">
          <button className="studio-button" disabled={state.restoring} onClick={() => folder.current?.click()}><FolderPlus size={14} strokeWidth={1.5} /> Choose a folder</button>
          <button className="studio-button primary" disabled={state.restoring} onClick={() => input.current?.click()}>Choose photographs</button>
        </div>
      </header>
      <p className="upload-quality-note">Choose, review the details, then publish. Originals are kept untouched; the gallery gets its own display copy.</p>
      <input ref={input} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" aria-label="Choose photographs"
        onChange={event => { addFiles(event.target.files); event.target.value = ''; }} />
      <input ref={folder} type="file" multiple accept={UPLOAD_ACCEPT} {...{ webkitdirectory: '' }} className="hidden" aria-label="Choose a folder"
        onChange={event => { addFiles(event.target.files); event.target.value = ''; }} />

    {state.restoring && <p role="status" className="upload-note">Checking for unfinished uploads…</p>}
    {state.notices.length > 0 && <div className="upload-notices" role="status">
      <ul>{state.notices.map(message => <li key={message}>{message}</li>)}</ul>
      <button aria-label="Dismiss notices" onClick={() => queue?.clearNotices()}><X size={16} /></button>
    </div>}

    {state.items.length > 0 && <>
      <section className="upload-queue-toolbar" aria-label="Upload queue controls">
        <div className="upload-summary" role="status" aria-live="polite">
          <h2>{state.items.length} photograph{state.items.length === 1 ? '' : 's'}</h2>
          <p>{saved.length} published / {ready.length} ready / {busy.length} working / {waiting.length} waiting{failed.length ? ` / ${failed.length} need attention` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="studio-button" onClick={() => state.paused ? queue?.resume() : queue?.pause()}>
            {state.paused ? <Play size={14} /> : <Pause size={14} />}{state.paused ? 'Resume queue' : 'Pause queue'}
          </button>
          {!!failed.length && <button className="studio-button" onClick={() => queue?.retry(failed.map(item => item.id))}><RotateCcw size={14} /> Retry failed ({failed.length})</button>}
          <button className="studio-button primary" disabled={!publishable.length} onClick={() => queue?.publish(publishable.map(item => item.id))}>
            <CheckCheck size={15} /> Publish all ({publishable.length})
          </button>
        </div>
        <div className="upload-progress" role="progressbar" aria-label="Original files uploaded" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <motion.div initial={false} animate={{ width: `${progress}%` }} transition={{ duration: reduceMotion ? 0 : 0.45 }} />
        </div>
        <p className="upload-progress-label">{progress}% uploaded / {sizeLabel(transferred)} of {sizeLabel(totalBytes)}{state.paused ? ' / paused, active photographs will finish' : ''}</p>
      </section>

      <section className="upload-bulk" aria-label="Batch details">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="upload-select-all"><input type="checkbox" checked={editable.length > 0 && selection.length === editable.length}
            onChange={event => setSelected(event.target.checked ? new Set(editable.map(item => item.id)) : new Set())} /> Select all available ({selection.length} selected)</label>
          {!!saved.length && <button className="upload-clear" onClick={() => saved.forEach(item => void queue?.remove(item.id))}>Clear published from queue</button>}
        </div>
        {!!selection.length && <div className="upload-bulk-fields">
          <label>Append tags<input value={bulkTags} onChange={event => setBulkTags(event.target.value)} placeholder="Japan, travel, summer" /></label>
          <label>Location<input maxLength={255} value={bulkLocation} onChange={event => setBulkLocation(event.target.value)} placeholder="Leave unchanged" /></label>
          <label>Visibility<SelectField aria-label="Visibility for selected photographs" value={bulkVisibility} onValueChange={setBulkVisibility} options={[{ value: 'unchanged', label: 'Leave unchanged' }, { value: 'public', label: 'Public' }, { value: 'hidden', label: 'Hidden' }]} /></label>
          <button className="studio-button" onClick={() => queue?.apply(selection.map(item => item.id), {
            ...(bulkTags.trim() ? { tags: parseUploadTags(bulkTags) } : {}), ...(bulkLocation.trim() ? { locationName: bulkLocation.trim() } : {}),
            ...(bulkVisibility !== 'unchanged' ? { hidden: bulkVisibility === 'hidden' } : {}),
          })}>Apply to selected</button>
          <button className="studio-button primary" onClick={() => queue?.publish(selection.map(item => item.id))}>Publish selected</button>
        </div>}
      </section>

      <ul className="upload-items">
        {visible.map(item => <UploadRow key={item.id} item={item} selected={selected.has(item.id)}
          onSelect={checked => setSelected(current => { const next = new Set(current); if (checked) next.add(item.id); else next.delete(item.id); return next; })}
          onChange={values => queue?.edit(item.id, values)} onPublish={() => queue?.publish([item.id])}
          onRetry={() => queue?.retry([item.id])} onRemove={() => void queue?.remove(item.id)} />)}
      </ul>
      {lastPage > 0 && <nav className="upload-pagination" aria-label="Upload queue pages">
        <button className="studio-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <span>Page {currentPage + 1} of {lastPage + 1}</span>
        <button className="studio-button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button>
      </nav>}
      <p className="upload-note">Unfinished photographs are kept in this browser for recovery. Reopen Studio to continue after a refresh.<br />Uploads pause when you leave this page. Published photographs are safe in your gallery.</p>
    </>}
    </section>
  </main>;
}

function UploadRow({ item, selected, onSelect, onChange, onPublish, onRetry, onRemove }: {
  item: UploadItem; selected: boolean; onSelect(checked: boolean): void;
  onChange(values: Partial<Pick<UploadItem, 'title' | 'caption' | 'tags' | 'locationName' | 'hidden'>>): void;
  onPublish(): void; onRetry(): void; onRemove(): void;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const editable = ['queued', 'ready', 'error'].includes(item.status);
  const saving = item.status === 'saving';
  const saved = item.status === 'saved';
  const camera = formatCameraName(item.exif?.make, item.exif?.model);
  const exposure = [item.exif?.focalLength ? `${item.exif.focalLength}mm` : '', item.exif?.fNumber ? `ƒ/${item.exif.fNumber}` : '',
    formatExposureTime(item.exif?.exposureTime), item.exif?.iso ? `ISO ${item.exif.iso}` : ''].filter(Boolean).join(' · ');
  return <li className="upload-row">
    <label className="upload-select"><input type="checkbox" checked={selected} disabled={!editable} onChange={event => onSelect(event.target.checked)} aria-label={`Select ${item.file.name}`} /></label>
    <div className="upload-preview">{previewFailed ? <ImageOff size={24} aria-label="Preview unavailable" /> :
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={item.previewUrl} alt={`Preview of ${item.file.name}`} onError={() => setPreviewFailed(true)} loading="lazy" />}</div>
    <div className="upload-row-body">
      <div className="upload-row-heading"><h3>{item.file.name}</h3><span>{sizeLabel(item.file.size)}</span></div>
      <p className="upload-row-status">{saved && <Check size={13} />}{labels[item.status]}{item.status === 'uploading' ? ` · ${item.progress}%` : ''}{item.publishRequested && !saving && !saved ? ' · Will publish when ready' : ''}</p>
      {item.error && <p className="upload-row-error" role="alert">{item.error}</p>}
      {camera && <p className="upload-exif">{camera}{exposure ? ` / ${exposure}` : ''}</p>}
      {!saved && <details className="upload-edit">
        <summary>Review details</summary>
        <fieldset disabled={!editable} className="upload-edit-fields">
          <label>Title<input maxLength={255} value={item.title} onChange={event => onChange({ title: event.target.value })} placeholder="Untitled" /></label>
          <label>Location<input maxLength={255} value={item.locationName} onChange={event => onChange({ locationName: event.target.value })} placeholder="Optional" /></label>
          <label>Tags<input defaultValue={item.tags.join(', ')} key={item.tags.join(',')} onBlur={event => onChange({ tags: parseUploadTags(event.target.value) })} placeholder="Comma-separated tags" /></label>
          <label>Caption<textarea value={item.caption} onChange={event => onChange({ caption: event.target.value })} rows={2} placeholder="Optional" /></label>
          <label className="upload-visibility"><input type="checkbox" checked={item.hidden} onChange={event => onChange({ hidden: event.target.checked })} /> Keep hidden from the public gallery</label>
        </fieldset>
      </details>}
    </div>
    <div className="upload-row-actions">
      {item.status === 'ready' && <button className="studio-button primary" onClick={onPublish}>Publish</button>}
      {item.status === 'error' && <button className="studio-button" onClick={onRetry}><RotateCcw size={13} /> Retry</button>}
      {saved && item.photoId && !item.hidden && <Link className="studio-button" href={`/p/${item.photoId}`}>View <ArrowUpRight size={13} /></Link>}
      <button className="studio-button icon" disabled={saving} aria-label={`${saved ? 'Clear' : 'Remove'} ${item.file.name}`} onClick={onRemove}><X size={15} /></button>
    </div>
  </li>;
}
function sizeLabel(bytes: number) { return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`; }
