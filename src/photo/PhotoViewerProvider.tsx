'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ZoomablePhoto } from './ZoomablePhoto';
import { isViewerPhoto, type ViewerPhoto } from './viewer-data';
import { SharePhotoButton } from './SharePhotoButton';

type OpenViewer = (id: string, event: MouseEvent<HTMLElement>, photo?: ViewerPhoto) => void;
const ViewerContext = createContext<OpenViewer | null>(null);
export const usePhotoViewer = () => useContext(ViewerContext);
const hashId = () => new URLSearchParams(window.location.hash.slice(1)).get('photo');

/**
 * The full-screen viewer for a page of photographs. Its running order comes
 * from `listUrl` once the page is idle (or the moment it is needed), so pages
 * never serialise the whole archive; a tile opened before then passes its own
 * entry and the viewer starts with that. `seed` covers pages with a known,
 * small list, such as a private photograph.
 */
// One request per list for the whole visit: photograph pages share the
// unfiltered list, and a filter's list is fetched once. A failure is forgotten.
const lists = new Map<string, Promise<ViewerPhoto[]>>();
function fetchList(url: string): Promise<ViewerPhoto[]> {
  let promise = lists.get(url);
  if (!promise) {
    promise = fetch(url)
      .then(response => { if (!response.ok) throw new Error('Viewer list unavailable'); return response.json() as Promise<unknown>; })
      .then(data => { if (!Array.isArray(data) || !data.every(isViewerPhoto)) throw new Error('Invalid viewer list'); return data; })
      .catch(error => { lists.delete(url); throw error; });
    lists.set(url, promise);
  }
  return promise;
}

