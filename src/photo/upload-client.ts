import { uploadContentType } from './upload-policy';
import type { Photo } from '@/db';
import type { GeocodeResult } from '@/platforms/google-maps';

const readError = async (res: Response, fallback: string) => {
  try {
    const json = (await res.json()) as { error?: string };
    return json.error ?? `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
};

interface PresignResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export interface UploadedFile {
  key: string;
  publicUrl: string;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function presignAndUpload(
  file: File,
  { onProgress, signal }: UploadOptions = {},
): Promise<UploadedFile> {
  signal?.throwIfAborted();
  const contentType = uploadContentType(file) || file.type;
  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType, size: file.size }),
    signal,
  });
  if (!presignRes.ok) {
    throw new Error(await readError(presignRes, 'Presign failed'));
  }
  const { key, uploadUrl, publicUrl } =
    (await presignRes.json()) as PresignResponse;

  try {
    signal?.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('content-type', contentType);
      xhr.timeout = 10 * 60 * 1000;
      const abort = () => xhr.abort();
      const finish = (error?: Error) => {
        signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100));
      };
      xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? undefined : new Error(`Upload failed (${xhr.status}). Please retry.`));
      xhr.onerror = () => finish(new Error('Upload interrupted. Check your connection and retry.'));
      xhr.ontimeout = () => finish(new Error('Upload timed out. Please retry.'));
      xhr.onabort = () => finish(new DOMException('Upload cancelled', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { finish(new DOMException('Upload cancelled', 'AbortError')); return; }
      xhr.send(file);
    });
  } catch (error) {
    await discardUpload(key);
    throw error;
  }

  onProgress?.(100);
  return { key, publicUrl };
}

export async function geocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult | undefined> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  try {
    const res = await fetch(`/api/geocode?${params}`);
    if (!res.ok) return undefined;
    const { location } = (await res.json()) as { location?: GeocodeResult };
    return location;
  } catch {
    return undefined;
  }
}

export interface PhotoOverrides {
  title?: string;
  caption?: string;
  tags?: string[];
  locationName?: string;
  hidden?: boolean;
}

export async function discardUpload(key: string): Promise<void> {
  try {
    await fetch('/api/photos/discard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    });
  } catch {
    // best-effort cleanup; orphan stays in S3 until manual cleanup
  }
}

export async function finalizePhoto(
  key: string,
  overrides: PhotoOverrides = {},
): Promise<Photo> {
  const res = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, ...overrides }),
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'Finalize failed'));
  }
  const { photo } = (await res.json()) as { photo: Photo };
  return photo;
}
