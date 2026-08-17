// Minimal promise-based IndexedDB wrapper. No external deps — this is the
// offline-first source of truth on the device until a closure/work order syncs.
const DB_NAME = 'parks-pm-db';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('closures')) {
        const s = db.createObjectStore('closures', { keyPath: 'id', autoIncrement: true });
        s.createIndex('taskId', 'taskId');
        s.createIndex('dateKey', 'dateKey');
        s.createIndex('syncState', 'syncState');
      }
      if (!db.objectStoreNames.contains('workOrders')) {
        const s = db.createObjectStore('workOrders', { keyPath: 'id', autoIncrement: true });
        s.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('syncQueue')) {
        const s = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        s.createIndex('refType_refId', ['refType', 'refId']);
      }
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeNames, mode = 'readonly') {
  return openDB().then((db) => db.transaction(storeNames, mode));
}

export async function getAll(store, indexName, query) {
  const t = await tx([store]);
  return new Promise((resolve, reject) => {
    const os = t.objectStore(store);
    const target = indexName ? os.index(indexName) : os;
    const req = query !== undefined ? target.getAll(query) : target.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(store, key) {
  const t = await tx([store]);
  return new Promise((resolve, reject) => {
    const req = t.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, value) {
  const t = await tx([store], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore(store).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function add(store, value) {
  const t = await tx([store], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore(store).add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function del(store, key) {
  const t = await tx([store], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore(store).delete(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(store) {
  const t = await tx([store], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function count(store) {
  const t = await tx([store]);
  return new Promise((resolve, reject) => {
    const req = t.objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export { openDB };
