'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import IconSearch from '@/components/icons/IconSearch';
import { loadIndex } from './index-loader';

const SearchPalette = dynamic(() => import('./SearchPalette'), { ssr: false });

interface SearchControls { open(): void; warm(): void }
const SearchContext = createContext<SearchControls>({ open() {}, warm() {} });

/** Single-key shortcuts, available on every public page. */
const SHORTCUTS: Record<string, string> = { g: '/', j: '/?view=stacked', c: '/collections', r: '/random' };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'));

/**
 * A light shell around the search palette: the button, ⌘K and the site's
 * single-key shortcuts. The palette itself (kbar) is loaded on idle or on first
 * use, so it never adds to a page's first load.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [openRequest, setOpenRequest] = useState(0);
  const toggle = useRef<(() => void) | null>(null);
  const register = useCallback((next: (() => void) | null) => { toggle.current = next; }, []);
  const warm = useCallback(() => { setLoaded(true); void loadIndex().catch(() => {}); }, []);
  const open = useCallback(() => {
    if (toggle.current) toggle.current();
    else { warm(); setOpenRequest(n => n + 1); }
  }, [warm]);

  useEffect(() => {
    const idle = window.requestIdleCallback?.(warm, { timeout: 4000 }) ?? window.setTimeout(warm, 2500);
    return () => { window.cancelIdleCallback?.(idle as number); window.clearTimeout(idle as number); };
  }, [warm]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Once loaded, kbar handles ⌘K itself.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !toggle.current) { event.preventDefault(); open(); return; }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === '/') { event.preventDefault(); open(); return; }
      const href = SHORTCUTS[event.key.toLowerCase()];
      if (href && !window.location.pathname.startsWith('/admin')) { event.preventDefault(); router.push(href); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [open, router]);

  const controls = useMemo(() => ({ open, warm }), [open, warm]);
  return <SearchContext.Provider value={controls}>
    {children}
    {loaded && <SearchPalette openRequest={openRequest} register={register} />}
  </SearchContext.Provider>;
}

export function SearchButton() {
  const { open, warm } = useContext(SearchContext);
  return <button type="button" className="gallery-icon-link" aria-label="Search photographs" title="Search photographs (⌘K / Ctrl+K or /)"
    onPointerEnter={warm} onFocus={warm} onClick={open}>
    <span aria-hidden="true"><IconSearch /></span>
  </button>;
}
