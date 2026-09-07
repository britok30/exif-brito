import type { DraftStore, UploadDraft } from './upload-queue';

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('brito-photo-uploads', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Recovery storage is blocked by another tab.'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['drafts', 'files'], mode);
    let result: T;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    run(tx, value => { result = value; });
  });
}
export const uploadDraftStore: DraftStore = {
  load: () => transaction('readonly', (tx, done) => {
    const request = tx.objectStore('drafts').getAll();
    request.onsuccess = () => {
      const drafts = request.result as UploadDraft[];
      const result: UploadDraft[] = [];
      for (const draft of drafts) {
        // Read pre-v2 drafts too. New records store each original only once.
        if (draft.file) result.push(draft);
        else {
          const file = tx.objectStore('files').get(draft.id);
          file.onsuccess = () => { if (file.result) result.push({ ...draft, file: file.result }); };
        }
      }
      done(result);
    };
  }),
  put: item => transaction('readwrite', (tx, done) => {
    const files = tx.objectStore('files');
    const exists = files.getKey(item.id);
    exists.onsuccess = () => { if (exists.result === undefined) files.put(item.file, item.id); };
    const { file: _file, ...metadata } = item;
    tx.objectStore('drafts').put(metadata);
    done(undefined);
  }),
  delete: id => transaction('readwrite', (tx, done) => {
    tx.objectStore('drafts').delete(id);
    tx.objectStore('files').delete(id);
    done(undefined);
  }),
};
