(() => {
  "use strict";

  const DATABASE_NAME = "VeloraRecordsDB";
  const DATABASE_VERSION = 1;
  const STORE_NAME = "records";
  let databasePromise;

  function openDatabase() {
    if (!("indexedDB" in window)) {
      return Promise.reject(new Error("IndexedDB is not supported in this browser."));
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          ["title", "category", "status", "date", "updatedAt"].forEach((key) => {
            store.createIndex(key, key, { unique: false });
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        databasePromise = null;
        reject(request.error || new Error("Unable to open the local database."));
      };
      request.onblocked = () => reject(new Error("Database upgrade is blocked. Close other VELORA tabs and retry."));
    });

    return databasePromise;
  }

  async function transact(mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let result;
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error("The database transaction failed."));
      transaction.onabort = () => reject(transaction.error || new Error("The database transaction was cancelled."));
      try {
        operation(store, (value) => { result = value; });
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }

  window.VeloraDB = Object.freeze({
    openDatabase,
    add: (record) => transact("readwrite", (store) => store.add(record)),
    update: (record) => transact("readwrite", (store) => store.put(record)),
    remove: (id) => transact("readwrite", (store) => store.delete(id)),
    clear: () => transact("readwrite", (store) => store.clear()),
    get: (id) => transact("readonly", (store, set) => {
      const request = store.get(id);
      request.onsuccess = () => set(request.result || null);
    }),
    getAll: () => transact("readonly", (store, set) => {
      const request = store.getAll();
      request.onsuccess = () => set(request.result || []);
    }),
    importRecords: (records) => transact("readwrite", (store) => {
      records.forEach((record) => store.put(record));
    })
  });
})();
