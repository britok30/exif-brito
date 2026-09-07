import type { PhotoInsert } from '../db/schema';

const textFields = ['thumbnailUrl', 'blurData', 'title', 'caption', 'semanticDescription', 'make', 'model', 'lensMake', 'lensModel', 'locationName', 'film', 'recipeTitle'] as const;
const numberFields = ['width', 'height', 'aspectRatio', 'focalLength', 'focalLengthIn35mmFormat', 'fNumber', 'iso', 'exposureTime', 'exposureCompensation', 'latitude', 'longitude', 'colorSort', 'priorityOrder'] as const;
const aliases: Record<string, string> = {
  focalLengthIn35MmFormat: 'focalLengthIn35mmFormat',
  filmSimulation: 'film', fujifilmRecipe: 'recipeData',
};

/** Accept raw Postgres rows or the previous application's camel-case export. */
export function mapLegacyPhoto(input: unknown): PhotoInsert {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a photo object');
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const camel = key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
    row[aliases[camel] || camel] = value;
  }
  const required = (key: string) => {
    const value = row[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${key}`);
    return value;
  };
  const id = required('id');
  if (id.length > 8) throw new Error('Photo ID exceeds 8 characters; refusing to truncate');
  const url = required('url');
  if (!/^https?:\/\//.test(url) || url.length > 255) throw new Error('Invalid photo URL');
  const date = (value: unknown, key: string) => {
    if (typeof value !== 'string' && !(value instanceof Date)) throw new Error(`Missing ${key}`);
    const result = new Date(value);
    if (!Number.isFinite(result.getTime())) throw new Error(`Invalid ${key}`);
    return result;
  };
  const takenAtNaive = required('takenAtNaive');
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(takenAtNaive)) throw new Error('Invalid camera-local capture date');
  const output: Record<string, unknown> = {
    id, url, extension: required('extension'), takenAt: date(row.takenAt, 'takenAt'), takenAtNaive,
  };
  for (const field of textFields) {
    if (row[field] == null) continue;
    if (typeof row[field] !== 'string') throw new Error(`Invalid ${field}`);
    if (!['blurData', 'caption', 'semanticDescription'].includes(field) && row[field].length > 255) throw new Error(`${field} exceeds 255 characters`);
    output[field] = row[field];
  }
  for (const field of numberFields) {
    if (row[field] == null) continue;
    if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) throw new Error(`Invalid ${field}`);
    output[field] = row[field];
  }
  if (row.tags != null) {
    if (!Array.isArray(row.tags) || row.tags.some(tag => typeof tag !== 'string' || tag.length > 255)) throw new Error('Invalid tags');
    output.tags = row.tags;
  }
  for (const field of ['hidden', 'excludeFromFeeds']) {
    if (row[field] != null && typeof row[field] !== 'boolean') throw new Error(`Invalid ${field}`);
    output[field] = row[field] ?? false;
  }
  for (const field of ['recipeData', 'colorData']) {
    if (row[field] == null) continue;
    const value = typeof row[field] === 'string' ? JSON.parse(row[field]) : row[field];
    if (!value || typeof value !== 'object') throw new Error(`Invalid ${field}`);
    output[field] = value;
  }
  for (const field of ['createdAt', 'updatedAt']) {
    if (row[field] != null) output[field] = date(row[field], field);
  }
  return output as unknown as PhotoInsert;
}

export function validateLegacyArchive(input: unknown): PhotoInsert[] {
  const rows = Array.isArray(input) ? input : (input as { photos?: unknown } | null)?.photos;
  if (!Array.isArray(rows)) throw new Error('Expected an array of photos or { photos: [...] }');
  const ids = new Set<string>();
  return rows.map((row, index) => {
    try {
      const photo = mapLegacyPhoto(row);
      if (ids.has(photo.id)) throw new Error('Duplicate photo ID');
      ids.add(photo.id);
      return photo;
    } catch (error) {
      throw new Error(`Photo ${index + 1}: ${error instanceof Error ? error.message : 'Invalid record'}`);
    }
  });
}
