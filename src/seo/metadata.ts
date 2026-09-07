import type { Metadata } from 'next';
import type { Photo } from '@/db';
import { shortPhotoLocation } from '@/photo/location';
import { absoluteUrl, SITE_NAME, SITE_TITLE } from './site';

type MetadataPhoto = Pick<Photo,'id'|'title'|'caption'|'semanticDescription'|'locationName'|'tags'|'hidden'|'takenAtNaive'>;
export function photoLabel(photo: MetadataPhoto) {
  return photo.title || shortPhotoLocation(photo) || 'Untitled photograph';
}
export function publicMetadata({ title, description, path, photoId }: { title: string; description: string; path: string; photoId?: string }): Metadata {
  const fullTitle = title === SITE_TITLE ? title : `${title} — ${SITE_NAME}`;
  const image = { url: absoluteUrl(photoId ? `/og/${photoId}` : '/og'), width:1200, height:630, alt:title };
  return {
    title: title === SITE_TITLE ? { absolute: title } : title, description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { type:'website', locale:'en_US', siteName:SITE_NAME, title:fullTitle, description, url:absoluteUrl(path), images:[image] },
    twitter: { card:'summary_large_image', title:fullTitle, description, creator:'@kelbrxto', images:[image] },
  };
}
export function photoMetadata(photo: MetadataPhoto | undefined): Metadata {
  if (!photo || photo.hidden) return { title:'Photograph unavailable', robots:{index:false,follow:false}, openGraph:{images:[]},twitter:{images:[]} };
  const label = photoLabel(photo);
  const place = shortPhotoLocation(photo);
  const date = photo.takenAtNaive.slice(0,10);
  return publicMetadata({title:`${label} · ${date}`,description:photo.caption || photo.semanticDescription || `${place ? `A photograph from ${place}` : 'A photograph'} by Brito, captured ${date}. Explore the photograph and its story.`,path:`/p/${photo.id}`,photoId:photo.id});
}
