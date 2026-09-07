'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { collectionSlug } from './validation';

type Entry = { id: string; title: string; src: string; hidden: boolean };
type Collection = { id: string; title: string; slug: string; description: string; photoIds: string[] };
export function CollectionStudio({ initial, photos }: { initial: Collection[]; photos: Entry[] }) {
  const [collections, setCollections] = useState(initial);
  const [draft, setDraft] = useState<Collection | null>(null);
  const [saved, setSaved] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const reduced = useReducedMotion();
  const dirty = !!draft && JSON.stringify(draft) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a[href]');
      if (link && !event.metaKey && !event.ctrlKey && !window.confirm('Leave without saving this collection?')) event.preventDefault();
    };
    window.addEventListener('beforeunload', prevent); document.addEventListener('click', leave, true);
    return () => { window.removeEventListener('beforeunload', prevent); document.removeEventListener('click', leave, true); };
  }, [dirty]);
  function edit(value: Collection | null) {
    if (busy || (dirty && !window.confirm('Discard unsaved collection changes?'))) return;
    setDraft(value); setSaved(JSON.stringify(value)); setMessage(''); setSearch('');
  }
  function update(fields: Partial<Collection>) { setDraft(current => current && ({ ...current, ...fields })); setMessage(''); }
  function move(index: number, direction: number) {
    if (!draft) return;
    const ids = [...draft.photoIds]; const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]]; update({ photoIds: ids });
  }
  async function save(remove = false) {
    if (!draft || saving.current) return;
    if (remove && !window.confirm(`Remove “${draft.title}”? Its photographs will remain in your library.`)) return;
    saving.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/collections/${draft.id}`, { method: remove ? 'DELETE' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: remove ? undefined : JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      if (remove) { setCollections(list => list.filter(item => item.id !== draft.id)); setDraft(null); setSaved(''); setMessage('Collection removed. Your photographs are unchanged.'); }
      else { setCollections(list => [draft, ...list.filter(item => item.id !== draft.id)]); setSaved(JSON.stringify(draft)); setMessage('Collection saved. Visible photographs are now available on its public page.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Couldn’t save. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  }
  const byId = new Map(photos.map(photo => [photo.id, photo]));
  const selected = new Set(draft?.photoIds);
  const available = photos.filter(photo => !selected.has(photo.id) && `${photo.title} ${photo.id}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="series-studio">
    <div className="series-studio-list"><button className="studio-button primary" disabled={busy} onClick={() => edit({ id: crypto.randomUUID(), title: '', slug: '', description: '', photoIds: [] })}>New collection</button>
      {collections.map(item => <button key={item.id} className="series-list-item" aria-pressed={draft?.id === item.id} disabled={busy} onClick={() => edit({ ...item, photoIds: [...item.photoIds] })}><span>{item.title}</span><span>{item.photoIds.length}</span></button>)}
    </div>
    <div>{!draft ? <p className="series-start">Choose a collection to edit, or start a new one.</p> : <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy} className="series-editor">
        <div className="series-fields"><label>Title<input required maxLength={255} value={draft.title} onChange={event => update({ title: event.target.value, ...(draft.slug === collectionSlug(draft.title) ? { slug: collectionSlug(event.target.value) } : {}) })} /></label>
          <label>URL name<input required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => update({ slug: event.target.value })} /><small>/collections/{draft.slug || 'your-series'}</small></label>
          <label className="series-description-field">Introduction<textarea rows={3} maxLength={5000} value={draft.description} onChange={event => update({ description: event.target.value })} /></label></div>
        <div className="series-section-heading"><h2>Your sequence · {draft.photoIds.length}</h2><p>The first visible photograph is the cover.</p></div>
        <ol className="series-sequence">{draft.photoIds.map((id, index) => {
          const photo = byId.get(id); if (!photo) return null;
          return <motion.li layout={!reduced} transition={{ duration: .35 }} key={id}><Image src={photo.src} alt="" width={64} height={64} unoptimized={!photo.src.startsWith('/')} /><div><p>{photo.title}</p><small>{index + 1}{photo.hidden ? ' · Hidden from visitors' : ''}</small></div>
            <button type="button" aria-label={`Move ${photo.title} earlier`} disabled={index === 0 || busy} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
            <button type="button" aria-label={`Move ${photo.title} later`} disabled={index === draft.photoIds.length - 1 || busy} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
            <button type="button" aria-label={`Remove ${photo.title} from collection`} onClick={() => update({ photoIds: draft.photoIds.filter(value => value !== id) })}><X size={16} /></button></motion.li>;
        })}</ol>
        {!draft.photoIds.length && <p className="series-start">Select photographs below to begin your sequence.</p>}
        <div className="series-section-heading"><h2>Add photographs</h2><label className="sr-only" htmlFor="series-search">Search photographs by title or location</label><input id="series-search" type="search" placeholder="Search title or location" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className="series-picker">{available.map(photo => <button key={photo.id} type="button" aria-label={`Add ${photo.title}`} onClick={() => { setDraft(current => current && !current.photoIds.includes(photo.id) ? { ...current, photoIds: [...current.photoIds, photo.id] } : current); setMessage(''); }}>
          <Image src={photo.src} alt="" width={160} height={120} sizes="(max-width: 700px) 40vw, 160px" unoptimized={!photo.src.startsWith('/')} /><span>{photo.title}</span>{photo.hidden && <small>Hidden</small>}</button>)}
          {!available.length && <p>No more photographs in this selection.</p>}</div>
        <div className="series-save"><button type="submit" className="studio-button primary" disabled={busy || !dirty || !draft.photoIds.length}>{busy ? 'Saving…' : 'Save collection'}</button>
          <button type="button" className="studio-button" onClick={() => edit(null)}>Cancel</button>
          {collections.some(item => item.id === draft.id) && <><Link href={`/collections/${collections.find(item => item.id === draft.id)!.slug}`} className="studio-button">View collection</Link><button type="button" className="studio-button" onClick={() => void save(true)}>Remove collection</button></>}
        </div>
      </fieldset>
    </form>}<p role="status" className="series-status">{message}</p></div>
  </div>;
}
