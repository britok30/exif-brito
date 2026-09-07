import { describe, it, expect, beforeAll, vi } from 'vitest';

beforeAll(() => {
  process.env.AWS_S3_BUCKET = 'test-bucket';
  process.env.AWS_S3_REGION = 'us-east-2';
});

describe('s3 module', () => {
  it('generateStorageId returns 16-char lowercase alphanumeric', async () => {
    const { generateStorageId } = await import('./s3');
    const id = generateStorageId();
    expect(id).toMatch(/^[a-z0-9]{16}$/);
  });

  it('generateStorageId is unique across calls', async () => {
    const { generateStorageId } = await import('./s3');
    const ids = new Set(Array.from({ length: 100 }, () => generateStorageId()));
    expect(ids.size).toBe(100);
  });

  it('S3_BASE_URL composes from bucket + region', async () => {
    const { S3_BASE_URL } = await import('./s3');
    expect(S3_BASE_URL).toBe('https://test-bucket.s3.us-east-2.amazonaws.com');
  });

  it('addresses the bucket by path on an S3-compatible endpoint', async () => {
    process.env.AWS_S3_ENDPOINT = 'https://account.r2.cloudflarestorage.com/';
    vi.resetModules();
    const { S3_BASE_URL, isS3Url } = await import('./s3');
    expect(S3_BASE_URL).toBe('https://account.r2.cloudflarestorage.com/test-bucket');
    expect(isS3Url('https://account.r2.cloudflarestorage.com/test-bucket/photos/x.jpg')).toBe(true);
    expect(isS3Url('https://test-bucket.s3.us-east-2.amazonaws.com/photos/x.jpg')).toBe(false);
    delete process.env.AWS_S3_ENDPOINT;
    vi.resetModules();
  });

  it('isS3Url matches our base URL', async () => {
    const { isS3Url } = await import('./s3');
    expect(isS3Url('https://test-bucket.s3.us-east-2.amazonaws.com/photos/x.jpg'))
      .toBe(true);
    expect(isS3Url('https://other-bucket.s3.us-east-2.amazonaws.com/x.jpg'))
      .toBe(false);
    expect(isS3Url(undefined)).toBe(false);
  });
});
