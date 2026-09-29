'use client';

import { auth } from '@/lib/firebase';
import { authedFetch } from '@/lib/api-client';
import type { ActivityNotification } from '@/lib/types';

// Writes the in-app notification doc (shows up in the bell / notifications list) and, best-effort,
// asks the server to push it to the recipient's devices. Never throws — a failed notification
// should never block the like/match/message action that triggered it.
//
// The server derives the sender's name, the push text and the deep link itself and verifies
// that a real like/match exists, so this only sends the recipient and the kind of event.
// (`fromName` is kept in the signature for existing call sites but is intentionally unused.)
export async function notify(params: {
  toUid: string;
  fromName?: string;
  type: ActivityNotification['type'];
  matchId?: string;
}) {
  const { toUid, type } = params;
  if (!auth.currentUser) return;

  try {
    await authedFetch('/api/notifications/create', { userId: toUid, type });
  } catch (err) {
    console.error('Failed to create activity notification', err);
  }

  try {
    await authedFetch('/api/push/send', { uid: toUid, type });
  } catch (err) {
    // Push is a nice-to-have — swallow network/config errors so the caller's flow isn't affected.
    console.error('Failed to send push notification', err);
  }
}
