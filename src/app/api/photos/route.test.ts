vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { email: 'owner@example.com' } })) }));
vi.mock('@/collections/sync', () => ({ syncDestinationCollections: vi.fn(async () => {}) }));
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

beforeAll(() => {
  process.env.AWS_S3_BUCKET = 'test-bucket';
  process.env.AWS_S3_REGION = 'us-east-2';
  process.env.DATABASE_URL ??= 'postgres://stub';
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));

vi.mock('@/exif', () => ({
  extractExif: vi.fn(async () => ({
    aspectRatio: 1.5,
    width: 4000,
    height: 3000,
    make: 'FUJIFILM',
    model: 'X100VI',
    film: 'classic-chrome',
    latitude: 48.8566,
    longitude: 2.3522,
  })),
}));

vi.mock('@/platforms/google-maps', () => ({
  reverseGeocode: vi.fn(async () => ({
    city: 'Paris',
    country: 'France',
    formatted: 'Paris, France',
  })),
}));

vi.mock('@/photo/server', () => ({
  readPhotoDimensions: vi.fn(async () => ({ width: 4000, height: 3000, aspectRatio: 4 / 3 })),
  generateThumbnailBuffer: vi.fn(async () => Buffer.from([0xff, 0xd8, 0xff, 0xd9])),
  generateBlurDataUrl: vi.fn(async () => 'data:image/jpeg;base64,STUB'),
}));

vi.mock('@/storage/s3', async () => {
  const actual = await vi.importActual<typeof import('@/storage/s3')>('@/storage/s3');
  return {
    ...actual,
    s3SignedUrl: vi.fn(async (key: string) => `https://signed.example/${key}`),
    s3Put: vi.fn(async (_buf: unknown, key: string) =>
      `https://test-bucket.s3.us-east-2.amazonaws.com/${key}`),
    s3Size: vi.fn(async () => 8),
    s3Delete: vi.fn(async () => ({})),
  };
});

vi.mock('@/photo/upload-record', () => ({
  findUploadedPhoto: vi.fn(async () => undefined),
  createUploadedPhoto: vi.fn(async (_key, input) => (await import('@/photo')).createPhoto(input)),
}));

const insertedRows: Record<string, unknown>[] = [];
const deletedRows: unknown[] = [];
vi.mock('@/db', () => ({
  db: {
    delete: () => ({ where: async (predicate: unknown) => { deletedRows.push(predicate); } }),
    insert: () => ({
      values: (row: Record<string, unknown>) => ({
        returning: async () => {
          insertedRows.push(row);
          return [row];
        },
      }),
    }),
  },
  photos: {},
}));

const post = async (body: unknown) => {
  const { POST } = await import('./route');
  const req = new Request('http://localhost/api/photos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as never);
};

describe('POST /api/photos', () => {
  beforeEach(() => {
    insertedRows.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(new ArrayBuffer(8), { status: 200 }),
      ),
    );
  });

  it('returns 400 when key is missing', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('returns 502 when S3 fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    const res = await post({ key: 'photos/abc.jpg' });
    expect(res.status).toBe(502);
  });

  it('inserts a photo row and returns it on happy path', async () => {
    const res = await post({ key: 'photos/abc.jpg' });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(insertedRows).toHaveLength(1);
    const row = insertedRows[0];
    expect(row.id).toMatch(/^[a-z0-9]{8}$/);
    expect(row.url).toBe('https://test-bucket.s3.us-east-2.amazonaws.com/photos/abc.jpg');
    expect(row.extension).toBe('jpg');
    expect(row.make).toBe('FUJIFILM');
    expect(row.film).toBe('classic-chrome');

    expect(json.photo).toMatchObject({ make: 'FUJIFILM', film: 'classic-chrome' });
  });

  it('lowercases uppercase extensions from the S3 key', async () => {
    await post({ key: 'photos/abc.HEIC' });
    expect(insertedRows[0].extension).toBe('heic');
  });

  it('applies user-provided overrides (title / caption / tags)', async () => {
    await post({
      key: 'photos/abc.jpg',
      title: 'Sunrise on the bay',
      caption: 'Brickell Key, 6:42am',
      tags: ['miami', 'morning'],
    });
    const row = insertedRows[0];
    expect(row.title).toBe('Sunrise on the bay');
    expect(row.caption).toBe('Brickell Key, 6:42am');
    expect(row.tags).toEqual(['miami', 'morning']);
  });

  it('allows clearing title and caption with empty overrides', async () => {
    await post({ key: 'photos/abc.jpg', title: '   ', caption: '' });
    const row = insertedRows[0];
    // EXIF mock does not provide title/caption, so they should remain undefined
    expect(row.title).toBeNull();
    expect(row.caption).toBeNull();
  });

  it('persists provided locationName from the client', async () => {
    await post({
      key: 'photos/abc.jpg',
      locationName: 'Paris, France',
    });
    expect(insertedRows[0].locationName).toBe('Paris, France');
  });

  it('reverse-geocodes from coords when no locationName is provided', async () => {
    await post({ key: 'photos/abc.jpg' });
    expect(insertedRows[0].locationName).toBe('Paris, France');
  });
});

