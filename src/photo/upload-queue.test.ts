import { describe, expect, it, vi } from 'vitest';
import { UploadQueue, type QueueDependencies, type UploadDraft } from './upload-queue';

const file = (name: string) => new File(['photo'], name, { type: 'image/jpeg', lastModified: 1 });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function setup(overrides: Partial<QueueDependencies> = {}) {
  const drafts = new Map<string, UploadDraft>();
  const deps: QueueDependencies = {
    extract: vi.fn(async () => ({ aspectRatio: 1.5, tags: ['original'], latitude: 0, longitude: 0 })),
    geocode: vi.fn(async () => ({ city: 'Accra', formatted: 'Accra, Ghana' })),
    upload: vi.fn(async photo => ({ key: `photos/${photo.name}`, publicUrl: 'https://example.test/photo.jpg' })),
    publish: vi.fn(async () => ({ id: 'published' })), discard: vi.fn(async () => {}),
    store: { load: async () => [...drafts.values()], put: async item => { drafts.set(item.id, item); }, delete: async id => { drafts.delete(id); } },
    preview: vi.fn(() => 'blob:preview'), revoke: vi.fn(), ...overrides,
  };
  const queue = new UploadQueue(deps);
  return { queue, deps, drafts };
}

describe('upload queue', () => {
  it('bounds work, pauses between photographs, and resumes the remainder', async () => {
    const gates = Array.from({ length: 4 }, () => deferred<{ key: string; publicUrl: string }>());
    let index = 0;
    const { queue, deps } = setup({ upload: vi.fn(() => gates[index++].promise) });
    await queue.restore(); queue.add(['1.jpg','2.jpg','3.jpg','4.jpg'].map(file)); await tick();
    expect(deps.upload).toHaveBeenCalledTimes(3);
    queue.pause(); gates[0].resolve({ key: 'photos/1.jpg', publicUrl: '' }); await tick();
    expect(deps.upload).toHaveBeenCalledTimes(3);
    queue.resume(); await tick(); expect(deps.upload).toHaveBeenCalledTimes(4);
    gates.slice(1).forEach((gate, i) => gate.resolve({ key: `photos/${i + 2}.jpg`, publicUrl: '' }));
    await tick(); expect(queue.snapshot.items.every(item => item.status === 'ready')).toBe(true);
    queue.destroy();
  });
  it('supports publishing a batch before uploads finish, preserving EXIF tags and zero coordinates', async () => {
    const { queue, deps, drafts } = setup(); await queue.restore(); queue.add([file('a.jpg'),file('b.jpg')]);
    queue.publish(queue.snapshot.items.map(item => item.id)); await tick(); await tick();
    expect(queue.snapshot.items.every(item => item.status === 'saved')).toBe(true);
    expect(deps.geocode).toHaveBeenCalledWith(0, 0);
    expect(deps.publish).toHaveBeenCalledWith('photos/a.jpg', expect.objectContaining({ tags: ['Accra', 'original'] }));
    expect(drafts.size).toBe(0); queue.destroy();
  });
  it('retries publishing without re-uploading the original', async () => {
    const publish = vi.fn().mockRejectedValueOnce(new Error('response lost')).mockResolvedValue({ id: 'saved' });
    const { queue, deps } = setup({ publish }); await queue.restore(); queue.add([file('a.jpg')]); await tick();
    const id = queue.snapshot.items[0].id; queue.publish([id]); await tick();
    expect(queue.snapshot.items[0].status).toBe('error'); queue.retry([id]); await tick();
    expect(queue.snapshot.items[0].status).toBe('saved'); expect(deps.upload).toHaveBeenCalledTimes(1); queue.destroy();
  });
  it('reports invalid files and skips repeated selections', async () => {
    const { queue } = setup(); await queue.restore(); queue.pause();
    queue.add([file('a.jpg'),file('a.jpg'),file('readme.txt'), new File([], 'empty.jpg')]);
    expect(queue.snapshot.items).toHaveLength(1); expect(queue.snapshot.notices).toHaveLength(3); queue.destroy();
  });
  it('removing an in-flight upload cannot restore the removed row', async () => {
    const gate = deferred<{ key: string; publicUrl: string }>();
    const { queue, deps } = setup({ upload: vi.fn(() => gate.promise) }); await queue.restore(); queue.add([file('a.jpg')]); await tick();
    await queue.remove(queue.snapshot.items[0].id); gate.resolve({ key: 'photos/a.jpg', publicUrl: '' }); await tick();
    expect(queue.snapshot.items).toHaveLength(0); expect(deps.discard).toHaveBeenCalledWith('photos/a.jpg'); expect(deps.revoke).toHaveBeenCalled(); queue.destroy();
  });
  it('retains originals for browser recovery and never auto-publishes recovered drafts', async () => {
    const { queue, deps, drafts } = setup(); await queue.restore(); queue.add([file('a.jpg')]); await tick();
    queue.edit(queue.snapshot.items[0].id, { title: 'Keep this title' }); await tick(); queue.destroy();
    const recovered = new UploadQueue(deps); await recovered.restore(); await tick();
    expect(recovered.snapshot.items[0]).toMatchObject({ title: 'Keep this title', status: 'ready', publishRequested: false });
    expect(deps.publish).not.toHaveBeenCalled(); expect(drafts.size).toBe(1); recovered.destroy();
  });
  it('bulk tags append to existing metadata and saved rows cannot be edited', async () => {
    const { queue } = setup(); await queue.restore(); queue.add([file('a.jpg')]); await tick();
    const id = queue.snapshot.items[0].id; queue.apply([id], { tags: ['original', 'travel'], hidden: true });
    expect(queue.snapshot.items[0].tags).toEqual(['Accra', 'original', 'travel']);
    queue.publish([id]); await tick(); queue.edit(id, { title: 'should not change' });
    expect(queue.snapshot.items[0].title).toBe(''); queue.destroy();
  });
});
