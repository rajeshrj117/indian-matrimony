import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, fail, limitAi, rateLimit, readJson, requireUser } from '@/lib/server/guard';
import { loadOwnedImage } from '@/lib/server/storage-image';
import { geminiJson, inline } from '@/lib/server/moderation';

// Face verification: compares the just-uploaded selfie against the user's first profile
// photo with a Gemini vision model. Only THIS route can mark a profile verified (Admin SDK
// bypasses firestore.rules; clients are locked out of `verified` — see the rules).
//
// Body: { selfieUrl }     Authorization: Bearer <ID token>
//  - the ID token identifies (and is the only uid that can be) verified
//  - both images must live under the caller's own Storage folders and are read with the
//    Admin SDK, so nobody can point this at someone else's photo or an arbitrary URL
//  - a small daily attempt cap stops brute-forcing the face match with different selfies
const SYSTEM =
  'You are a strict face-verification checker for a dating app. PHOTO_1 is a profile photo the user already has. ' +
  'PHOTO_2 is a live selfie they just took. Decide whether PHOTO_2 shows the same person as PHOTO_1, AND whether PHOTO_2 ' +
  'looks like a genuine live selfie (a real face, not a photo of a screen or printed photo, not a drawing/avatar, not heavily ' +
  'obscured by sunglasses, a mask, or a heavy filter). Be strict: if you are not confident, say so. ' +
  'Respond ONLY with JSON: {"same_person": boolean, "genuine_selfie": boolean, "confidence": number (0-100), "reason": string (short, user-facing, under 25 words)}';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await limitAi(req, user, 'face-verify', 10);
    await rateLimit(user.db, { bucket: 'face-verify:day', subject: user.uid, limit: 8, windowMs: 86_400_000 });
    if (!process.env.GEMINI_API_KEY) throw new ApiError(500, 'Verification is not configured on the server.');

    const body = await readJson(req, 4_000);
    const userRef = user.db.collection('users').doc(user.uid);
    const profilePhotoUrl: string | undefined = (await userRef.get()).data()?.images?.[0];
    if (!profilePhotoUrl) {
      throw new ApiError(400, 'Add at least one profile photo before verifying \u2014 that\u2019s what your selfie gets compared against.');
    }

    const [profileImage, selfieImage] = await Promise.all([
      loadOwnedImage(profilePhotoUrl, user.uid, 'profile-photos'),
      loadOwnedImage(body.selfieUrl, user.uid, 'verification-selfies'),
    ]);

    const result = await geminiJson<{ same_person?: boolean; genuine_selfie?: boolean; confidence?: number; reason?: string }>({
      system: SYSTEM,
      parts: [
        { text: 'PHOTO_1 (existing profile photo):' }, inline(profileImage),
        { text: 'PHOTO_2 (new verification selfie):' }, inline(selfieImage),
      ],
      maxTokens: 300,
      model: process.env.GEMINI_VISION_MODEL || 'gemini-3.6-flash',
      extraConfig: { thinkingConfig: { thinkingBudget: 0 } },
    });
    if (!result) throw new ApiError(502, 'Could not run the face check. Please try again.');

    const passed = result.same_person === true && result.genuine_selfie === true && (result.confidence ?? 0) >= 70;
    const reason = result.reason || (passed ? 'Face matched your profile photo.' : 'The selfie didn\u2019t clearly match your profile photo.');

    const privRef = user.db.collection('userPrivate').doc(user.uid);
    if (passed) {
      await userRef.update({ verified: true, verificationStatus: 'verified', verifiedAt: Date.now() });
      await privRef.set({ verificationRejectionReason: FieldValue.delete() }, { merge: true });
    } else {
      await userRef.update({ verified: false, verificationStatus: 'rejected', verifiedAt: FieldValue.delete() });
      await privRef.set({ verificationRejectionReason: reason }, { merge: true });
    }
    return NextResponse.json({ verified: passed, reason });
  } catch (err) {
    return fail(err);
  }
}
