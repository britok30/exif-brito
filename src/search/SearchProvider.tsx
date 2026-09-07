'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { KBarProvider, KBarPortal, KBarPositioner, KBarAnimator, KBarSearch,
  KBarResults, useKBar, useMatches, useRegisterActions, VisualState } from 'kbar';
import { useReducedMotion } from 'motion/react';
import IconSearch from '@/components/icons/IconSearch';
import { isSearchEntry } from './entries';
import type { SearchEntry } from './types';

export function SearchProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <KBarProvider options={{ animations: { enterMs: reduced ? 0 : 220, exitMs: reduced ? 0 : 180 } }}>
    {children}<SearchPalette />
  </KBarProvider>;
}

export function SearchButton() {
  const { query } = useKBar();
  return <button type="button" className="gallery-icon-link" aria-label="Search photographs" title="Search photographs (⌘K / Ctrl+K)" onClick={() => query.toggle()}>
    <span aria-hidden="true"><IconSearch /></span>
  </button>;
}

function SearchPalette() {
  const router = useRouter();
  const { query, open } = useKBar(state => ({ open: state.visualState === VisualState.showing || state.visualState === VisualState.animatingIn }));
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    setStatus('loading');
    setEntries([]);
    const timeout = window.setTimeout(() => {
      abort.abort();
      setEntries([]);
      setStatus('error');
    }, 12000);
    fetch('/api/search', { signal: abort.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json() as Promise<unknown>; })
      .then(data => {
        if (abort.signal.aborted) return;
        if (!Array.isArray(data) || !data.every(isSearchEntry)) throw new Error('Invalid search response');
        setEntries(data); setStatus('ready');
      })
      .catch(() => { if (!abort.signal.aborted) { setEntries([]); setStatus('error'); } })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); abort.abort(); };
  }, [open, attempt]);
  const actions = useMemo(() => [
    { id: 'navigation:gallery', name: 'Gallery', section: { name: 'Explore', priority: 3 }, perform: () => router.push('/') },
    { id: 'navigation:journal', name: 'Journal', section: { name: 'Explore', priority: 3 }, perform: () => router.push('/?view=stacked') },
    { id: 'navigation:collections', name: 'Collections', section: { name: 'Explore', priority: 3 }, perform: () => router.push('/collections') },
    ...entries.map(entry => ({ ...entry,
      section: { name: entry.section, priority: entry.section === 'Collections' ? 2 : 1 },
      perform: () => router.push(entry.path) })),
  ], [entries, router]);
  useRegisterActions(actions, [actions]);
  return <KBarPortal><KBarPositioner className="search-positioner">
    <KBarAnimator className="search-palette">
      <div className="search-input-row"><span aria-hidden="true"><IconSearch /></span>
        <KBarSearch defaultPlaceholder="Search photographs and places…" aria-label="Search photographs, places, collections" className="search-input" />
        <button type="button" className="search-close" aria-label="Close search" onClick={() => query.toggle()}>Esc</button>
      </div>
      <div className="search-feedback" role="status">
        {status === 'loading' && 'Finding photographs…'}
        {status === 'error' && <span>Search couldn’t load. <button type="button" onClick={() => setAttempt(n => n + 1)}>Try again</button></span>}
      </div>
      <SearchResults ready={status === 'ready'} />
      <footer className="search-footer"><span>↑ ↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></footer>
    </KBarAnimator>
  </KBarPositioner></KBarPortal>;
}

function SearchResults({ ready }: { ready: boolean }) {
  const { results } = useMatches();
  return <>
    {ready && !results.length && <p className="search-empty" role="status">No photographs found. Try another place or title.</p>}
    <KBarResults items={results} maxHeight={380} onRender={({ item, active }) => typeof item === 'string'
      ? <div className="search-section">{item}</div>
      : <div className={`search-result${active ? ' is-active' : ''}`}>
        <span className="search-result-copy"><span>{item.name}</span>{item.subtitle && <small>{item.subtitle}</small>}</span>
        <span className="search-result-arrow" aria-hidden="true">↗</span>
      </div>} />
  </>;
}
