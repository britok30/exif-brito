import type { Photo } from '@/db';
import { imagePath } from './url';
import { shortPhotoLocation } from './location';

export interface ViewerPhoto {
  id: string; title: string; alt: string; src: string; original: string; width: number; height: number;
}
export type ViewerSource = Pick<Photo, 'id' | 'title' | 'locationName' | 'tags' | 'semanticDescription' | 'caption' | 'thumbnailUrl' | 'url' | 'width' | 'height' | 'aspectRatio'>;

export function viewerPhoto(photo: ViewerSource): ViewerPhoto {
  const title = photo.title || shortPhotoLocation(photo) || 'Untitled';
  return { id: photo.id, title, alt: photo.semanticDescription || photo.caption || title,
    src: imagePath(photo.thumbnailUrl || photo.url), original: imagePath(photo.url),
    width: photo.width || 1500, height: photo.height || Math.round(1500 / (photo.aspectRatio || 1.5)) };
}
