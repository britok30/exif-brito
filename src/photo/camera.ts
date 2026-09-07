/**
 * Camera names as people say them, from the strings cameras write into EXIF:
 * "FUJIFILM" + "X100VI" → "Fujifilm X100VI", "LEICA CAMERA AG" + "LEICA Q2" →
 * "Leica Q2", "NIKON CORPORATION" + "NIKON Z 6" → "Nikon Z 6", and Apple's
 * phones by their own name, "iPhone 12 Pro Max".
 */
const CORPORATE = /\b(corporation|corp\.?|camera ag|ag|co\.?,? ?ltd\.?|ltd\.?|inc\.?|imaging|company|gmbh|electronics|optical)\b/gi;

const BRANDS: Record<string, string> = {
  fujifilm: 'Fujifilm', nikon: 'Nikon', leica: 'Leica', canon: 'Canon', sony: 'Sony', apple: 'Apple',
  panasonic: 'Panasonic', olympus: 'Olympus', 'om digital solutions': 'OM System', ricoh: 'Ricoh', pentax: 'Pentax',
  hasselblad: 'Hasselblad', sigma: 'Sigma', samsung: 'Samsung', google: 'Google', dji: 'DJI', gopro: 'GoPro',
};

/** The make as a brand name: corporate suffixes removed, known brands in their own casing. */
export function formatCameraMake(make?: string | null): string | undefined {
  const cleaned = (make ?? '').replace(CORPORATE, ' ').replace(/\s+/g, ' ').replace(/[\s.,]+$/, '').trim();
  if (!cleaned) return undefined;
  const known = BRANDS[cleaned.toLowerCase()];
  if (known) return known;
  // All-caps makes read as shouting; anything with mixed case is left as written.
  return cleaned === cleaned.toUpperCase() ? cleaned.charAt(0) + cleaned.slice(1).toLowerCase() : cleaned;
}

/** Make and model together, without the brand repeated, or undefined when neither is known. */
export function formatCameraName(make?: string | null, model?: string | null): string | undefined {
  const brand = formatCameraMake(make);
  let body = (model ?? '').replace(/\s+/g, ' ').trim();
  if (brand && body.toLowerCase().startsWith(brand.toLowerCase() + ' ')) body = body.slice(brand.length + 1);
  if (brand?.toLowerCase() === 'apple' && /^iphone|^ipad/i.test(body)) return body;
  return [brand, body].filter(Boolean).join(' ') || undefined;
}
