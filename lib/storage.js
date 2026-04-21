(function () {
  const DB_NAME = "eventmaker-atlas-extension";
  const DB_VERSION = 1;
  const STORE_NAME = "eventSnapshots";
  const LEGACY_KEY_PREFIX = "atlas:event:";

  async function readEventCache(eventId) {
    const db = await openDatabase();
    const cached = await runRequest(db, STORE_NAME, "readonly", (store) => store.get(eventId));
    if (cached) return cached;

    const legacy = await readLegacyCache(eventId);
    if (legacy) {
      await writeEventCache(eventId, legacy.snapshot || legacy);
      await clearLegacyCache(eventId);
      return await runRequest(db, STORE_NAME, "readonly", (store) => store.get(eventId));
    }

    return null;
  }

  async function writeEventCache(eventId, snapshot) {
    const db = await openDatabase();
    const payload = {
      eventId,
      version: 1,
      updatedAt: new Date().toISOString(),
      snapshot
    };
    await runRequest(db, STORE_NAME, "readwrite", (store) => store.put(payload));
    await clearLegacyCache(eventId);
  }

  async function clearEventCache(eventId) {
    const db = await openDatabase();
    await runRequest(db, STORE_NAME, "readwrite", (store) => store.delete(eventId));
    await clearLegacyCache(eventId);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "eventId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Impossible d'ouvrir IndexedDB."));
    });
  }

  function runRequest(db, storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      transaction.oncomplete = () => {
        if (request && "result" in request) resolve(request.result);
        else resolve(undefined);
      };
      transaction.onerror = () => reject(transaction.error || request?.error || new Error("Transaction IndexedDB échouée."));
      transaction.onabort = () => reject(transaction.error || request?.error || new Error("Transaction IndexedDB annulée."));
      if (request) request.onerror = () => reject(request.error || new Error("Requête IndexedDB échouée."));
    });
  }

  async function readLegacyCache(eventId) {
    const key = `${LEGACY_KEY_PREFIX}${eventId}`;
    const data = await chrome.storage.local.get([key]);
    return data[key] || null;
  }

  async function clearLegacyCache(eventId) {
    const key = `${LEGACY_KEY_PREFIX}${eventId}`;
    await chrome.storage.local.remove([key]);
  }

  window.AtlasStorage = {
    readEventCache,
    writeEventCache,
    clearEventCache
  };
})();
