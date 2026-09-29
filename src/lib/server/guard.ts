import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { getAdminApp } from '@/lib/firebase-admin';

// Shared guard for every API route: authentication, moderation-status check, request
// size caps, and rate limiting. Nothing under /api should touch an external provider
// (Groq/Gemini/FCM) or the Admin SDK before going through requireUser().

export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfterSec?: number;
  constructor(status: number, message: string, opts: { code?: string; retryAfterSec?: number } = {}) {
    super(message);
    this.status = status;
    this.code = opts.code;
    this.retryAfterSec = opts.retryAfterSec;
  }
}

export function fail(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (err.retryAfterSec) headers['Retry-After'] = String(err.retryAfterSec);
    return NextResponse.json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, { status: err.status, headers });
  }
  console.error(err);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

// Reads a JSON body with a hard size cap (default 32 KB) so nobody can burn memory or
// LLM tokens by posting megabytes of text.
export async function readJson<T = Record<string, unknown>>(req: NextRequest, maxBytes = 32_000): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > maxBytes) throw new ApiError(413, 'Request too large.');
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, 'Request too large.');
  try {
    const parsed = JSON.parse(text || '{}');
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as T;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

export const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max) : '';

export const strArray = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v) ? v.slice(0, maxItems).map((x) => str(x, maxLen)).filter(Boolean) : [];

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 40);

export type AuthedUser = { uid: string; token: DecodedIdToken; db: Firestore };

export async function requireUser(
  req: NextRequest,
  opts: { strict?: boolean; allowRestricted?: boolean } = {},
): Promise<AuthedUser> {
  const app = getAdminApp();
  if (!app) throw new ApiError(500, 'Server is not configured.');

  const header = req.headers.get('authorization') ?? '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) throw new ApiError(401, 'Sign in required.');

  let token: DecodedIdToken;
  try {
    token = await getAuth(app).verifyIdToken(idToken, Boolean(opts.strict));
  } catch {
    throw new ApiError(401, 'Invalid or expired session.');
  }

  // Optional device attestation. Turn on with ENFORCE_APP_CHECK=true once the client has
  // NEXT_PUBLIC_RECAPTCHA_SITE_KEY set (see SECURITY_FIXES.md).
  if (process.env.ENFORCE_APP_CHECK === 'true') {
    const appCheckToken = req.headers.get('x-firebase-appcheck');
    if (!appCheckToken) throw new ApiError(401, 'App verification failed.');
    try {
      await getAppCheck(app).verifyToken(appCheckToken);
    } catch {
      throw new ApiError(401, 'App verification failed.');
    }
  }

  const db = getFirestore(app);
  if (!opts.allowRestricted) {
    const mod = await db.collection('moderation').doc(token.uid).get();
    const status = mod.exists ? mod.data()?.status : undefined;
    if (status === 'suspended' || status === 'banned') {
      throw new ApiError(403, 'This account is suspended.', { code: 'suspended' });
    }
  }
  return { uid: token.uid, token, db };
}

export async function requireAdmin(req: NextRequest): Promise<AuthedUser> {
  const user = await requireUser(req, { strict: true, allowRestricted: true });
  const allow = (process.env.ADMIN_UIDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (user.token.admin !== true && !allow.includes(user.uid)) throw new ApiError(403, 'Not authorized.');
  return user;
}

// ---------- Rate limiting ----------
// Two layers: a per-instance in-memory counter (cheap, rejects bursts without a DB hit) and
// a Firestore fixed-window counter (shared across serverless instances, so it can't be
// dodged by hitting a different lambda). Set a TTL policy on rateLimits.expiresAt.

const mem = new Map<string, { n: number; reset: number }>();

export async function rateLimit(
  db: Firestore,
  opts: { bucket: string; subject: string; limit: number; windowMs: number },
): Promise<void> {
  const { bucket, subject, limit, windowMs } = opts;
  const now = Date.now();
  const windowIdx = Math.floor(now / windowMs);
  const key = `${bucket}:${subject}:${windowIdx}`;
  const retryAfterSec = Math.max(1, Math.ceil(((windowIdx + 1) * windowMs - now) / 1000));

  const m = mem.get(key);
  if (m && m.n >= limit) throw new ApiError(429, 'Too many requests. Please slow down.', { retryAfterSec });
  mem.set(key, { n: (m?.n ?? 0) + 1, reset: (windowIdx + 1) * windowMs });
  if (mem.size > 5000) for (const [k, v] of mem) if (v.reset < now) mem.delete(k);

  const ref = db.collection('rateLimits').doc(hash(key));
  const over = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data()?.count as number) : 0;
    if (count >= limit) return true;
    tx.set(ref, { count: count + 1, bucket, expiresAt: new Date((windowIdx + 1) * windowMs + 60_000) });
    return false;
  });
  if (over) throw new ApiError(429, 'Too many requests. Please slow down.', { retryAfterSec });
}

// Standard limits for the AI-backed routes: per user and per IP.
export async function limitAi(req: NextRequest, user: AuthedUser, route: string, perHour = 30) {
  await rateLimit(user.db, { bucket: `${route}:min`, subject: user.uid, limit: Math.max(3, Math.ceil(perHour / 5)), windowMs: 60_000 });
  await rateLimit(user.db, { bucket: `${route}:hr`, subject: user.uid, limit: perHour, windowMs: 3_600_000 });
  await rateLimit(user.db, { bucket: `${route}:ip`, subject: hash(clientIp(req)), limit: perHour * 3, windowMs: 3_600_000 });
}

export const pairId = (a: string, b: string) => [a, b].sort().join('_');
