import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.AWS_S3_BUCKET = 'test-bucket';
  process.env.AWS_S3_REGION = 'us-east-2';
});

vi.mock('@/storage/s3', async () => {
  const actual = await vi.importActual<typeof import('@/storage/s3')>(
    '@/storage/s3',
  );
  return {
    ...actual,
    s3SignedUrl: vi.fn(async (key: string) =>
      `https://signed.example/${key}?sig=fake`,
    ),
  };
});

const post = async (body: unknown) => {
  const { POST } = await import('./route');
  const req = new Request('http://localhost/api/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as never);
};

describe('POST /api/upload', () => {
  it('returns 400 when filename is missing', async () => {
    const res = await post({ contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when contentType is missing', async () => {
    const res = await post({ filename: 'x.jpg' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported contentType', async () => {
    const res = await post({ filename: 'x.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unsupported/i);
  });

  it('returns 200 with key, uploadUrl, publicUrl on valid request', async () => {
    const res = await post({ filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.key).toMatch(/^photos\/[a-z0-9]{16}\.jpg$/);
    expect(json.uploadUrl).toContain('signed.example');
    expect(json.publicUrl).toBe(
      `https://test-bucket.s3.us-east-2.amazonaws.com/${json.key}`,
    );
  });

  it('preserves heic extension', async () => {
    const res = await post({ filename: 'IMG_0001.HEIC', contentType: 'image/heic' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.key).toMatch(/\.HEIC$/);
  });
});
