import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBvasH4OqU76196ZmZSXX_e8-L2PYnvyaY',
  authDomain: 'chore-tracker-a461b.firebaseapp.com',
  projectId: 'chore-tracker-a461b',
  storageBucket: 'chore-tracker-a461b.firebasestorage.app',
  messagingSenderId: '282740057913',
  appId: '1:282740057913:web:72defcf2e53ae13237eae8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function registerParent(email, password) {
  if (auth.currentUser?.isAnonymous) {
    const credential = EmailAuthProvider.credential(email, password);
    return linkWithCredential(auth.currentUser, credential);
  }
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInParent(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOutParent() {
  return signOut(auth);
}

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
      let settled = false;
      let unsub = () => {};
      const finish = (user) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        unsub();
        resolve(user);
      };
      const timeout = setTimeout(() => {
        console.warn('Authentication timed out; continuing in local-only mode');
        finish(null);
      }, 5000);
      unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          finish(user);
        } else {
          // If anonymous auth is disabled or the network is down, resolve
          // with null so the app falls through to local-only mode instead of
          // hanging forever on a never-settled promise.
          signInAnonymously(auth)
            .then((cred) => finish(cred.user))
            .catch((err) => {
              console.warn('Anonymous sign-in failed; continuing offline:', err);
              finish(null);
            });
        }
      }, (err) => {
        console.warn('Authentication state could not be read:', err);
        finish(null);
      });
    });
  }
  return initPromise;
}
