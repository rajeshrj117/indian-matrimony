import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';
import { ApiError, fail, readJson, rateLimit, clientIp } from '@/lib/server/guard';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export async function POST(req: NextRequest) {
  try {
    const app = getAdminApp();
    if (!app) throw new ApiError(500, 'Server not configured.');
    const db = getFirestore(app);

    const body = await readJson<{ email?: string; code?: string }>(req, 2_000);
    const email = String(body.email ?? '').trim().toLowerCase();
    const code = String(body.code ?? '').trim();
    if (!email || !/^\d{6}$/.test(code)) throw new ApiError(400, 'Enter the 6-digit code.');

    await rateLimit(db, { bucket: 'eotp-verify-ip', subject: clientIp(req), limit: 30, windowMs: 3_600_000 });

    const ref = db.collection('emailOtps').doc(sha(email));
    const snap = await ref.get();
    const data = snap.data() as { codeHash: string; attempts: number; expiresAt: number } | undefined;
    if (!data || data.expiresAt < Date.now()) {
      throw new ApiError(400, 'Code expired. Please request a new one.');
    }
    if (data.attempts >= 5) {
      await ref.delete();
      throw new ApiError(429, 'Too many wrong attempts. Please request a new code.');
    }

    const a = Buffer.from(data.codeHash);
    const b = Buffer.from(sha(`${code}:${email}`));
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await ref.update({ attempts: data.attempts + 1 });
      throw new ApiError(400, 'Invalid code. Please try again.');
    }
    await ref.delete();

    const auth = getAuth(app);
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(email)).uid; // same account as Google login with this email
    } catch {
      uid = (await auth.createUser({ email, emailVerified: true })).uid;
    }
    const token = await auth.createCustomToken(uid);
    return NextResponse.json({ token });
  } catch (err) {
    return fail(err);
  }
}
