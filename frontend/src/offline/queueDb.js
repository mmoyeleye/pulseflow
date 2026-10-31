import { openDB } from 'idb';

const STORE = 'actions';

const dbPromise = openDB('gopd-offline', 1, {
  upgrade(db) {
    db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
  }
});

export async function enqueue(action) {
  const db = await dbPromise;
  return db.add(STORE, { ...action, createdAt: new Date().toISOString() });
}

export async function listPending() {
  const db = await dbPromise;
  return db.getAll(STORE); // returned in the order they were added
}

export async function removeAction(id) {
  const db = await dbPromise;
  return db.delete(STORE, id);
}