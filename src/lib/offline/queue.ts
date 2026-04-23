"use client";

/**
 * IndexedDB-based offline action queue.
 * Actions are stored when offline and replayed with exponential backoff when connectivity is restored.
 */

export interface QueuedAction {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

const DB_NAME = "santa-elena-offline";
const STORE_NAME = "action-queue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueAction(
  action: Omit<QueuedAction, "id" | "timestamp" | "attempts" | "maxAttempts">
): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const queuedAction: QueuedAction = {
    ...action,
    id,
    timestamp: Date.now(),
    attempts: 0,
    maxAttempts: 3,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(queuedAction);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedAction[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeAction(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateActionAttempts(id: string, attempts: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const action = getReq.result as QueuedAction;
      if (action) {
        action.attempts = attempts;
        const putReq = store.put(action);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Exponential backoff delay: 1s, 2s, 4s
 */
export function getBackoffDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 4000);
}

/**
 * Replay all pending actions with exponential backoff.
 * Called when network connectivity is restored.
 */
export async function replayPendingActions(): Promise<{
  succeeded: string[];
  failed: string[];
}> {
  const actions = await getPendingActions();
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const action of actions) {
    let success = false;

    for (let attempt = action.attempts; attempt < action.maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, getBackoffDelay(attempt)));
      }

      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: {
            "Content-Type": "application/json",
            ...action.headers,
          },
          body: action.body,
        });

        if (response.ok) {
          await removeAction(action.id);
          succeeded.push(action.id);
          success = true;
          break;
        }
      } catch {
        await updateActionAttempts(action.id, attempt + 1);
      }
    }

    if (!success) {
      failed.push(action.id);
    }
  }

  return { succeeded, failed };
}
