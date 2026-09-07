import type { ClientExif } from '@/exif/client';
import type { GeocodeResult } from '@/platforms/google-maps';
import type { PhotoOverrides, UploadedFile, UploadOptions } from './upload-client';
import { fileIdentity, validateUpload } from './upload-policy';

export type UploadStatus = 'queued' | 'reading' | 'uploading' | 'ready' | 'saving' | 'saved' | 'error';
export interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  exif?: ClientExif;
  key?: string;
  photoId?: string;
  error?: string;
  title: string;
  caption: string;
  tags: string[];
  locationName: string;
  hidden: boolean;
  publishRequested: boolean;
}
export type UploadDraft = Omit<UploadItem, 'previewUrl'>;
export interface DraftStore {
  load(): Promise<UploadDraft[]>;
  put(item: UploadDraft): Promise<void>;
  delete(id: string): Promise<void>;
}
export interface QueueDependencies {
  extract(file: File): Promise<ClientExif>;
  geocode(lat: number, lng: number): Promise<GeocodeResult | undefined>;
  upload(file: File, options: UploadOptions): Promise<UploadedFile>;
  publish(key: string, overrides: PhotoOverrides): Promise<{ id: string }>;
  discard(key: string): Promise<void>;
  store: DraftStore;
  preview(file: File): string;
  revoke(url: string): void;
}
export interface QueueSnapshot {
  items: UploadItem[];
  paused: boolean;
  restoring: boolean;
  notices: string[];
}
const BUSY = new Set<UploadStatus>(['reading', 'uploading', 'saving']);

