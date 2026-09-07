'use client';

import Link from 'next/link';
import IconGrid from '@/components/icons/IconGrid';
import IconStacked from '@/components/icons/IconStacked';
import { usePathname, useSearchParams } from 'next/navigation';
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { LAYOUT_TRANSITION } from './PhotoTile';
import type { PhotoView } from './view';

interface Anchor { id: string; top: number }

export function ViewSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') === 'stacked' ? 'stacked' : 'grid';
  const reduceMotion = useReducedMotion();
  const anchor = useRef<Anchor | null>(null);
  const scrolling = useRef<ReturnType<typeof animate> | null>(null);

  const hrefFor = (target: PhotoView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target === 'grid') params.delete('view');
    else params.set('view', target);
    return params.size ? `${pathname}?${params}` : pathname;
  };

  // Remember which photograph sits at the top of the screen, so the page can
  // follow it while the layout around it changes size.
  const rememberAnchor = () => {
    for (const tile of document.querySelectorAll<HTMLElement>('.archive-tile')) {
      const { top, bottom } = tile.getBoundingClientRect();
      if (bottom > 0 && tile.dataset.photoId) { anchor.current = { id: tile.dataset.photoId, top }; return; }
    }
    anchor.current = null;
  };

  useEffect(() => {
    const stop = () => scrolling.current?.stop();
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    return () => { stop(); window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); };
  }, []);

  useLayoutEffect(() => {
    const remembered = anchor.current;
    anchor.current = null;
    if (!remembered) return;
    const tile = document.querySelector<HTMLElement>(`.archive-tile[data-photo-id="${remembered.id}"]`);
    if (!tile) return;
    const from = window.scrollY;
    const limit = document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.max(0, Math.min(limit, from + tile.getBoundingClientRect().top - remembered.top));
    if (Math.abs(to - from) < 1) return;
    scrolling.current?.stop();
    if (reduceMotion) { window.scrollTo({ top: to, behavior: 'instant' }); return; }
    // Same curve as the tiles, so the anchored photograph holds still while everything else moves.
    scrolling.current = animate(from, to, { ...LAYOUT_TRANSITION, onUpdate: top => window.scrollTo({ top, behavior: 'instant' }) });
  }, [view, reduceMotion]);

  const link = (target: PhotoView, label: string) => <a href={hrefFor(target)}
    onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (view === target) return;
      rememberAnchor();
      window.history.pushState(null, '', hrefFor(target));
    }} aria-label={label} title={label} aria-current={view === target ? 'page' : undefined}><span aria-hidden="true">{target === 'grid' ? <IconGrid /> : <IconStacked />}</span></a>;

  return <nav aria-label="Gallery layout" className="archive-view-switch slash-toggle">
    {link('grid', 'Gallery')}<span aria-hidden="true">/</span>{link('stacked', 'Journal')}
  </nav>;
}

export function ClearPhotoSelection({ children, className }: { children: ReactNode; className?: string }) {
  const search = useSearchParams();
  return <Link href={search.get('view') === 'stacked' ? '/?view=stacked' : '/'} className={className}>{children}</Link>;
}

export function PreservePhotoView() {
  const search = useSearchParams();
  return search.get('view') === 'stacked' ? <input type="hidden" name="view" value="stacked" /> : null;
}
