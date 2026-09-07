import sharp from 'sharp';

const THUMBNAIL_WIDTH = 2560;
const THUMBNAIL_QUALITY = 90;

const BLUR_WIDTH = 32;
const BLUR_QUALITY = 60;

/**
 * Resize the original to the largest size we'd ever need to display in-browser
 * (up to 2560px). The original stays untouched; the display copy retains its
 * ICC color profile and has orientation baked in. EXIF lives in the database.
 */
export const generateThumbnailBuffer = async (
  source: Buffer | ArrayBuffer,
): Promise<Buffer> =>
  sharp(source)
    .rotate() // bake orientation in so we can drop it from EXIF
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .keepIccProfile()
    .jpeg({ quality: THUMBNAIL_QUALITY, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

/**
 * Tiny, blurred, base64-inlined placeholder used as a CSS background while the
 * thumbnail streams in. Matches the source aspect ratio so there's no jump.
 */
export const generateBlurDataUrl = async (
  source: Buffer | ArrayBuffer,
): Promise<string> => {
  const buf = await sharp(source)
    .rotate()
    .resize({ width: BLUR_WIDTH })
    .jpeg({ quality: BLUR_QUALITY })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};

/** Read the full-size composition, including camera orientation, even without EXIF. */
export async function readPhotoDimensions(source: Buffer) {
  const metadata = await sharp(source).metadata();
  const rotated = metadata.orientation != null && metadata.orientation >= 5 && metadata.orientation <= 8;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  if (!width || !height) throw new Error('Could not read image dimensions');
  return { width, height, aspectRatio: width / height };
}