export function PhotoViewerProvider({ listUrl, seed, children }: { listUrl?: string | null; seed?: ViewerPhoto[]; children: ReactNode }) {
  // State is tagged with the list it belongs to, so a filter change (which keeps
  // this provider mounted) never shows the previous selection's order.
  const [loaded, setLoaded] = useState<{ url: string; photos: ViewerPhoto[] } | null>(null);
  const [handed, setHanded] = useState<{ url: string | null; photos: ViewerPhoto[] }>({ url: listUrl ?? null, photos: [] });
  const list = useMemo(() => !listUrl ? seed ?? [] : loaded?.url === listUrl ? loaded.photos : null, [listUrl, loaded, seed]);
  const pending = useMemo(() => {
    const extra = handed.url === (listUrl ?? null) ? handed.photos : [];
    return [...(seed ?? []).filter(photo => !extra.some(entry => entry.id === photo.id)), ...extra];
  }, [handed, listUrl, seed]);
  // A tile's own entry keeps the viewer open even if the list has not arrived,
  // or arrived without it (a photograph published a moment ago).
  const photos = useMemo(() => {
    if (!list) return pending;
    const missing = pending.filter(photo => !list.some(entry => entry.id === photo.id));
    return missing.length ? [...list, ...missing] : list;
  }, [list, pending]);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useRef<string | null>(null);
  const closing = useRef(false);
  const lastPhoto = useRef<ViewerPhoto | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const previews = useRef(new Map<string, string>());
  const reduced = useReducedMotion();
  const index = photos.findIndex(photo => photo.id === activeId);
  const selected = photos[index];
  if (selected) lastPhoto.current = selected;
  const photo = selected || lastPhoto.current;

  const load = useCallback(() => {
    if (!listUrl) return;
    // The viewer keeps working with what it has if the list cannot load; the next open retries.
    fetchList(listUrl).then(photos => setLoaded({ url: listUrl, photos }), () => {});
  }, [listUrl]);

  useEffect(() => {
    if (!listUrl) return;
    if (hashId()) { load(); return; }
    const idle = window.requestIdleCallback?.(load, { timeout: 5000 }) ?? window.setTimeout(load, 3000);
    return () => { window.cancelIdleCallback?.(idle as number); window.clearTimeout(idle as number); };
  }, [listUrl, load]);

  useEffect(() => {
    const restore = () => {
      const id = hashId();
      // A shared #photo= link waits for the list; retry it if an earlier load failed.
      if (id && !list) load();
      active.current = id && photos.some(photo => photo.id === id) ? id : null;
      closing.current = false;
      setActiveId(active.current);
    };
    restore();
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore); };
  }, [photos, list, load]);

  useEffect(() => {
    if (index < 0) return;
    // Warm only adjacent display copies, never the original files.
    for (const next of [photos[index - 1], photos[index + 1]]) if (next) {
      const image = new window.Image(); image.src = next.src;
    }
  }, [index, photos]);

  // Stable across renders, so the hundreds of memoised tiles that consume it are not re-rendered when the viewer opens.
  const open = useCallback<OpenViewer>((id, event, entry) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const known = photosRef.current.some(photo => photo.id === id);
    // Without an entry for this photograph yet, the link simply opens its page.
    if (!known && !entry) return;
    event.preventDefault();
    if (active.current || closing.current) return;
    if (!known && entry) setHanded(previous => ({ url: listUrl ?? null,
      photos: [...(previous.url === (listUrl ?? null) ? previous.photos : []).filter(photo => photo.id !== id), entry] }));
    load();
    opener.current = event.currentTarget;
    origin.current = { x: window.scrollX, y: window.scrollY };
    const image = event.currentTarget.querySelector('img');
    if (image?.currentSrc) previews.current.set(id, image.currentSrc);
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState({ ...window.history.state, britoViewer: { returnUrl } }, '', `#photo=${encodeURIComponent(id)}`);
    active.current = id;
    setActiveId(id);
  }, [load, listUrl]);
  function close() {
    if (!active.current || closing.current) return;
    closing.current = true;
    active.current = null;
    setActiveId(null);
    if (window.history.state?.britoViewer) window.history.back();
    else window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
  function navigate(direction: -1 | 1) {
    const currentIndex = photos.findIndex(photo => photo.id === active.current);
    const next = photos[currentIndex + direction];
    if (!next || currentIndex < 0 || closing.current) return;
    const thumbnail = document.querySelector<HTMLImageElement>(`[data-photo-id="${CSS.escape(next.id)}"] img`);
    if (thumbnail?.complete && thumbnail.naturalWidth) previews.current.set(next.id, thumbnail.currentSrc);
    window.history.replaceState(window.history.state, '', `#photo=${encodeURIComponent(next.id)}`);
    active.current = next.id;
    setActiveId(next.id);
  }
  return <ViewerContext.Provider value={open}>
    {children}
    <Dialog open={activeId !== null && index >= 0} onOpenChange={open => { if (!open) close(); }} onOpenChangeComplete={open => {
      if (!open) closing.current = false;
      if (!open && opener.current?.isConnected) {
        opener.current.focus({ preventScroll: true });
        window.scrollTo({ left: origin.current.x, top: origin.current.y, behavior: 'instant' });
      }
    }}>
      {photo && <DialogContent className="photo-viewer immersive-viewer top-0 left-0 translate-x-0 translate-y-0" showCloseButton={false}
        finalFocus={() => opener.current || document.getElementById('main')} onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); navigate(event.key === 'ArrowRight' ? 1 : -1); }
        }}>
        <header className="photo-viewer-toolbar">
          <DialogTitle className="gallery-label">{photo.title}</DialogTitle>
          <div>
            <SharePhotoButton key={photo.id} id={photo.id} title={photo.title} />
            <button type="button" className="photo-viewer-close" aria-label="Close photograph" onClick={close}><X size={22} strokeWidth={1.25} /></button></div>
        </header>
        <DialogDescription className="sr-only">Use left and right arrows or swipe to browse. Pinch, double-tap, or use the zoom buttons to enlarge; drag to pan. When the image is focused, use plus or minus to zoom, zero to reset, and Shift with arrow keys to pan. Escape closes the viewer and returns to where you opened it.</DialogDescription>
        <div className="viewer-scene">
          <AnimatePresence initial={false} mode="wait">
            <motion.div className="viewer-scene-photo" key={photo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.28 }}>
              <ZoomablePhoto photo={photo} preview={previews.current.get(photo.id)} navigate={navigate} />
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="viewer-navigation">
          <button type="button" disabled={index <= 0} onClick={() => navigate(-1)} aria-label="Previous photograph"><ArrowLeft size={20} strokeWidth={1.25} /><span>Previous</span></button>
          <div><p aria-live="polite" aria-atomic="true">{list ? `${index >= 0 ? index + 1 : photos.findIndex(p => p.id === photo.id) + 1} / ${photos.length}` : '\u00a0'}</p>
            <Link href={`/p/${photo.id}`} className="viewer-details-link">Photo details</Link></div>
          <button type="button" disabled={index < 0 || index >= photos.length - 1} onClick={() => navigate(1)} aria-label="Next photograph"><span>Next</span><ArrowRight size={20} strokeWidth={1.25} /></button>
        </footer>
      </DialogContent>}
    </Dialog>
  </ViewerContext.Provider>;
}
