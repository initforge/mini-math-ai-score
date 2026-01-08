import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://demo-project-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef'
};

// Check if config is valid
if (!firebaseConfig.projectId || firebaseConfig.projectId === 'demo-project') {
  console.warn('Firebase config chưa được thiết lập. Vui lòng tạo file .env với các giá trị Firebase của bạn.');
}

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create a mock db object to prevent crashes
  db = {
    ref: () => ({ key: 'mock' }),
    get: () => Promise.resolve({ val: () => null }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    push: () => ({ key: 'mock-key' })
  };
}

export { db };

