'use client';

import { useSearchParams } from 'next/navigation';
import type { Photo } from '@/db';
import { PhotoTile } from './PhotoTile';
import { JournalViewContext } from './journal-view';

export function PhotoCollection({ photos, isAdmin, priority = true }: {
  photos: Array<Photo & { imageSrc: string }>;
  isAdmin?: boolean;
  priority?: boolean;
}) {
  const search = useSearchParams();
  const journal = search.get('view') === 'stacked';
  // The grid's class snaps the layout. Tiles are memoised and take no view
  // prop, so only the nearby ones that subscribe to the context do any work.
  return <JournalViewContext.Provider value={journal}>
    <div className={`archive-grid${journal ? ' archive-journal' : ''}`}>
      {photos.map((photo, index) => <PhotoTile key={photo.id} photo={photo} imageSrc={photo.imageSrc}
        isAdmin={isAdmin} priority={priority && index < 3} />)}
    </div>
  </JournalViewContext.Provider>;
}