/** A bounded queue shared by single-photo review and batch publishing. */
export class UploadQueue {
  private state: QueueSnapshot = { items: [], paused: false, restoring: true, notices: [] };
  private listeners = new Set<(state: QueueSnapshot) => void>();
  private active = new Set<string>();
  private controllers = new Map<string, AbortController>();
  private writes = new Map<string, Promise<void>>();
  private disposed = false;
  private pumping = false;
  constructor(private deps: QueueDependencies, private concurrency = 3) {}
  get snapshot() { return this.state; }
  subscribe(listener: (state: QueueSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }
  private emit() { if (!this.disposed) this.listeners.forEach(listener => listener(this.state)); }
  private notice(message: string) {
    this.state = { ...this.state, notices: [...new Set([...this.state.notices, message])] };
    this.emit();
  }
  clearNotices() { this.state = { ...this.state, notices: [] }; this.emit(); }
  private find(id: string) { return this.state.items.find(item => item.id === id); }
  private write(id: string, task: () => Promise<void>) {
    const prior = this.writes.get(id) ?? Promise.resolve();
    const next = prior.then(task).catch(() => this.notice('Browser recovery storage is unavailable or full. Keep this tab open until your photographs are published.'));
    this.writes.set(id, next);
    void next.finally(() => { if (this.writes.get(id) === next) this.writes.delete(id); });
  }
  private persist(item: UploadItem) {
    const { previewUrl: _preview, ...draft } = item;
    this.write(item.id, () => item.status === 'saved' ? this.deps.store.delete(item.id) : this.deps.store.put(draft));
  }
  private patch(id: string, patch: Partial<UploadItem>, persist = true) {
    if (this.disposed || !this.find(id)) return;
    this.state = { ...this.state, items: this.state.items.map(item => item.id === id ? { ...item, ...patch } : item) };
    if (persist) this.persist(this.find(id)!);
    this.emit();
  }
  async restore() {
    try {
      const drafts = await this.deps.store.load();
      if (this.disposed) return;
      const items = drafts.map<UploadItem>(draft => ({
        ...draft, previewUrl: this.deps.preview(draft.file), publishRequested: false,
        status: draft.status === 'saving' ? 'error' : draft.key ? 'ready' : 'queued',
        error: draft.status === 'saving' ? 'Publishing was interrupted. Retry to check whether this photo was saved.' : undefined,
      }));
      this.state = { ...this.state, items };
      if (items.length) this.notice(`Recovered ${items.length} unfinished photograph${items.length === 1 ? '' : 's'}. Review before publishing.`);
    } catch { this.notice('Browser recovery storage is unavailable. Keep this tab open until publishing finishes.'); }
    finally {
      if (!this.disposed) { this.state = { ...this.state, restoring: false }; this.emit(); this.pump(); }
    }
  }
  add(files: File[]) {
    if (this.state.restoring || this.disposed) return;
    const identities = new Set(this.state.items.map(item => fileIdentity(item.file)));
    const added: UploadItem[] = [];
    let duplicates = 0;
    for (const file of files) {
      const error = validateUpload(file);
      if (error) { this.notice(`${file.name}: ${error}`); continue; }
      const identity = fileIdentity(file);
      if (identities.has(identity)) { duplicates++; continue; }
      identities.add(identity);
      added.push({ id: crypto.randomUUID(), file, previewUrl: this.deps.preview(file), status: 'queued', progress: 0,
        title: '', caption: '', tags: [], locationName: '', hidden: false, publishRequested: false });
    }
    this.state = { ...this.state, items: [...this.state.items, ...added] };
    added.forEach(item => this.persist(item));
    if (duplicates) this.notice(`Skipped ${duplicates} file${duplicates === 1 ? '' : 's'} already in this queue.`);
    this.emit(); this.pump();
  }
  edit(id: string, values: Partial<Pick<UploadItem, 'title' | 'caption' | 'tags' | 'locationName' | 'hidden'>>) {
    const item = this.find(id);
    if (!item || BUSY.has(item.status) || item.status === 'saved') return;
    this.patch(id, values);
  }
  apply(ids: string[], values: Partial<Pick<UploadItem, 'tags' | 'locationName' | 'hidden'>>) {
    for (const id of ids) {
      const item = this.find(id);
      if (item) this.edit(id, { ...values, ...(values.tags ? { tags: Array.from(new Set([...item.tags, ...values.tags])) } : {}) });
    }
  }
  pause() { this.state = { ...this.state, paused: true }; this.emit(); }
  resume() { this.state = { ...this.state, paused: false }; this.emit(); this.pump(); }
  publish(ids: string[]) {
    for (const id of ids) {
      const item = this.find(id);
      if (!item || item.status === 'saved' || item.status === 'saving' || item.status === 'error') continue;
      this.patch(id, { publishRequested: true });
    }
    this.pump();
  }
  retry(ids: string[]) {
    for (const id of ids) {
      const item = this.find(id);
      if (item?.status === 'error') this.patch(id, { status: item.key ? 'ready' : 'queued', publishRequested: item.key ? true : item.publishRequested, error: undefined });
    }
    this.pump();
  }
  async remove(id: string) {
    const item = this.find(id);
    if (!item || item.status === 'saving') return;
    this.controllers.get(id)?.abort();
    this.state = { ...this.state, items: this.state.items.filter(row => row.id !== id) };
    this.deps.revoke(item.previewUrl);
    this.write(id, () => this.deps.store.delete(id));
    this.emit();
    if (item.key && item.status !== 'saved') await this.deps.discard(item.key);
  }
  private pump() {
    if (this.pumping || this.disposed || this.state.paused || this.state.restoring) return;
    this.pumping = true;
    while (this.active.size < this.concurrency) {
      const item = this.state.items.find(item => !this.active.has(item.id) &&
        (item.status === 'queued' || (item.status === 'ready' && item.publishRequested)));
      if (!item) break;
      this.active.add(item.id);
      void this.run(item).finally(() => {
        this.active.delete(item.id); this.controllers.delete(item.id); this.pump();
      });
    }
    this.pumping = false;
  }
  private async run(initial: UploadItem) {
    const id = initial.id;
    const controller = new AbortController();
    this.controllers.set(id, controller);
    try {
      if (!initial.key) {
        this.patch(id, { status: 'reading', error: undefined });
        const exif = await this.deps.extract(initial.file);
        if (controller.signal.aborted || this.disposed || !this.find(id)) return;
        let location: GeocodeResult | undefined;
        if (exif.latitude != null && exif.longitude != null) location = await this.deps.geocode(exif.latitude, exif.longitude);
        if (controller.signal.aborted || this.disposed || !this.find(id)) return;
        const current = this.find(id)!;
        this.patch(id, { exif, title: current.title || exif.title || '', caption: current.caption || exif.caption || '',
          tags: Array.from(new Set([...current.tags, ...(location?.city ? [location.city] : []), ...(exif.tags ?? [])])),
          locationName: current.locationName || location?.formatted || '', status: 'uploading', progress: 0 });
        const uploaded = await this.deps.upload(initial.file, {
          signal: controller.signal,
          onProgress: progress => this.patch(id, { progress }, false),
        });
        if (this.disposed) {
          // The PUT may have completed just as navigation occurred; retain its key for recovery.
          const item = this.find(id);
          if (item) this.persist({ ...item, key: uploaded.key, status: 'ready', progress: 100 });
          return;
        }
        if (!this.find(id)) { await this.deps.discard(uploaded.key); return; }
        this.patch(id, { key: uploaded.key, status: 'ready', progress: 100 });
      } else {
        this.patch(id, { status: 'saving', error: undefined });
        const item = this.find(id)!;
        const photo = await this.deps.publish(initial.key, {
          title: item.title, caption: item.caption, tags: item.tags, locationName: item.locationName, hidden: item.hidden,
        });
        if (this.disposed) { this.write(id, () => this.deps.store.delete(id)); return; }
        this.patch(id, { status: 'saved', photoId: photo.id, publishRequested: false });
      }
    } catch (error) {
      if (!this.disposed && this.find(id)) this.patch(id, { status: 'error', error: error instanceof Error ? error.message : 'Something went wrong. Please retry.' });
    }
  }
  destroy() {
    this.disposed = true;
    this.controllers.forEach(controller => controller.abort());
    this.state.items.forEach(item => this.deps.revoke(item.previewUrl));
    this.listeners.clear();
  }
}
