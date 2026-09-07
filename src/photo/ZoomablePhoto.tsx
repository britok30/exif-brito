'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { RiCollapseDiagonalLine, RiExpandDiagonalLine } from 'react-icons/ri';
import { motion, useReducedMotion } from 'motion/react';
import type { ViewerPhoto } from './viewer-data';
import { FIT, constrainView, zoomView, swipeDirection, type ViewTransform } from './viewer-geometry';

export function ZoomablePhoto({ photo, preview, navigate }: { photo: ViewerPhoto; preview?: string; navigate(direction: -1 | 1): void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(FIT);
  const [smooth, setSmooth] = useState(false);
  const reduced = useReducedMotion();
  const live = useRef(view);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, pinched: false });
  const tap = useRef({ time: 0, x: 0, y: 0 });
  const lastTouch = useRef(-Infinity);
  function size() {
    const rect = stage.current!.getBoundingClientRect();
    return { width: rect.width, height: rect.height, imageWidth: photo.width, imageHeight: photo.height };
  }
  function update(next: ViewTransform, animate = false) { live.current = next; setSmooth(animate); setView(next); }
  function zoom(scale: number, clientX?: number, clientY?: number, animate = false) {
    const rect = stage.current!.getBoundingClientRect();
    update(zoomView(live.current, scale, { x: (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2,
      y: (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2 }, size()), animate);
  }
  useEffect(() => {
    const element = stage.current!;
    const resize = new ResizeObserver(() => update(constrainView(live.current, size())));
    resize.observe(element);
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) { event.preventDefault(); zoom(live.current.scale * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY); }
      else if (live.current.scale > 1) { event.preventDefault(); update(constrainView({ ...live.current, x: live.current.x - event.deltaX, y: live.current.y - event.deltaY }, size())); }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { resize.disconnect(); element.removeEventListener('wheel', wheel); };
  // Each photograph mounts its own gesture surface.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') lastTouch.current = performance.now();
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!points.current.size) gesture.current = { x: event.clientX, y: event.clientY, pinched: false };
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size > 1) { gesture.current.pinched = true; tap.current.time = 0; }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const previous = points.current.get(event.pointerId);
    if (!previous) return;
    const before = [...points.current.values()];
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size === 2) {
      const after = [...points.current.values()];
      const distance = (p: typeof before) => Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
      const oldDistance = distance(before);
      if (oldDistance < 4) return;
      const mid = { x: (before[0].x + before[1].x) / 2, y: (before[0].y + before[1].y) / 2 };
      zoom(live.current.scale * distance(after) / oldDistance, mid.x, mid.y);
      update(constrainView({ ...live.current, x: live.current.x + (after[0].x + after[1].x) / 2 - mid.x,
        y: live.current.y + (after[0].y + after[1].y) / 2 - mid.y }, size()));
    } else if (points.current.size === 1 && live.current.scale > 1) {
      update(constrainView({ ...live.current, x: live.current.x + event.clientX - previous.x, y: live.current.y + event.clientY - previous.y }, size()));
    }
  }
  function up(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    if (!points.current.has(event.pointerId)) return;
    points.current.delete(event.pointerId);
    if (cancelled) { gesture.current.pinched = true; tap.current.time = 0; return; }
    if (points.current.size) return;
    const dx = event.clientX - gesture.current.x, dy = event.clientY - gesture.current.y;
    const direction = swipeDirection(dx, dy, live.current.scale, gesture.current.pinched);
    if (direction) { tap.current.time = 0; navigate(direction); }
    else if (event.pointerType === 'touch' && !gesture.current.pinched && Math.hypot(dx,dy) < 12) {
      const now = performance.now();
      if (tap.current.time > 0 && now - tap.current.time < 320 && Math.hypot(event.clientX - tap.current.x, event.clientY - tap.current.y) < 30) {
        zoom(live.current.scale > 1 ? 1 : 2, event.clientX, event.clientY, true); tap.current.time = 0;
      } else tap.current = { time: now, x: event.clientX, y: event.clientY };
    }
  }
  return <div className="viewer-photo-shell">
    <div ref={stage} className="viewer-gesture-stage" role="group" tabIndex={0} aria-label="Photograph zoom and pan" data-zoom={view.scale.toFixed(2)} style={{ cursor: view.scale > 1 ? 'grab' : 'zoom-in' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)}
      onLostPointerCapture={event => up(event, true)} onKeyDown={event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          const dx = event.key === 'ArrowLeft' ? 64 : event.key === 'ArrowRight' ? -64 : 0;
          const dy = event.key === 'ArrowUp' ? 64 : event.key === 'ArrowDown' ? -64 : 0;
          update(constrainView({ ...live.current, x: live.current.x + dx, y: live.current.y + dy }, size()), true);
        } else if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          if (event.key === '0') update(FIT, true);
          else zoom(live.current.scale * (event.key === '-' ? 1 / 1.5 : 1.5), undefined, undefined, true);
        }
      }}
      onDoubleClick={event => { if (performance.now() - lastTouch.current > 600) zoom(live.current.scale > 1 ? 1 : 2, event.clientX, event.clientY, true); }}>
      <motion.div className="viewer-transform" initial={false} animate={{ x: view.x, y: view.y, scale: view.scale }} transition={{ duration: smooth && !reduced ? 0.32 : 0, ease: [0.4, 0, 0.2, 1] }}>
        {preview && !loaded && <img className="viewer-preview" src={preview} alt="" aria-hidden="true" draggable={false} />}
        <img key={`display-${attempt}`} className="viewer-full-image" src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable={false}
          style={{ opacity: loaded ? 1 : 0 }} onLoad={() => { setLoaded(true); setFailed(false); }} onError={() => setFailed(true)} />
      </motion.div>
      {!loaded && !failed && <span className="viewer-loading" role="status">Loading photograph…</span>}
    </div>
    {failed && <div className="viewer-load-error" role="alert"><p>This photograph couldn’t load.</p><button type="button" className="studio-button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Try again</button></div>}
    <div className="viewer-zoom-controls" aria-label="Photograph zoom">
      <button type="button" aria-label="Zoom out" disabled={view.scale <= 1} onClick={() => zoom(view.scale / 1.5, undefined, undefined, true)}><RiCollapseDiagonalLine size={18} aria-hidden="true" /></button>
      <button type="button" aria-label="Reset zoom" onClick={() => update(FIT, true)}><RotateCcw size={13} /><span>{Math.round(view.scale * 100)}%</span></button>
      <button type="button" aria-label="Zoom in" disabled={view.scale >= 4} onClick={() => zoom(view.scale * 1.5, undefined, undefined, true)}><RiExpandDiagonalLine size={18} aria-hidden="true" /></button>
    </div>
  </div>;
}
