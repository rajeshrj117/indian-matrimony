import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';

export type ModerationStatus = 'active' | 'restricted' | 'suspended' | 'banned';

export type QueueItem = {
  type: 'photo_explicit' | 'photo_unchecked' | 'photo_minor_suspected' | 'duplicate_photo' | 'abuse_signals' | 'manual';
  uid: string;
  priority: 'critical' | 'high' | 'normal';
  detail?: string;
  data?: Record<string, unknown>;
};

export async function queueForReview(db: Firestore, item: QueueItem) {
  await db.collection('moderationQueue').add({ ...item, status: 'open', createdAt: Date.now() });
}

// Admin-owned moderation state lives in moderation/{uid}, which no client can read or write.
// firestore.rules consult it to block likes/messages from restricted/suspended/banned users.
export async function setModerationStatus(
  db: Firestore,
  uid: string,
  status: ModerationStatus,
  reason: string,
  by: string,
) {
  await db.collection('moderation').doc(uid).set({ status, reason: reason.slice(0, 500), by, updatedAt: Date.now() }, { merge: true });
  // Mirror a public "moderated" flag so discovery can hide the profile (clients can't change it).
  await db.collection('users').doc(uid).set({ moderated: status !== 'active' }, { merge: true }).catch(() => {});
}

// ---------- Gemini helper (JSON-mode vision calls) ----------
export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function geminiJson<T>(opts: {
  system: string;
  parts: GeminiPart[];
  maxTokens?: number;
  model?: string;
  extraConfig?: Record<string, unknown>;
}): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = opts.model || process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: opts.parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: opts.maxTokens ?? 300, responseMimeType: 'application/json', ...opts.extraConfig },
    }),
  });
  if (!res.ok) {
    console.error('Gemini error', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as T;
  } catch {
    console.error('Gemini: unparseable response');
    return null;
  }
}

export const inline = (img: { mimeType: string; data: Buffer }): GeminiPart => ({
  inlineData: { mimeType: img.mimeType, data: img.data.toString('base64') },
});

// ---------- Duplicate / stolen-photo detection ----------
// 64-bit difference hash (dHash) of every profile photo. Near-identical images (resized,
// recompressed, lightly filtered) land within a few bits of each other. To avoid scanning
// every hash, each hash is stored with four 16-bit "bands"; two hashes within 6 bits must
// share at least one band exactly (pigeonhole), so four equality queries find all candidates.
export async function dHash(buf: Buffer): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;
    const px = await sharp(buf, { failOn: 'none' }).rotate().grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
    let bits = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
    let hex = '';
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } catch (err) {
    console.error('dHash failed', err);
    return null;
  }
}

const popcount = (n: number) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
export const hamming = (a: string, b: string) => {
  let d = 0;
  for (let i = 0; i < 16; i++) d += popcount(parseInt(a[i], 16) ^ parseInt(b[i], 16));
  return d;
};

export async function findDuplicatePhotos(db: Firestore, uid: string, hash: string) {
  const bands = [0, 4, 8, 12].map((i) => hash.slice(i, i + 4));
  const snaps = await Promise.all(bands.map((b, i) => db.collection('photoHashes').where(`b${i}`, '==', b).limit(25).get()));
  const others = new Map<string, number>();
  for (const s of snaps) {
    for (const d of s.docs) {
      const v = d.data();
      if (v.uid === uid) continue;
      const dist = hamming(hash, v.hash);
      if (dist <= 6) others.set(v.uid, Math.min(dist, others.get(v.uid) ?? 64));
    }
  }
  return [...others.entries()].map(([otherUid, distance]) => ({ uid: otherUid, distance }));
}

export async function recordPhotoHash(db: Firestore, uid: string, hash: string) {
  await db.collection('photoHashes').doc(`${uid}_${hash}`).set({
    uid, hash, b0: hash.slice(0, 4), b1: hash.slice(4, 8), b2: hash.slice(8, 12), b3: hash.slice(12, 16), createdAt: Date.now(),
  });
}
