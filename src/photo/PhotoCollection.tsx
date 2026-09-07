'use client';

import { useSearchParams } from 'next/navigation';
import type { Photo } from '@/db';
import { PhotoTile } from './PhotoTile';

export function PhotoCollection({ photos, isAdmin, priority = true }: {
  photos: Array<Photo & { imageSrc: string }>;
  isAdmin?: boolean;
  priority?: boolean;
}) {
  const search = useSearchParams();
  const journal = search.get('view') === 'stacked';
  // The grid itself snaps between layouts; each nearby tile animates its own photograph and caption.
  return <div className={`archive-grid${journal ? ' archive-journal' : ''}`}>
    {photos.map((photo, index) => <PhotoTile key={photo.id} photo={photo} imageSrc={photo.imageSrc}
      journal={journal} isAdmin={isAdmin} priority={priority && index < 3} />)}
  </div>;
}
