import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

// This site is server-side rendered, and the Firebase web SDK is a browser
// library (the SSR pass also has no signed-in user and no live session to work
// with). So every Firebase-backed call in the app is guarded by this check and
// simply resolves to empty on the server; the browser fetches the real data
// again the moment the page hydrates.
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

let cachedApp: FirebaseApp | null = null;

// Lazily create (or reuse) the single Firebase app instance. Reusing an already
// registered app matters during dev-server hot reloads, which would otherwise
// try to initialise the same app twice and throw.
export function firebaseApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
  }
  return cachedApp;
}

export function db(): Firestore {
  return getFirestore(firebaseApp());
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}
