/**
 * idbStore.ts
 *
 * Minimal async key-value store backed by IndexedDB.
 * Used as the durable persistence layer (no 5MB cap) alongside localStorage.
 *
 * Pattern: write-through cache
 *   - Writes go to localStorage (sync) AND here (async, durable)
 *   - Reads always hit localStorage (fast, sync)
 *   - On startup, missing localStorage keys are restored from here
 *
 * All methods silently swallow errors — callers never crash on IDB failure.
 */

const DB_NAME = 'tickgame_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

// Singleton DB promise — opened once, reused forever
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // simple key-path store
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Retrieves a value by key. Returns null if not found or on error.
 */
export async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Stores a string value by key.
 */
export async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // silent fail
    });
  } catch {
    // IDB unavailable — silent fail, localStorage is still intact
  }
}

/**
 * Deletes a key from the store.
 */
export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // silent
  }
}

/**
 * Returns all stored key-value pairs as a plain object.
 * Used during app startup to restore missing localStorage keys.
 */
export async function idbGetAll(): Promise<Record<string, string>> {
  try {
    const db = await openDB();
    return new Promise<Record<string, string>>((resolve) => {
      const result: Record<string, string> = {};
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const keys = keysReq.result as string[];
        if (keys.length === 0) {
          resolve(result);
          return;
        }

        let remaining = keys.length;
        for (const key of keys) {
          const valReq = store.get(key);
          valReq.onsuccess = () => {
            if (valReq.result !== undefined) result[key] = valReq.result;
            remaining--;
            if (remaining === 0) resolve(result);
          };
          valReq.onerror = () => {
            remaining--;
            if (remaining === 0) resolve(result);
          };
        }
      };
      keysReq.onerror = () => resolve(result);
    });
  } catch {
    return {};
  }
}

/**
 * Clears all entries from the store.
 */
export async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // silent
  }
}
