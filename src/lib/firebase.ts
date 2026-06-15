import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBY9UTcryFEoq8VA1zD7OVnku-fjLxw-p4",
  authDomain: "southern-portfolio.firebaseapp.com",
  databaseURL: "https://southern-portfolio-default-rtdb.firebaseio.com",
  projectId: "southern-portfolio",
  storageBucket: "southern-portfolio.firebasestorage.app",
  messagingSenderId: "501045825605",
  appId: "1:501045825605:android:a0b11c5db57c9831d3932c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize auth with explicit persistence for Capacitor/Android WebView
let auth;
try {
  if (getApps().length === 0) {
    // First initialization - use indexedDB persistence for better Capacitor support
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  // If initializeAuth fails (e.g., already initialized), fall back to getAuth
  auth = getAuth(app);
}

// Initialize Firebase Cloud Messaging (only supported in browsers)
let messaging: any = null;
try {
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        messaging = getMessaging(app);
      }
    }).catch(() => {});
  }
} catch (error) {
  console.warn('Firebase Messaging not available:', error);
}

export { auth, messaging };
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
