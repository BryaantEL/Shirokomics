import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firestore dengan databaseId dan auto-fallback experimentalAutoDetectLongPolling
// untuk menghindari 'Could not reach Cloud Firestore backend' di lingkungan iframe/proxy
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const auth = getAuth(app);

// Helper for anonymous auth fallback if needed
export const ensureFirebaseAuth = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn('Anonymous auth note (offline or disabled):', e);
    }
  }
  return auth.currentUser;
};

