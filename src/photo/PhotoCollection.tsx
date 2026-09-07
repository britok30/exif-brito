'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PhotoTile } from './PhotoTile';
import { JournalViewContext } from './journal-view';
import type { GalleryPhoto } from './gallery-photo';
import type { PhotoFilter } from './filters';

export interface MorePhotos { year: string; total: number; filter: PhotoFilter }

export function PhotoCollection({ photos, isAdmin, priority = true, more }: {
  photos: GalleryPhoto[];
  isAdmin?: boolean;
  priority?: boolean;
  /** When set, tiles beyond the ones rendered on the server arrive in batches as the reader scrolls. */
  more?: MorePhotos;
}) {
  const search = useSearchParams();
  const journal = search.get('view') === 'stacked';
  const [loaded, setLoaded] = useState<GalleryPhoto[]>([]);
  const all = loaded.length ? [...photos, ...loaded] : photos;
  const remaining = more ? more.total - all.length : 0;
  // The grid's class snaps the layout. Tiles are memoised and take no view
  // prop, so only the nearby ones that subscribe to the context do any work.
  return <JournalViewContext.Provider value={journal}>
    <div className={`archive-grid${journal ? ' archive-journal' : ''}`}>
      {all.map((photo, index) => <PhotoTile key={photo.id} photo={photo} imageSrc={photo.imageSrc}
        isAdmin={isAdmin} priority={priority && index < 3} />)}
    </div>
    {more && remaining > 0 && <LoadMore key={all.length} more={more} offset={all.length} onLoaded={batch => setLoaded(current => [...current, ...batch])} />}
  </JournalViewContext.Provider>;
}

const BATCH = 96;

/** An invisible sentinel a couple of screens below the last tile; when it nears, the next batch is fetched. */
function LoadMore({ more, offset, onLoaded }: { more: MorePhotos; offset: number; onLoaded: (batch: GalleryPhoto[]) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const sentinel = ref.current;
    if (!sentinel) return;
    let cancelled = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const params = new URLSearchParams({ year: more.year, offset: String(offset), limit: String(BATCH) });
      for (const [key, value] of Object.entries(more.filter)) if (value) params.set(key, String(value));
      fetch(`/api/gallery?${params}`, { cache: 'no-store' })
        .then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ photos: GalleryPhoto[] }>; })
        .then(data => { if (!cancelled) onLoaded(data.photos); })
        .catch(() => { if (!cancelled) setFailed(true); });
    }, { rootMargin: '200% 0px' });
    observer.observe(sentinel);
    return () => { cancelled = true; observer.disconnect(); };
  }, [more, offset, onLoaded, attempt]);
  return <div ref={ref} className="archive-more" aria-live="polite">
    {failed ? <button type="button" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>More photographs couldn’t load. Try again</button> : <span>Loading photographs…</span>}
  </div>;
}
