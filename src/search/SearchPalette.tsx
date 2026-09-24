'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { KBarProvider, KBarPortal, KBarPositioner, KBarAnimator, KBarSearch,
  KBarResults, useKBar, useMatches, useRegisterActions, VisualState } from 'kbar';
import { useReducedMotion } from 'motion/react';
import IconSearch from '@/components/icons/IconSearch';
import { loadIndex } from './index-loader';
import type { SearchEntry } from './types';

/**
 * The ⌘K palette. It is its own chunk, loaded when the browser is idle or the
 * visitor first reaches for search, so kbar never weighs on a page's first load.
 */
export default function SearchPaletteRoot({ openRequest, register }: { openRequest: number; register(toggle: (() => void) | null): void }) {
  const reduced = useReducedMotion();
  return <KBarProvider options={{ animations: { enterMs: reduced ? 0 : 220, exitMs: reduced ? 0 : 180 } }}>
    <Bridge openRequest={openRequest} register={register} /><SearchPalette />
  </KBarProvider>;
}

/** Hands the palette's toggle to the light shell, and opens it if the visitor asked before it had loaded. */
function Bridge({ openRequest, register }: { openRequest: number; register(toggle: (() => void) | null): void }) {
  const { query } = useKBar();
  useEffect(() => {
    register(() => query.toggle());
    return () => register(null);
  }, [query, register]);
  useEffect(() => {
    if (openRequest > 0) query.setVisualState(state => state === VisualState.hidden || state === VisualState.animatingOut ? VisualState.animatingIn : state);
  }, [openRequest, query]);
  return null;
}

// Shortcuts are handled by the shell (so they work before this chunk loads); here they are only shown.
const EXPLORE = [
  { id: 'navigation:gallery', name: 'Gallery', path: '/', subtitle: 'G' },
  { id: 'navigation:journal', name: 'Journal', path: '/?view=stacked', subtitle: 'J' },
  { id: 'navigation:collections', name: 'Collections', path: '/collections', subtitle: 'C' },
  { id: 'navigation:random', name: 'A random photograph', path: '/random', subtitle: 'R' },
];

function SearchPalette() {
  const router = useRouter();
  const { query, open, typed } = useKBar(state => ({
    open: state.visualState === VisualState.showing || state.visualState === VisualState.animatingIn,
    typed: state.searchQuery.trim().length > 0,
  }));
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus(entries.length ? 'ready' : 'loading');
    loadIndex().then(data => { if (!cancelled) { setEntries(data); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  const explore = useMemo(() => EXPLORE.map(item => ({ ...item, section: { name: 'Explore', priority: 3 }, perform: () => router.push(item.path) })), [router]);
  const collections = useMemo(() => entries.filter(entry => entry.section === 'Collections')
    .map(entry => ({ ...entry, section: { name: 'Collections', priority: 2 }, perform: () => router.push(entry.path) })), [entries, router]);
  // Photographs join the list once the visitor types, so an empty palette is a short menu rather than 800 rows.
  const photographs = useMemo(() => !typed ? [] : entries.filter(entry => entry.section === 'Photographs')
    .map(entry => ({ ...entry, section: { name: 'Photographs', priority: 1 },
      icon: entry.image ? <Image src={entry.image} alt="" fill sizes="44px" quality={60} unoptimized={!entry.image.startsWith('/')} /> : null,
      perform: () => router.push(entry.path) })), [entries, typed, router]);
  useRegisterActions(explore, [explore]);
  useRegisterActions(collections, [collections]);
  useRegisterActions(photographs, [photographs]);

  return <KBarPortal><KBarPositioner className="search-positioner">
    <KBarAnimator className="search-palette">
      <div className="search-input-row"><span aria-hidden="true"><IconSearch width={20} /></span>
        <KBarSearch defaultPlaceholder="Search a place, title, date, camera or film" aria-label="Search photographs, places, collections" className="search-input" />
        <button type="button" className="search-close" aria-label="Close search" onClick={() => query.toggle()}>Esc</button>
      </div>
      <div className="search-feedback" role="status">
        {status === 'loading' && 'Finding photographs…'}
        {status === 'error' && <span>Search couldn’t load. <button type="button" onClick={() => setAttempt(n => n + 1)}>Try again</button></span>}
      </div>
      <SearchResults ready={status === 'ready'} typed={typed} total={entries.filter(entry => entry.section === 'Photographs').length} />
      <footer className="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>↵</kbd> Open</span><span><kbd>Esc</kbd> Close</span></footer>
    </KBarAnimator>
  </KBarPositioner></KBarPortal>;
}

const sectionName = (section: unknown) => typeof section === 'string' ? section : (section as { name?: string } | undefined)?.name;

function SearchResults({ ready, typed, total }: { ready: boolean; typed: boolean; total: number }) {
  const { results } = useMatches();
  const photographsShown = results.filter(item => typeof item !== 'string' && sectionName(item.section) === 'Photographs').length;
  return <>
    {ready && !typed && <p className="search-hint">{total} photographs. Type to search them.</p>}
    {ready && typed && !results.length && <p className="search-empty" role="status">Nothing matches. Try a place, a month, or a camera.</p>}
    <KBarResults items={results} maxHeight={380} onRender={({ item, active }) => typeof item === 'string'
      ? <div className="search-section">{item}{item === 'Photographs' && photographsShown > 0 ? <span>{photographsShown}</span> : null}</div>
      : <div className={`search-result${active ? ' is-active' : ''}`}>
        {sectionName(item.section) === 'Photographs' && <span className="search-thumb">{item.icon}</span>}
        <span className="search-result-copy"><span>{item.name}</span>{item.subtitle && item.subtitle !== 'Collection' && sectionName(item.section) !== 'Explore' && <small>{item.subtitle}</small>}</span>
        {sectionName(item.section) === 'Explore' && item.subtitle && <kbd className="search-shortcut" title={`Shortcut: ${item.subtitle}`}>{item.subtitle}</kbd>}
      </div>} />
  </>;
}
