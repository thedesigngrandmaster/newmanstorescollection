// Offline queue for the simplified admin: IndexedDB-backed, survives reloads.

import type { ParsedProduct } from "@/lib/simple-admin/parseProduct";

export type QueueStatus = "pending" | "syncing" | "synced" | "failed";

export type QueuedProduct = {
  id: string;
  text: string;
  images: Blob[];
  createdAt: number;
  status: QueueStatus;
  /** Snapshot of what was understood when the product was added offline. */
  parsed?: ParsedProduct;
  error?: string;
  slug?: string;
  link?: string;
};

const DB_NAME = "nsc-admin";
const STORE = "product-queue";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function listQueue(): Promise<QueuedProduct[]> {
  try {
    const items = await withStore<QueuedProduct[]>(
      "readonly",
      (s) => s.getAll() as IDBRequest<QueuedProduct[]>,
    );
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function putQueued(item: QueuedProduct): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(item) as unknown as IDBRequest<IDBValidKey>);
  } catch {
    // Storage unavailable (private mode) — item is lost, but the app keeps working.
  }
}

export async function getQueued(id: string): Promise<QueuedProduct | undefined> {
  try {
    return await withStore<QueuedProduct | undefined>(
      "readonly",
      (s) => s.get(id) as IDBRequest<QueuedProduct | undefined>,
    );
  } catch {
    return undefined;
  }
}

export async function deleteQueued(id: string): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  } catch {
    // ignore
  }
}

export function newQueueId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
