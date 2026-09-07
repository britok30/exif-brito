import type { Photo } from '@/db';
import { imagePath } from './url';
import { MAX_INLINE_BLUR_LENGTH } from './query';

/**
 * What a gallery tile needs and nothing more. A full photo record is about
 * forty fields; serialising every one for a thousand tiles was most of the
 * home page's weight. Blur placeholders are only kept for the first screens.
 */
export type GalleryPhoto = Pick<Photo,
  'id' | 'title' | 'caption' | 'locationName' | 'tags' | 'takenAtNaive' | 'width' | 'height' | 'aspectRatio' | 'blurData'
  | 'semanticDescription' | 'hidden' | 'url' | 'thumbnailUrl' | 'make' | 'model' | 'lensMake' | 'lensModel'
  | 'focalLength' | 'fNumber' | 'exposureTime' | 'iso' | 'film' | 'recipeData'> & { imageSrc: string };

/** How many tiles from the top of a page keep an inline blur placeholder. */
export const BLUR_TILES = 60;

export function toGalleryPhoto(photo: Photo, blur: boolean): GalleryPhoto {
  return {
    id: photo.id, title: photo.title, caption: photo.caption, locationName: photo.locationName, tags: photo.tags,
    takenAtNaive: photo.takenAtNaive, width: photo.width, height: photo.height, aspectRatio: photo.aspectRatio,
    blurData: blur && photo.blurData && photo.blurData.length <= MAX_INLINE_BLUR_LENGTH ? photo.blurData : null,
    semanticDescription: photo.semanticDescription, hidden: photo.hidden, url: photo.url, thumbnailUrl: photo.thumbnailUrl,
    make: photo.make, model: photo.model, lensMake: photo.lensMake, lensModel: photo.lensModel,
    focalLength: photo.focalLength, fNumber: photo.fNumber, exposureTime: photo.exposureTime, iso: photo.iso,
    film: photo.film, recipeData: photo.recipeData,
    imageSrc: imagePath(photo.thumbnailUrl || photo.url),
  };
}

export const galleryPhotos = (photos: Photo[], blurUpTo = BLUR_TILES): GalleryPhoto[] =>
  photos.map((photo, index) => toGalleryPhoto(photo, index < blurUpTo));
