'use client';

import { useEffect, useId, useState } from 'react';
import { MapPin } from 'lucide-react';
import IconSearch from '@/components/icons/IconSearch';
import { Input } from '@/components/ui/input';

interface Suggestion { id: string; text: string; main: string; secondary: string }
export function LocationInput({ value, onChange }: { value: string; onChange(value: string): void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || query.trim().length < 2) { setSuggestions([]); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setSuggestions([]); setActive(-1);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?input=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Location search is unavailable. Enter a location manually.');
        if (!controller.signal.aborted) setSuggestions(data.suggestions || []);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Enter a location manually.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);
  function choose(suggestion: Suggestion) { onChange(suggestion.text); setOpen(false); setQuery(''); setActive(-1); }
  const expanded = open && query.trim().length >= 2;
  return <div className="location-search">
    <label htmlFor={id}>Location</label>
    <div className="location-search-field"><span aria-hidden="true"><IconSearch width={24} /></span>
      <Input id={id} value={value} maxLength={255} autoComplete="off" placeholder="Search a city or address"
        role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-list`}
        aria-activedescendant={expanded && active >= 0 && suggestions[active] ? `${id}-${active}` : undefined}
        onChange={event => { onChange(event.target.value); setQuery(event.target.value); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={event => {
          if (event.key === 'Escape' && expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if (expanded && suggestions.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault(); setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
          }
          if (event.key === 'Enter' && expanded) { event.preventDefault(); if (active >= 0 && suggestions[active]) choose(suggestions[active]); }
        }} />
    </div>
    {expanded && <div className="location-results">
      <div id={`${id}-list`} role="listbox" aria-label="Suggested locations">
        {suggestions.map((suggestion, index) => <button key={suggestion.id} id={`${id}-${index}`} type="button" role="option" tabIndex={-1}
          aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => choose(suggestion)}>
          <MapPin size={14} aria-hidden="true" /><span><strong>{suggestion.main}</strong>{suggestion.secondary && <small>{suggestion.secondary}</small>}</span>
        </button>)}
      </div>
      {loading && <p role="status">Searching locations…</p>}
      {error && <p role="status">{error}</p>}
      {!loading && !error && !suggestions.length && <p role="status">No suggestions. You can keep the location you typed.</p>}
      {!!suggestions.length && <div className="google-attribution" translate="no">Google Maps</div>}
    </div>}
  </div>;
}
