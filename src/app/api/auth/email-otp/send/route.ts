import { NextRequest, NextResponse } from 'next/server';
import { randomInt, createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ApiError, fail, readJson, rateLimit, clientIp } from '@/lib/server/guard';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export async function POST(req: NextRequest) {
  try {
    const app = getAdminApp();
    if (!app) throw new ApiError(500, 'Server not configured.');
    const db = getFirestore(app);

    const body = await readJson<{ email?: string }>(req, 2_000);
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
      throw new ApiError(400, 'Enter a valid email address.');
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM; // e.g. "Indian Shaadi Matrimony <login@yourdomain.com>"
    if (!key || !from) throw new ApiError(500, 'Email service not configured.');

    // Abuse limits. The 60s check goes first so rapid clicks don't burn the hourly budget.
    await rateLimit(db, { bucket: 'eotp-min', subject: sha(email), limit: 1, windowMs: 60_000 });
    await rateLimit(db, { bucket: 'eotp-hr', subject: sha(email), limit: 10, windowMs: 3_600_000 });
    await rateLimit(db, { bucket: 'eotp-ip', subject: clientIp(req), limit: 30, windowMs: 3_600_000 });

    const code = String(randomInt(100000, 1000000));
    await db.collection('emailOtps').doc(sha(email)).set({
      codeHash: sha(`${code}:${email}`),
      attempts: 0,
      expiresAt: Date.now() + 10 * 60_000,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: `${code} is your Indian Shaadi Matrimony login code`,
        html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
          <h2 style="margin:0 0 8px">Your login code</h2>
          <p style="color:#555;margin:0 0 16px">Use this code to sign in. It expires in 10 minutes.</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px">${code}</div>
          <p style="color:#999;font-size:12px;margin-top:20px">If you didn't request this, you can ignore this email.</p>
        </div>`,
      }),
    });
    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      throw new ApiError(502, 'Could not send the email. Please try again.');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
