import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ApiError, fail, rateLimit, requireUser } from '@/lib/server/guard';

// Full account deletion, done server-side with the Admin SDK so NOTHING is left behind:
//   profile + private docs, profile photos & verification selfies in Storage, likes given and
//   received, every match with its messages / typing / game subcollections, notifications
//   sent and received, photo hashes, and the phone/email uniqueness claims. Finally the
//   Auth user itself is deleted.
// Retained on purpose (safety/legal): reports filed against the user, and — if the account
// was suspended/banned — the moderation record and a blockedIdentities entry so a banned
// person can't simply delete and re-register with the same phone/email.
// Requires a recent sign-in (last 10 minutes); otherwise answers 401 { code: 'reauth-required' }.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, { strict: true, allowRestricted: true });
    if (Date.now() / 1000 - (user.token.auth_time ?? 0) > 600) {
      throw new ApiError(401, 'Please sign in again to delete your account.', { code: 'reauth-required' });
    }
    await rateLimit(user.db, { bucket: 'account-delete', subject: user.uid, limit: 3, windowMs: 3_600_000 });

    const { uid, db } = user;
    const app = getAdminApp()!;
    const authRecord = await getAuth(app).getUser(uid).catch(() => null);
    const [pubSnap, privSnap, modSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('userPrivate').doc(uid).get(),
      db.collection('moderation').doc(uid).get(),
    ]);
    const phone = authRecord?.phoneNumber ?? privSnap.data()?.phone ?? pubSnap.data()?.phone ?? null;
    const email = authRecord?.email ?? privSnap.data()?.email ?? pubSnap.data()?.email ?? null;
    const modStatus = modSnap.data()?.status as string | undefined;
    const keepModeration = modStatus === 'banned' || modStatus === 'suspended';

    // Storage
    const bucket = getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    await Promise.all([
      bucket.deleteFiles({ prefix: `profile-photos/${uid}/`, force: true }),
      bucket.deleteFiles({ prefix: `verification-selfies/${uid}/`, force: true }),
    ]).catch((e) => console.error('storage cleanup', e));

    // Matches (+ messages, typing, games)
    const matches = await db.collection('matches').where('users', 'array-contains', uid).get();
    for (const m of matches.docs) await db.recursiveDelete(m.ref);

    // Likes, notifications, photo hashes
    await deleteQuery(db, db.collection('likes').where('from', '==', uid));
    await deleteQuery(db, db.collection('likes').where('to', '==', uid));
    await deleteQuery(db, db.collection('interests').where('from', '==', uid));
    await deleteQuery(db, db.collection('interests').where('to', '==', uid));
    await deleteQuery(db, db.collection('shortlists').where('owner', '==', uid));
    await deleteQuery(db, db.collection('shortlists').where('target', '==', uid));
    await deleteQuery(db, db.collection('profileViews').where('viewer', '==', uid));
    await deleteQuery(db, db.collection('profileViews').where('target', '==', uid));
    await deleteQuery(db, db.collection('notifications').where('userId', '==', uid));
    await deleteQuery(db, db.collection('notifications').where('fromUid', '==', uid));
    await deleteQuery(db, db.collection('photoHashes').where('uid', '==', uid));
    await deleteQuery(db, db.collection('abuseSignals').where('uid', '==', uid));

    // Identity claims
    if (phone) {
      await db.collection('phoneIndex').doc(phone).delete();
      if (keepModeration) await db.collection('blockedIdentities').doc(phone).set({ uid, at: Date.now() });
    }
    if (email) {
      await db.collection('emailIndex').doc(email).delete();
      if (keepModeration) await db.collection('blockedIdentities').doc(email).set({ uid, at: Date.now() });
    }

    // Profile docs
    await Promise.all([db.collection('users').doc(uid).delete(), db.collection('userPrivate').doc(uid).delete()]);
    if (!keepModeration) await db.collection('moderation').doc(uid).delete();

    await getAuth(app).deleteUser(uid).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

async function deleteQuery(db: Firestore, q: FirebaseFirestore.Query) {
  for (;;) {
    const snap = await q.limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < 400) return;
  }
}
