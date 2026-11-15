import type { CreateIssuePayload } from '../lib/api';

const DB_NAME = 'nagardrishti-pwa';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const QUEUE_STORE = 'submission-queue';
const DRAFT_ID = 'current-report';

export const OFFLINE_QUEUE_UPDATED_EVENT = 'nd-offline-queue-updated';

let isFlushing = false;
let activeFlushPromise: Promise<number> | null = null;

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

export type QueuedSubmission = {
  id: string;
  payload: CreateIssuePayload;
  createdAt: string;
  status?: 'pending' | 'failed';
  error?: string;
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `offline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyQueueUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_UPDATED_EVENT));
  }
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  if (err instanceof Error) {
    const match = err.message.match(/\b(?:HTTP|API error)\s+(\d{3})\b/i);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
        if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage'));
      request.onblocked = () => reject(new Error('Offline storage is blocked'));
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Unable to open offline storage'));
    }
  });
}

export async function saveReportDraft(draft: Omit<ReportDraft, 'updatedAt'>) {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).put({ ...draft, updatedAt: new Date().toISOString() }, DRAFT_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Draft persistence is an enhancement; the report flow remains usable without IndexedDB.
  } finally {
    db?.close();
  }
}

export async function loadReportDraft(): Promise<ReportDraft | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const draft = await new Promise<ReportDraft | undefined>((resolve, reject) => {
      const request = db!.transaction(DRAFT_STORE, 'readonly').objectStore(DRAFT_STORE).get(DRAFT_ID);
      request.onsuccess = () => resolve(request.result as ReportDraft | undefined);
      request.onerror = () => reject(request.error);
    });
    return draft ?? null;
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export async function clearReportDraft() {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).delete(DRAFT_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage cleanup failures.
  } finally {
    db?.close();
  }
}

export async function queueSubmission(payload: CreateIssuePayload): Promise<QueuedSubmission> {
  const queued: QueuedSubmission = {
    id: generateId(),
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).put(queued);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyQueueUpdated();
    return queued;
  } finally {
    db?.close();
  }
}

export async function getQueuedSubmissions(): Promise<QueuedSubmission[]> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const items = await new Promise<QueuedSubmission[]>((resolve, reject) => {
      const request = db!.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll();
      request.onsuccess = () => resolve((request.result as QueuedSubmission[]) ?? []);
      request.onerror = () => reject(request.error);
    });
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

export async function removeQueuedSubmission(id: string): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyQueueUpdated();
  } catch {
    // Ignore deletion errors when IndexedDB is unavailable.
  } finally {
    db?.close();
  }
}

export async function flushQueuedSubmissions(
  createIssue: (payload: CreateIssuePayload) => Promise<unknown>
): Promise<number> {
  if (isFlushing && activeFlushPromise) {
    return activeFlushPromise;
  }
  isFlushing = true;
  activeFlushPromise = (async () => {
    let db: IDBDatabase | null = null;
    let flushedCount = 0;
    try {
      db = await openDatabase();
      const queued = await new Promise<QueuedSubmission[]>((resolve, reject) => {
        const request = db!.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll();
        request.onsuccess = () => resolve((request.result as QueuedSubmission[]) ?? []);
        request.onerror = () => reject(request.error);
      });
      const pending = queued
        .filter((item) => item.status !== 'failed')
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

      for (const item of pending) {
        try {
          await createIssue(item.payload);
          await new Promise<void>((resolve, reject) => {
            const tx = db!.transaction(QUEUE_STORE, 'readwrite');
            tx.objectStore(QUEUE_STORE).delete(item.id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          flushedCount++;
          notifyQueueUpdated();
        } catch (err) {
          const status = getErrorStatus(err);
          const isDeterministic4xx =
            status !== undefined &&
            status >= 400 &&
            status < 500 &&
            status !== 401 &&
            status !== 408 &&
            status !== 429;
          if (isDeterministic4xx) {
            const errorMessage = err instanceof Error ? err.message : 'Submission rejected';
            console.warn('[pwa] marking queued submission failed after 4xx response', item.id, status, errorMessage);
            await new Promise<void>((resolve, reject) => {
              const tx = db!.transaction(QUEUE_STORE, 'readwrite');
              tx.objectStore(QUEUE_STORE).put({
                ...item,
                status: 'failed',
                error: errorMessage,
              });
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            }).catch(() => {});
            notifyQueueUpdated();
            continue;
          }
          // Transient network/5xx/401/429 error: stop and preserve ordering for later retry.
          break;
        }
      }
      return flushedCount;
    } catch (err) {
      console.warn('[pwa] offline queue unavailable during flush', err);
      return flushedCount;
    } finally {
      db?.close();
      isFlushing = false;
      activeFlushPromise = null;
    }
  })();
  return activeFlushPromise;
}
