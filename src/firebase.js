import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBvasH4OqU76196ZmZSXX_e8-L2PYnvyaY',
  authDomain: 'chore-tracker-a461b.firebaseapp.com',
  databaseURL: 'https://chore-tracker-a461b-default-rtdb.firebaseio.com',
  projectId: 'chore-tracker-a461b',
  storageBucket: 'chore-tracker-a461b.firebasestorage.app',
  messagingSenderId: '282740057913',
  appId: '1:282740057913:web:72defcf2e53ae13237eae8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence for tablet-first usage
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported');
  }
});

// Sign in anonymously on load
let initPromise;
export function ensureAuth() {
  if (!initPromise) {
    initPromise = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user);
        } else {
          signInAnonymously(auth).then(resolve);
        }
      });
    });
  }
  return initPromise;
}
