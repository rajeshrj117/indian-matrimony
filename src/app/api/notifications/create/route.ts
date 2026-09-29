import { NextRequest, NextResponse } from 'next/server';
import { ApiError, fail, rateLimit, readJson, requireUser, str } from '@/lib/server/guard';
import { authorizeNotification, NOTIFY_TYPES, type NotifyType } from '@/lib/server/notify-auth';

// Creates an in-app activity notification for ANOTHER user ("X liked you"). Uses the Admin
// SDK because the recipient isn't the caller, so a client-side write can never satisfy the
// /notifications rules. Because it bypasses those rules, everything is verified here:
//   - the caller must be signed in (Authorization: Bearer <ID token>)
//   - the sender name is taken from the caller's own profile, never from the request
//   - the caller must actually have liked / matched the recipient (see authorizeNotification)
//   - blocked pairs are silently dropped, and every caller/recipient pair is rate limited
// Body: { userId, type, matchId? }
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req, 2_000);
    const userId = str(body.userId, 128);
    const type = str(body.type, 16) as NotifyType;
    if (!userId || !NOTIFY_TYPES.includes(type)) throw new ApiError(400, 'userId and a valid type are required.');

    await rateLimit(user.db, { bucket: 'notif:hr', subject: user.uid, limit: 120, windowMs: 3_600_000 });
    await rateLimit(user.db, { bucket: `notif:${type}`, subject: `${user.uid}>${userId}`, limit: type === 'message' ? 1 : 2, windowMs: type === 'message' ? 60_000 : 3_600_000 });

    const d = await authorizeNotification(user.db, user.uid, userId, type);
    if (!d.allowed) return NextResponse.json({ ok: true }); // generic — never reveal blocks

    const ref = await user.db.collection('notifications').add({
      userId,
      type,
      fromUser: d.fromName,
      fromUid: user.uid,
      ...(d.matchId ? { matchId: d.matchId } : {}),
      read: false,
      createdAt: Date.now(),
    });
    return NextResponse.json({ id: ref.id });
  } catch (err) {
    return fail(err);
  }
}
