import { normalizeLocationName } from './location';

export interface PhotoEdits {
  title: string;
  caption: string;
  locationName: string;
  tags: string[];
  hidden: boolean;
}

export function parsePhotoEdits(input: unknown): PhotoEdits | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['title', 'caption', 'locationName', 'tags', 'hidden'].includes(key))) return;
  for (const [key, limit] of [['title', 255], ['caption', 10000], ['locationName', 255]] as const) {
    if (typeof value[key] !== 'string' || value[key].length > limit) return;
  }
  if (typeof value.hidden !== 'boolean' || !Array.isArray(value.tags) || value.tags.length > 50 ||
      value.tags.some(tag => typeof tag !== 'string' || tag.length > 255)) return;
  return {
    title: (value.title as string).trim(), caption: (value.caption as string).trim(),
    locationName: normalizeLocationName(value.locationName as string),
    tags: [...new Set((value.tags as string[]).map(tag => tag.trim()).filter(Boolean))], hidden: value.hidden,
  };
}
