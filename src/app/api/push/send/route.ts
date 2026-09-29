import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAdminApp } from '@/lib/firebase-admin';
import { ApiError, fail, rateLimit, readJson, requireUser, str } from '@/lib/server/guard';
import { authorizeNotification, NOTIFY_TYPES, PUSH_COPY, PUSH_URL, type NotifyType } from '@/lib/server/notify-auth';

// Sends a push to every device the recipient registered.
// Body: { uid, type }            (Authorization: Bearer <ID token>)
//
// The client no longer supplies title/body/url — those are built here from `type` and the
// caller's real profile name, so the endpoint can't be used to push arbitrary phishing
// text to arbitrary users. The caller must have a genuine like/match relationship with the
// recipient, the recipient must not have blocked them, and their notification prefs are
// honoured. Blocked / unrelated requests return a generic success.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req, 2_000);
    const uid = str(body.uid, 128);
    const type = str(body.type, 16) as NotifyType;
    if (!uid || !NOTIFY_TYPES.includes(type)) throw new ApiError(400, 'uid and a valid type are required.');

    await rateLimit(user.db, { bucket: 'push:hr', subject: user.uid, limit: 120, windowMs: 3_600_000 });
    await rateLimit(user.db, { bucket: `push:${type}`, subject: `${user.uid}>${uid}`, limit: type === 'message' ? 1 : 2, windowMs: type === 'message' ? 60_000 : 3_600_000 });

    const d = await authorizeNotification(user.db, user.uid, uid, type);
    if (!d.allowed || !d.pushAllowed) return NextResponse.json({ sent: 0 });

    const privRef = user.db.collection('userPrivate').doc(uid);
    const tokens: string[] = ((await privRef.get()).data()?.fcmTokens ?? []).filter((t: unknown) => typeof t === 'string').slice(0, 20);
    if (tokens.length === 0) return NextResponse.json({ sent: 0 });

    const { title, body: text } = PUSH_COPY[type](d.fromName);
    const url = PUSH_URL[type](d.matchId);
    const result = await getMessaging(getAdminApp()!).sendEachForMulticast({
      tokens,
      notification: { title, body: text },
      webpush: { fcmOptions: { link: url }, notification: { icon: '/next.svg' } },
    });

    const dead = result.responses
      .map((r, i) => (!r.success && isUnregistered(r.error?.code) ? tokens[i] : null))
      .filter((t): t is string => Boolean(t));
    if (dead.length) await privRef.update({ fcmTokens: FieldValue.arrayRemove(...dead) });

    return NextResponse.json({ sent: result.successCount });
  } catch (err) {
    return fail(err);
  }
}

function isUnregistered(code?: string) {
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}
