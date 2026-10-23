import type { CreateIssuePayload } from '../lib/api';

const DB_NAME = 'nagardrishti-pwa';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const QUEUE_STORE = 'submission-queue';
const DRAFT_ID = 'current-report';

export type ReportDraft = {
  step: number;
  category: CreateIssuePayload['category'];
  description: string;
  language: string;
  photoDataUrl: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

type QueuedSubmission = {
  id: string;
  payload: CreateIssuePayload;
  createdAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage'));
  });
}

export async function saveReportDraft(draft: Omit<ReportDraft, 'updatedAt'>) {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).put({ ...draft, updatedAt: new Date().toISOString() }, DRAFT_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Draft persistence is an enhancement; the report flow remains usable without IndexedDB.
  }
}

export async function loadReportDraft(): Promise<ReportDraft | null> {
  try {
    const db = await openDatabase();
    const draft = await new Promise<ReportDraft | undefined>((resolve, reject) => {
      const request = db.transaction(DRAFT_STORE, 'readonly').objectStore(DRAFT_STORE).get(DRAFT_ID);
      request.onsuccess = () => resolve(request.result as ReportDraft | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return draft ?? null;
  } catch {
    return null;
  }
}

export async function clearReportDraft() {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).delete(DRAFT_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage cleanup failures.
  }
}

export async function queueSubmission(payload: CreateIssuePayload) {
  const queued: QueuedSubmission = { id: crypto.randomUUID(), payload, createdAt: new Date().toISOString() };
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(queued);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return queued;
}

export async function flushQueuedSubmissions(createIssue: (payload: CreateIssuePayload) => Promise<unknown>) {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const queued = await new Promise<QueuedSubmission[]>((resolve, reject) => {
      const request = db!.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll();
      request.onsuccess = () => resolve(request.result as QueuedSubmission[]);
      request.onerror = () => reject(request.error);
    });
    for (const item of queued.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      try {
        await createIssue(item.payload);
        await new Promise<void>((resolve, reject) => {
          const tx = db!.transaction(QUEUE_STORE, 'readwrite');
          tx.objectStore(QUEUE_STORE).delete(item.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Stop at the first failure so the queue preserves ordering and retries later.
        break;
      }
    }
    return queued.length;
  } finally {
    db?.close();
  }
}
