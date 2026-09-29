import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckTokenRaw, type AppCheck } from 'firebase/app-check';

// Fill these from your Firebase project's web app config
// (Firebase console → Project settings → General → Your apps → SDK setup and configuration)
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Guard so `next build` never crashes if env vars aren't set yet (e.g. first deploy preview).
// At runtime in the browser, missing config will surface as a clear Firebase error instead of a build failure.
const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = getApps().length
  ? getApp()
  : initializeApp(
      hasConfig
        ? firebaseConfig
        : {
            apiKey: 'missing-api-key',
            authDomain: 'missing.firebaseapp.com',
            projectId: 'missing-project',
            storageBucket: 'missing-project.appspot.com',
            messagingSenderId: '0',
            appId: '0:0:web:0',
          }
    );

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const firebaseConfigured = hasConfig;

// Optional: point at local emulators during development by setting
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.local
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' &&
  !(globalThis as typeof globalThis & { __FLIRTY_EMULATORS_CONNECTED__?: boolean }).__FLIRTY_EMULATORS_CONNECTED__
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  (globalThis as typeof globalThis & { __FLIRTY_EMULATORS_CONNECTED__?: boolean }).__FLIRTY_EMULATORS_CONNECTED__ = true;
}

// Optional App Check (device/app attestation). Enable by setting NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
// then set ENFORCE_APP_CHECK=true on the server once you've confirmed tokens are flowing.
let appCheck: AppCheck | null = null;
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Already initialised (fast refresh) — ignore.
  }
}

export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheck) return null;
  try {
    return (await getAppCheckTokenRaw(appCheck)).token;
  } catch {
    return null;
  }
}
