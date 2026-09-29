import { NextRequest, NextResponse } from 'next/server';
import { ApiError, fail, limitAi, readJson, requireUser } from '@/lib/server/guard';
import { loadOwnedImage } from '@/lib/server/storage-image';
import {
  dHash, findDuplicatePhotos, geminiJson, inline, queueForReview, recordPhotoHash,
} from '@/lib/server/moderation';

// Profile-photo safety check, run for EVERY user right after upload and before the photo is
// attached to the profile (see uploadProfilePhoto in firestore.ts). Authenticated + rate
// limited; the image is read from our own Storage bucket by the Admin SDK (never fetched
// from a caller-supplied URL).
//
// Checks: nudity / sexually explicit content, graphic violence, hate symbols, apparent
// minors, no real human face, and duplicate / stolen photos (perceptual hash vs. other
// accounts). If the AI provider is unavailable the photo is accepted but placed in the
// human review queue (fail-open-with-review) so an outage never blocks onboarding.
//
// Body: { imageUrl }   ->  200 { ok: true, pending? } | 422 { reason }
type Verdict = {
  allowed?: boolean;
  category?: 'ok' | 'nudity' | 'sexual' | 'violence' | 'hate' | 'minor_suspected' | 'no_face' | 'other';
  explicit_score?: number;
  reason?: string;
};

const SYSTEM =
  'You moderate profile photos for a dating app used by adults. Classify the photo. ' +
  'category: "nudity" (nudity or exposed genitals/breasts), "sexual" (sexually explicit or suggestive-explicit poses/acts), ' +
  '"violence" (graphic violence/gore/weapons pointed at people), "hate" (hate symbols), ' +
  '"minor_suspected" (the person appears to be under 18), "no_face" (no real, identifiable human face: blank image, logo, ' +
  'screenshot, object/scene only), "other" (other policy problem), or "ok". ' +
  'Swimwear/beach photos, group shots, sunglasses, pets and scenery alongside a person are OK. ' +
  'explicit_score is 0-100 for how sexually explicit the image is. ' +
  'Respond ONLY with JSON: {"allowed": boolean, "category": string, "explicit_score": number, "reason": string (short, user-facing, under 20 words, only when allowed is false)}';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await limitAi(req, user, 'photo-policy', 40);
    const body = await readJson(req, 4_000);
    const img = await loadOwnedImage(body.imageUrl, user.uid, 'profile-photos');

    const verdict = await geminiJson<Verdict>({
      system: SYSTEM,
      parts: [{ text: 'Review this profile photo:' }, inline(img)],
      maxTokens: 200,
    });

    if (!verdict) {
      await queueForReview(user.db, { type: 'photo_unchecked', uid: user.uid, priority: 'normal', detail: 'AI check unavailable; needs manual review.', data: { objectPath: img.objectPath } });
      return NextResponse.json({ ok: true, pending: true });
    }

    const explicit = (verdict.explicit_score ?? 0) >= 50;
    if (verdict.category === 'minor_suspected') {
      await queueForReview(user.db, { type: 'photo_minor_suspected', uid: user.uid, priority: 'critical', detail: 'Photo flagged as possibly showing a minor.', data: { objectPath: img.objectPath } });
      return NextResponse.json({ reason: 'This photo can\u2019t be used. Flirty is for adults 18+.' }, { status: 422 });
    }
    if (verdict.allowed === false || explicit || (verdict.category && verdict.category !== 'ok')) {
      if (explicit || verdict.category === 'nudity' || verdict.category === 'sexual') {
        await queueForReview(user.db, { type: 'photo_explicit', uid: user.uid, priority: 'high', detail: `Explicit upload blocked (${verdict.category}, score ${verdict.explicit_score ?? '?'})`, data: { objectPath: img.objectPath } });
      }
      return NextResponse.json({ reason: verdict.reason || 'This photo doesn\u2019t meet our photo guidelines.' }, { status: 422 });
    }

    // Duplicate / stolen-photo detection.
    const hash = await dHash(img.data);
    if (hash) {
      const dupes = await findDuplicatePhotos(user.db, user.uid, hash);
      if (dupes.length) {
        const owners = await Promise.all(dupes.map((d) => user.db.collection('users').doc(d.uid).get()));
        const stolenFromVerified = owners.some((o) => o.exists && o.data()?.verified === true);
        await queueForReview(user.db, {
          type: 'duplicate_photo', uid: user.uid, priority: stolenFromVerified ? 'high' : 'normal',
          detail: `Photo matches ${dupes.length} other account(s)${stolenFromVerified ? ' incl. a verified one' : ''}.`,
          data: { matches: dupes, objectPath: img.objectPath },
        });
        if (stolenFromVerified) {
          return NextResponse.json({ reason: 'This photo is already used on another verified account.' }, { status: 422 });
        }
      }
      await recordPhotoHash(user.db, user.uid, hash);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) return fail(err);
    console.error(err);
    return fail(new ApiError(500, 'Could not check this photo. Please try again.'));
  }
}
