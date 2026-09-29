'use client';

import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';

export type ForegroundPush = { title: string; body: string; url?: string };

let messagingPromise: Promise<import('firebase/messaging').Messaging | null> | null = null;

// Lazily loads firebase/messaging (it touches browser-only APIs, so it can't be imported
// at module scope in a file that might be evaluated during SSR) and checks browser support
// (Safari < 16, older browsers, and non-browser environments don't support the Push API).
async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const { isSupported, getMessaging } = await import('firebase/messaging');
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

export const pushSupported = async () => (await getMessagingInstance()) !== null;

// Requests browser notification permission, registers the service worker, gets an FCM token,
// and saves it to the user's profile so the server can send pushes to this device.
// Returns the token on success, or null if permission was denied / unsupported.
export async function registerPushToken(uid: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — see SETUP.md to enable push notifications.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;

    await setDoc(doc(db, 'userPrivate', uid), { fcmTokens: arrayUnion(token) }, { merge: true });
    return token;
  } catch (err) {
    console.error('Failed to register push token', err);
    return null;
  }
}

// Call on logout (or when disabling notifications) so this device stops receiving pushes.
export async function unregisterPushToken(uid: string, token: string) {
  try {
    await setDoc(doc(db, 'userPrivate', uid), { fcmTokens: arrayRemove(token) }, { merge: true });
  } catch (err) {
    console.error('Failed to unregister push token', err);
  }
}

// FCM only auto-shows a system notification when the tab is backgrounded (handled by the
// service worker). While the tab is focused, "foreground" messages arrive here instead —
// use this to show an in-app toast.
export async function listenForegroundPush(cb: (payload: ForegroundPush) => void): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, (payload) => {
    cb({
      title: payload.notification?.title ?? 'Flirty',
      body: payload.notification?.body ?? '',
      url: payload.fcmOptions?.link ?? payload.data?.url,
    });
  });
}
