'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';

const STORAGE_KEY = 'brito-library-selection';
const SelectionContext = createContext<{
  selected: Set<string>; toggle: (id: string) => void; pending: boolean;
} | null>(null);

export function LibrarySelection({ hiddenIds, children }: { hiddenIds: string[]; children: ReactNode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const eligible = new Set(hiddenIds);
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      setSelected(new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string' && eligible.has(id)) : []));
    } catch { /* Selection still works when browser storage is unavailable. */ }
    setReady(true);
  }, [hiddenIds]);
  function save(next: Set<string>) {
    setSelected(next);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* Keep in memory. */ }
  }
  function toggle(id: string) {
    if (pending || !ready) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    save(next); setMessage(''); setError('');
  }
  async function publish() {
    if (pending || !selected.size) return;
    setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/photos/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try publishing again.');
      save(new Set());
      setMessage(result.published.length ? `${result.published.length} photograph${result.published.length === 1 ? '' : 's'} published.` : 'These photographs are already published or no longer available.');
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Your selection is saved. Please try again.'); }
    finally { setPending(false); }
  }
  return <SelectionContext.Provider value={{ selected, toggle, pending: pending || !ready }}>
    {hiddenIds.length > 0 && <motion.div className="library-selection-bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.4 }}>
      <div><p aria-live="polite">{selected.size ? `${selected.size} selected` : 'Choose your photographs.'}</p>
        <span>{selected.size ? 'Your selection stays with you across pages and destinations.' : 'Select the ones you love, then publish when you’re ready.'}</span></div>
      <div className="library-selection-actions">
        {selected.size > 0 && <button type="button" className="studio-button" disabled={pending} onClick={() => save(new Set())}>Clear selection</button>}
        <button type="button" className="studio-button primary" disabled={pending || !ready || !selected.size} onClick={publish}>{pending ? 'Publishing…' : `Publish selected${selected.size ? ` (${selected.size})` : ''}`}</button>
      </div>
      {message && <p className="library-selection-message" role="status">{message}</p>}
      {error && <p className="library-selection-message" role="alert">{error}</p>}
    </motion.div>}
    {children}
  </SelectionContext.Provider>;
}

export function LibrarySelectPhoto({ id, label }: { id: string; label: string }) {
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  const checked = selection.selected.has(id);
  return <label className={`library-select-photo${checked ? ' is-selected' : ''}`}>
    <input type="checkbox" checked={checked} disabled={selection.pending} onChange={() => selection.toggle(id)} aria-label={`Select ${label} (${id})`} />
    {checked ? 'Selected' : 'Select photograph'}
  </label>;
}
