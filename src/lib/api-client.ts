'use client';

import { auth } from '@/lib/firebase';

// Every call to our own /api routes goes through here so the caller's ID token (and the
// App Check token, when enabled) always travel in headers — never in the request body.
export async function authedFetch(path: string, body?: unknown, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const idToken = await user.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  try {
    const { getAppCheckToken } = await import('@/lib/firebase');
    const t = await getAppCheckToken();
    if (t) headers['X-Firebase-AppCheck'] = t;
  } catch { /* App Check not configured */ }
  return fetch(path, { method: 'POST', ...init, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