it('returns an already published photo on a retry without processing or inserting again', async () => {
  const { findUploadedPhoto } = await import('@/photo/upload-record');
  vi.mocked(findUploadedPhoto).mockResolvedValueOnce({ id: 'existing' } as never);
  insertedRows.length = 0;
  const res = await post({ key: 'photos/abc.jpg' });
  expect((await res.json()).photo.id).toBe('existing');
  expect(insertedRows).toHaveLength(0);
});
it('rejects thumbnail paths and malformed photo details', async () => {
  expect((await post({ key: 'photos/thumb/abc.jpg' })).status).toBe(400);
  expect((await post({ key: 'photos/abc.jpg', title: 42 })).status).toBe(400);
  expect((await post({ key: 'photos/abc.jpg', tags: [true] })).status).toBe(400);
});
it('can create a hidden photo without dropping the original composition', async () => {
  insertedRows.length = 0;
  const res = await post({ key: 'photos/hidden.jpg', hidden: true, tags: [] });
  expect(res.status).toBe(200);
  expect(insertedRows[0]).toMatchObject({ hidden: true, tags: [], width: 4000, height: 3000, aspectRatio: 4 / 3 });
});

it('checks the stored size before downloading, and removes an oversized upload', async () => {
  const storage = await import('@/storage/s3');
  const fetch = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  vi.mocked(storage.s3Size).mockResolvedValueOnce(60_000_000);
  const res = await post({ key: 'photos/huge.jpg' });
  expect(res.status).toBe(413);
  expect(storage.s3Delete).toHaveBeenCalledWith('photos/huge.jpg');
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(storage.s3Size).mockResolvedValueOnce(undefined);
  expect((await post({ key: 'photos/gone.jpg' })).status).toBe(404);
});

it('never reports storage errors verbatim', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
  const res = await post({ key: 'photos/abc.jpg' });
  expect(res.status).toBe(502);
  expect((await res.json()).error).not.toMatch(/S3|500/);
});

it('removes the row again when the original was discarded mid-publish', async () => {
  const storage = await import('@/storage/s3');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 })));
  deletedRows.length = 0;
  vi.mocked(storage.s3Size).mockResolvedValueOnce(8).mockResolvedValueOnce(undefined);
  const res = await post({ key: 'photos/raced.jpg' });
  expect(res.status).toBe(409);
  expect(deletedRows).toHaveLength(1);
});

it('applies the editor’s limits and cleans tags on upload', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 })));
  expect((await post({ key: 'photos/abc.jpg', caption: 'x'.repeat(10001) })).status).toBe(400);
  expect((await post({ key: 'photos/abc.jpg', tags: Array.from({ length: 51 }, (_, i) => `t${i}`) })).status).toBe(400);
  insertedRows.length = 0;
  await post({ key: 'photos/tags.jpg', tags: [' Tokyo ', 'Tokyo', '', 'night'] });
  expect(insertedRows[0].tags).toEqual(['Tokyo', 'night']);
});

it('standardizes manual and tag-only Japanese upload locations', async () => {
  const start = insertedRows.length;
  await post({ key: 'photos/manual-kyoto.jpg', locationName: ' Kyoto ' });
  await post({ key: 'photos/tag-tokyo.jpg', locationName: '', tags: ['Tokyo'] });
  expect(insertedRows[start].locationName).toBe('Kyoto, Japan');
  expect(insertedRows[start + 1].locationName).toBe('Tokyo, Japan');
});
