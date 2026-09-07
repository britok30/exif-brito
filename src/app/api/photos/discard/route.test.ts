vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { email: 'owner@example.com' } })) }));
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/photo/upload-record', () => ({ findUploadedPhoto: vi.fn(async () => undefined) }));

const deleteMock = vi.fn(async () => undefined);

vi.mock('@/storage/s3', async () => {
  const actual = await vi.importActual<typeof import('@/storage/s3')>('@/storage/s3');
  return {
    ...actual,
    s3Delete: deleteMock,
  };
});

const post = async (body: unknown) => {
  const { POST } = await import('./route');
  const req = new Request('http://localhost/api/photos/discard', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as never);
};

describe('POST /api/photos/discard', () => {
  beforeEach(() => deleteMock.mockClear());

  it('returns 400 when key is missing', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('rejects keys outside the photos/ prefix', async () => {
    const res = await post({ key: 'evil/escape.jpg' });
    expect(res.status).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('deletes the S3 object on happy path', async () => {
    const res = await post({ key: 'photos/abc.jpg' });
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith('photos/abc.jpg');
  });

  it('returns 502 when S3 delete throws', async () => {
    deleteMock.mockRejectedValueOnce(new Error('boom'));
    const res = await post({ key: 'photos/abc.jpg' });
    expect(res.status).toBe(502);
  });
});

it('cannot discard an original that has already been published', async () => {
  const { findUploadedPhoto } = await import('@/photo/upload-record');
  vi.mocked(findUploadedPhoto).mockResolvedValueOnce({ id: 'published' } as never);
  deleteMock.mockClear();
  expect((await post({ key: 'photos/abc.jpg' })).status).toBe(409);
  expect(deleteMock).not.toHaveBeenCalled();
});
