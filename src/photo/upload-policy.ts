export const MAX_UPLOAD_BYTES = 50_000_000;
export const UPLOAD_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif',
};
export const UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif';
export function uploadContentType(file: Pick<File, 'name' | 'type'>) {
  return UPLOAD_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''];
}
export function validateUpload(file: Pick<File, 'name' | 'type' | 'size'>): string | undefined {
  if (!uploadContentType(file)) return 'Choose a JPEG, PNG, WebP, HEIC or HEIF image.';
  if (!file.size) return 'This file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return 'This image exceeds the 50 MB limit.';
}
export const fileIdentity = (file: Pick<File, 'name' | 'size' | 'lastModified'>) =>
  `${file.name}\0${file.size}\0${file.lastModified}`;
export const isUploadKey = (key: unknown): key is string =>
  typeof key === 'string' && /^photos\/[a-z0-9_-]+\.(jpe?g|png|webp|heic|heif)$/i.test(key);
export const parseUploadTags = (value: string): string[] =>
  Array.from(new Set(value.split(',').map(tag => tag.trim()).filter(Boolean)));
