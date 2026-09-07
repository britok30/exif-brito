import { expect, it } from 'vitest';
import sharp from 'sharp';
import { generateThumbnailBuffer, readPhotoDimensions } from './server';

it('preserves the original bytes and embedded color profile while creating a high-resolution display copy', async () => {
  const source = await sharp({ create: { width: 3200, height: 2000, channels: 3, background: '#dd9933' } }).withIccProfile('p3').jpeg().toBuffer();
  const original = Buffer.from(source);
  const preview = await generateThumbnailBuffer(source);
  const metadata = await sharp(preview).metadata();
  expect(source.equals(original)).toBe(true);
  expect(metadata.width).toBe(2560);
  expect(metadata.height).toBe(1600);
  expect(metadata.isProgressive).toBe(true);
  expect(metadata.icc?.length).toBeGreaterThan(0);
});

it('keeps the composition of rotated originals and does not enlarge small images', async () => {
  const source = await sharp({ create: { width: 80, height: 40, channels: 3, background: 'white' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  expect(await readPhotoDimensions(source)).toEqual({ width: 40, height: 80, aspectRatio: 0.5 });
  const metadata = await sharp(await generateThumbnailBuffer(source)).metadata();
  expect(metadata.width).toBe(40); expect(metadata.height).toBe(80);
});
