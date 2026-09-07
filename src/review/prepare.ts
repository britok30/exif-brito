import type { DraftStore } from '@/photo/upload-queue';
type Item = { locationName?: string; id: string; name: string; size: number };
/** Stage only the user's explicit selection locally. Uploading and publishing are separate actions. */
export async function prepareReview(version: string, items: Item[], selected: Set<string>, store: DraftStore,
  fetchFile: typeof fetch = fetch, progress: (done: number, total: number) => void = () => {}) {
  const chosen = items.filter(item => selected.has(item.id));
  const existing = new Set((await store.load()).map(item => item.id));
  for (let index = 0; index < chosen.length; index++) {
    const item = chosen[index]; const id = `review-${version}-${item.id}`;
    if (existing.has(id)) continue;
    progress(index + 1, chosen.length);
    const response = await fetchFile(`/api/review/${item.id}?original=1`);
    if (!response.ok) throw Error('Reconnect the SD card and try again. Photographs already prepared are retained.');
    const blob = await response.blob();
    if (blob.size !== item.size) throw Error('This original could not be read completely. Reconnect the card and try again.');
    const file = new File([blob], item.name, { type: 'image/jpeg' });
    await store.put({ id, file, status: 'queued', progress: 0, title: '', caption: '', tags: [], locationName: item.locationName || '', hidden: false, publishRequested: false });
  }
}
