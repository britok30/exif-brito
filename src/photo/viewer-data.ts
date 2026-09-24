import type { Photo } from '@/db';
import { shortPhotoLocation } from './location';

export interface ViewerPhoto {
  id: string; title: string; alt: string; src: string; width: number; height: number;
}
export type ViewerSource = Pick<Photo, 'id' | 'title' | 'locationName' | 'tags' | 'semanticDescription' | 'caption' | 'width' | 'height' | 'aspectRatio'>
  & { imageSrc: string };

/** Pure, so tiles can build their own entry on the client from the record they already hold. */
export function viewerPhoto(photo: ViewerSource): ViewerPhoto {
  const title = photo.title || shortPhotoLocation(photo) || 'Untitled';
  return { id: photo.id, title, alt: photo.semanticDescription || photo.caption || title,
    src: photo.imageSrc,
    width: photo.width || 1500, height: photo.height || Math.round(1500 / (photo.aspectRatio || 1.5)) };
}

export const isViewerPhoto = (value: unknown): value is ViewerPhoto => {
  const item = value as ViewerPhoto | null;
  return item !== null && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.alt === 'string' &&
    typeof item.src === 'string' && typeof item.width === 'number' && typeof item.height === 'number';
};
