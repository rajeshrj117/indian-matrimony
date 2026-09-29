import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

// Server-only. Never import this from a 'use client' file or a component that runs in the
// browser — it uses a service account with elevated privileges and must not be bundled client-side.

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Private keys are usually stored with literal "\n" in env vars (e.g. Vercel's env UI)
  // and need to be converted back to real newlines.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      'FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY are not set — ' +
        'push notifications cannot be sent from the server. See SETUP.md.'
    );
    return null;
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}
