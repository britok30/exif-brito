'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import IconSearch from '@/components/icons/IconSearch';
import { SelectField } from '@/components/ui/select';

const VISIBILITY: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'hidden', label: 'Hidden' },
];

/**
 * The library's filters, in the toolbar's language: an underlined search, a
 * slash toggle for visibility, and a quiet destination select. Every change
 * navigates, so the URL always describes the selection.
 */
export function LibraryFilters({ q, visibility, location, locations }: { q: string; visibility: string; location: string; locations: string[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const [query, setQuery] = useState(q);
  const hrefFor = (changes: Record<string, string>) => {
    const params = new URLSearchParams();
    const view = search.get('view'); if (view) params.set('view', view);
    const next = { q: query.trim(), visibility, location, ...changes };
    if (next.q) params.set('q', next.q);
    if (next.visibility && next.visibility !== 'all') params.set('visibility', next.visibility);
    if (next.location) params.set('location', next.location);
    return params.size ? `/admin/photos?${params}` : '/admin/photos';
  };
  const submit = (event: FormEvent) => { event.preventDefault(); router.push(hrefFor({})); };
  const filtered = q || location || visibility !== 'all';
  const destinations = [{ value: '', label: 'Everywhere' }, ...locations.map(name => ({ value: name, label: name }))];
  if (location && !locations.includes(location)) destinations.push({ value: location, label: location });

  return <form action="/admin/photos" onSubmit={submit} className="archive-toolbar library-filters" role="search" aria-label="Filter the library">
    <label className="library-search"><span aria-hidden="true"><IconSearch width={24} /></span>
      <input name="q" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search place, title or date" aria-label="Search photographs" />
      {search.get('view') && <input type="hidden" name="view" value={search.get('view') ?? ''} />}
    </label>
    <nav className="slash-toggle" aria-label="Visibility">
      {VISIBILITY.flatMap((option, index) => [
        index > 0 && <span key={`${option.value}-slash`} aria-hidden="true">/</span>,
        <Link key={option.value} href={hrefFor({ visibility: option.value })} aria-current={visibility === option.value ? 'page' : undefined}>{option.label}</Link>,
      ])}
    </nav>
    <div className="library-destination">
      <SelectField aria-label="Destination" name="location" options={destinations} value={location} onValueChange={next => router.push(hrefFor({ location: next }))} />
      {filtered && <Link href="/admin/photos" className="library-clear">Clear</Link>}
    </div>
  </form>;
}
