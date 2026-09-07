import { expect, it, vi } from 'vitest';
vi.mock('exifr', () => ({ default: { parse: vi.fn(async () => ({ Make: 'Canon', Model: 'EOS R5', ISO: 200, FNumber: 4 })) } }));
import { extractExif } from './index';

it('continues to the multi-format metadata reader when the JPEG parser cannot read a container', async () => {
  const result = await extractExif(Buffer.from('non-JPEG container'));
  expect(result).toMatchObject({ make: 'Canon', model: 'EOS R5', iso: 200, fNumber: 4 });
});
