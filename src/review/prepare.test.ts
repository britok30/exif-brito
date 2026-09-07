import { expect, it, vi } from 'vitest';
import { prepareReview } from './prepare';
import type { DraftStore, UploadDraft } from '@/photo/upload-queue';
const items = [{ id: 'one', name: 'one.JPG', size: 3 }, { id: 'two', name: 'two.JPG', size: 3 }];
const store = () => ({ load: vi.fn().mockResolvedValue([]), put: vi.fn(), delete: vi.fn() }) satisfies DraftStore;
it('does nothing with an empty selection', async () => {
  const storage = store(); const fetcher = vi.fn(); await prepareReview('v1',items,new Set(),storage,fetcher);
  expect(fetcher).not.toHaveBeenCalled(); expect(storage.put).not.toHaveBeenCalled();
});
it('prepares only explicit picks with publishing disabled', async () => {
  const storage = store(); const fetcher = vi.fn().mockResolvedValue(new Response('abc'));
  await prepareReview('v1', items, new Set(['two']), storage, fetcher);
  expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/review/two?original=1');
  expect(storage.put).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'review-v1-two', status: 'queued', publishRequested: false }));
});
it('preserves existing drafts and retries only missing files', async () => {
  const storage = store(); storage.load.mockResolvedValue([{ id: 'review-v1-one' } as UploadDraft]);
  const fetcher = vi.fn().mockResolvedValue(new Response('abc'));
  await prepareReview('v1',items,new Set(['one','two']),storage,fetcher);
  expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/review/two?original=1'); expect(storage.delete).not.toHaveBeenCalled();
});
it('never stages a failed or incomplete card read', async () => {
  for (const response of [new Response('',{status:409}),new Response('ab')]) {
    const storage = store(); await expect(prepareReview('v1',items,new Set(['one']),storage,vi.fn().mockResolvedValue(response))).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  }
});

it('carries the confirmed trip location into selected drafts without publishing', async () => {
  const storage = store();
  await prepareReview('v1', [{ ...items[0], locationName: 'London, UK' }], new Set(['one']), storage, vi.fn().mockResolvedValue(new Response('abc')));
  expect(storage.put).toHaveBeenCalledWith(expect.objectContaining({ locationName: 'London, UK', publishRequested: false }));
});
