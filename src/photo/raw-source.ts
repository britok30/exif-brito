/** RAW imports retain the camera's JPEG rendering alongside the untouched RAF. */
export function rawSourceKey(url: string) {
  const match = /\/photos\/(sd-raw-[a-f0-9]{64})\.jpg$/.exec(url);
  return match ? `photos/raw/${match[1]}.raf` : undefined;
}
