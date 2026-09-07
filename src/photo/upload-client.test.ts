import { describe, it, expect, vi, beforeEach } from 'vitest';
import { presignAndUpload, geocode, finalizePhoto, discardUpload } from './upload-client';

const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', {
  type: 'image/jpeg',
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// Minimal XHR mock — exposes the few hooks our impl touches and lets the test
// drive lifecycle (progress events, completion, error).
class FakeXHR {
  static current: FakeXHR | null = null;
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  open = vi.fn();
  setRequestHeader = vi.fn();
  abort = vi.fn(() => this.onabort?.());
  send = vi.fn();
  constructor() {
    FakeXHR.current = this;
  }
  emitProgress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }
  finishWith(status: number) {
    this.status = status;
    this.onload?.();
  }
}

describe('presignAndUpload', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    FakeXHR.current = null;
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
  });

  it('returns key + publicUrl after presign + S3 PUT succeed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        json(200, {
          key: 'photos/abc.jpg',
          uploadUrl: 'https://s3/upload',
          publicUrl: 'https://s3/abc.jpg',
        }),
      ),
    );

    const promise = presignAndUpload(file);
    await new Promise(r => setTimeout(r, 0));
    FakeXHR.current!.finishWith(200);

    const result = await promise;
    expect(result).toEqual({
      key: 'photos/abc.jpg',
      publicUrl: 'https://s3/abc.jpg',
    });
    expect(FakeXHR.current!.open).toHaveBeenCalledWith('PUT', 'https://s3/upload');
  });

  it('emits progress percentages and a final 100', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        json(200, {
          key: 'k',
          uploadUrl: 'https://s3/u',
          publicUrl: 'https://s3/p',
        }),
      ),
    );

    const onProgress = vi.fn();
    const promise = presignAndUpload(file, { onProgress });
    await new Promise(r => setTimeout(r, 0));
    FakeXHR.current!.emitProgress(50, 100);
    FakeXHR.current!.emitProgress(75, 100);
    FakeXHR.current!.finishWith(200);
    await promise;

    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(75);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('throws server error message when presign returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json(401, { error: 'unauthorized' })),
    );
    await expect(presignAndUpload(file)).rejects.toThrow('unauthorized');
  });

  it('throws when S3 PUT returns non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        json(200, {
          key: 'k',
          uploadUrl: 'https://s3/u',
          publicUrl: 'https://s3/p',
        }),
      ),
    );

    const promise = presignAndUpload(file);
    await new Promise(r => setTimeout(r, 0));
    FakeXHR.current!.finishWith(403);

    await expect(promise).rejects.toThrow(/Upload failed.*403/);
  });
});

describe('geocode', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('returns location on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        json(200, {
          location: { city: 'Paris', country: 'France', formatted: 'Paris, France' },
        }),
      ),
    );
    const result = await geocode(48.85, 2.35);
    expect(result).toEqual({ city: 'Paris', country: 'France', formatted: 'Paris, France' });
  });

  it('returns undefined when API responds non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(500, {})));
    expect(await geocode(0, 0)).toBeUndefined();
  });

  it('returns undefined on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('net')));
    expect(await geocode(0, 0)).toBeUndefined();
  });
});

describe('discardUpload', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('POSTs the key to the discard endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await discardUpload('photos/abc.jpg');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/photos/discard');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ key: 'photos/abc.jpg' });
  });

  it('swallows network errors (best-effort cleanup)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('net')));
    await expect(discardUpload('photos/abc.jpg')).resolves.toBeUndefined();
  });
});

describe('finalizePhoto', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('sends key and overrides, returns inserted photo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { photo: { id: 'abc', title: 'Sunrise' } }));
    vi.stubGlobal('fetch', fetchMock);

    const photo = await finalizePhoto('photos/abc.jpg', {
      title: 'Sunrise',
      caption: 'Miami',
      tags: ['street', 'morning'],
      locationName: 'Miami, FL, USA',
    });
    expect(photo).toMatchObject({ id: 'abc', title: 'Sunrise' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      key: 'photos/abc.jpg',
      title: 'Sunrise',
      caption: 'Miami',
      tags: ['street', 'morning'],
      locationName: 'Miami, FL, USA',
    });
  });

  it('propagates server error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json(500, { error: 'db down' })),
    );
    await expect(finalizePhoto('photos/abc.jpg')).rejects.toThrow('db down');
  });
});

it('rejects an already cancelled upload without sending a request', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  const controller = new AbortController(); controller.abort();
  await expect(presignAndUpload(file, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('cleans up an allocated upload after cancellation', async () => {
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
  const fetchMock = vi.fn().mockResolvedValueOnce(json(200, { key: 'photos/cancel.jpg', uploadUrl: 'https://s3/upload', publicUrl: 'https://s3/photo' })).mockResolvedValue(json(200, { ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  const controller = new AbortController();
  const request = presignAndUpload(file, { signal: controller.signal });
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await new Promise(r => setTimeout(r, 0)); controller.abort(); await rejected;
  expect(fetchMock).toHaveBeenCalledWith('/api/photos/discard', expect.objectContaining({ body: JSON.stringify({ key: 'photos/cancel.jpg' }) }));
});
