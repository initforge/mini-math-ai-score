import { 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  onValue, 
  off,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  startAt,
  endAt
} from 'firebase/database';
import { db } from './firebase';

export const databaseService = {
  // CRUD Operations
  async create(path, data) {
    const newRef = push(ref(db, path));
    await set(newRef, {
      ...data,
      createdAt: Date.now()
    });
    return newRef.key;
  },

  async read(path) {
    const snapshot = await get(ref(db, path));
    return snapshot.val();
  },

  async update(path, data) {
    // Don't auto-add updatedAt if we're setting specific timestamps
    const hasTimestamp = data.startedAt || data.submittedAt || data.createdAt;
    if (hasTimestamp) {
      await update(ref(db, path), data);
    } else {
      await update(ref(db, path), {
        ...data,
        updatedAt: Date.now()
      });
    }
  },

  async delete(path) {
    await remove(ref(db, path));
  },

  // Realtime listeners
  subscribe(path, callback) {
    const dbRef = ref(db, path);
    onValue(dbRef, (snapshot) => {
      callback(snapshot.val());
    });
    return () => off(dbRef);
  },

  // Query helpers
  async queryByChild(path, childKey, value) {
    const dbRef = ref(db, path);
    const q = query(dbRef, orderByChild(childKey), equalTo(value));
    const snapshot = await get(q);
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data).map(([id, item]) => ({ id, ...item }));
  },

  // Pagination
  async paginate(path, pageSize = 20, startKey = null) {
    let q = query(ref(db, path), limitToFirst(pageSize));
    if (startKey) {
      q = query(q, startAt(startKey));
    }
    const snapshot = await get(q);
    const data = snapshot.val();
    if (!data) return { items: [], lastKey: null };
    const items = Object.entries(data).map(([id, item]) => ({ id, ...item }));
    const lastKey = items[items.length - 1]?.id || null;
    return { items, lastKey };
  }
};

