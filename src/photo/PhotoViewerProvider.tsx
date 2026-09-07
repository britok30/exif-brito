'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ZoomablePhoto } from './ZoomablePhoto';
import type { ViewerPhoto } from './viewer-data';

const ViewerContext = createContext<((id: string, event: MouseEvent<HTMLElement>) => void) | null>(null);
export const usePhotoViewer = () => useContext(ViewerContext);
const hashId = () => new URLSearchParams(window.location.hash.slice(1)).get('photo');

export function PhotoViewerProvider({ photos, children }: { photos: ViewerPhoto[]; children: ReactNode }) {
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

  useEffect(() => {
    const restore = () => {
      const id = hashId();
      active.current = id && photos.some(photo => photo.id === id) ? id : null;
      closing.current = false;
      setActiveId(active.current);
    };
    restore();
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore); };
  }, [photos]);

  useEffect(() => {
    if (index < 0) return;
    // Warm only adjacent display copies, never the original files.
    for (const next of [photos[index - 1], photos[index + 1]]) if (next) {
      const image = new window.Image(); image.src = next.src;
    }
  }, [index, photos]);

  function open(id: string, event: MouseEvent<HTMLElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || !photos.some(photo => photo.id === id)) return;
    event.preventDefault();
    if (active.current || closing.current) return;
    opener.current = event.currentTarget;
    origin.current = { x: window.scrollX, y: window.scrollY };
    const image = event.currentTarget.querySelector('img');
    if (image?.currentSrc) previews.current.set(id, image.currentSrc);
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState({ ...window.history.state, britoViewer: { returnUrl } }, '', `#photo=${encodeURIComponent(id)}`);
    active.current = id;
    setActiveId(id);
  }
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
          <div><a href={photo.original} target="_blank" rel="noopener noreferrer">Open original<ArrowUpRight size={14} aria-hidden="true" /></a>
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
          <div><p aria-live="polite" aria-atomic="true">{index >= 0 ? index + 1 : photos.findIndex(p => p.id === photo.id) + 1} / {photos.length}</p>
            <Link href={`/p/${photo.id}`} className="viewer-details-link">Photo details</Link></div>
          <button type="button" disabled={index < 0 || index >= photos.length - 1} onClick={() => navigate(1)} aria-label="Next photograph"><span>Next</span><ArrowRight size={20} strokeWidth={1.25} /></button>
        </footer>
      </DialogContent>}
    </Dialog>
  </ViewerContext.Provider>;
}
