import type { Photo } from '@/db';
import { shortPhotoLocation } from '@/photo/location';

type DestinationPhoto = Pick<Photo, 'id' | 'hidden' | 'locationName' | 'tags' | 'takenAt'>;
type DestinationAlbum = { id: string; location: unknown };
type Member = { albumId: string; photoId: string; sortOrder: number };

export function automaticLocations(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const locations = (value as { automaticLocations?: unknown }).automaticLocations;
  return Array.isArray(locations) && locations.every(location => typeof location === 'string') ? locations : [];
}

/** Only designated destination collections follow locations; curated series stay untouched. */
export function planDestinationMembership(albums: DestinationAlbum[], members: Member[], photos: DestinationPhoto[]) {
  const add: Member[] = [], remove: Array<Pick<Member, 'albumId' | 'photoId'>> = [];
  for (const album of albums) {
    const locations = automaticLocations(album.location);
    if (!locations.length) continue;
    const existing = members.filter(member => member.albumId === album.id);
    const ids = new Set(existing.map(member => member.photoId));
    let nextOrder = Math.max(-1, ...existing.map(member => member.sortOrder)) + 1;
    for (const photo of [...photos].sort((a,b) => +new Date(a.takenAt) - +new Date(b.takenAt) || a.id.localeCompare(b.id))) {
      // Hidden photographs keep their existing place but are never newly added or made public.
      if (photo.hidden) continue;
      const place = shortPhotoLocation(photo);
      const matches = !!place && locations.includes(place);
      if (matches && !ids.has(photo.id)) {
        if (nextOrder > 32767) throw new Error('Collection sequence is full');
        add.push({ albumId: album.id, photoId: photo.id, sortOrder: nextOrder++ });
        ids.add(photo.id);
      } else if (!matches && ids.has(photo.id)) remove.push({ albumId: album.id, photoId: photo.id });
    }
  }
  return { add, remove };
}
