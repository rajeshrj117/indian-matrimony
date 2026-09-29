import { NextRequest, NextResponse } from 'next/server';
import { ApiError, fail, limitAi, readJson, requireUser } from '@/lib/server/guard';
import { loadOwnedImage } from '@/lib/server/storage-image';
import { geminiJson, inline } from '@/lib/server/moderation';

// "Is this a real, unedited photo of a real face?" check (no cartoons/AI/avatars/screenshots).
// Authenticated, rate limited, and reads the image from our own Storage bucket only.
// Body: { imageUrl }  ->  { isRealPhoto, reason }
const SYSTEM =
  'You check profile photos for a dating app policy that requires a real, unedited photo of the user. ' +
  'Is this a genuine, unaltered photograph clearly showing a real human face? Reject cartoons, anime, drawings, avatars, ' +
  'AI-generated or heavily filtered/face-swapped images, memes, logos, screenshots, photos of screens, or photos with no clear ' +
  'human face. A normal photo with sunglasses or a hat is fine. ' +
  'Respond ONLY with JSON: {"is_real_photo": boolean, "confidence": number (0-100), "reason": string (short, user-facing, under 20 words)}';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await limitAi(req, user, 'photo-check', 30);
    if (!process.env.GEMINI_API_KEY) throw new ApiError(500, 'Photo checks are not configured on the server.');
    const body = await readJson(req, 4_000);
    const img = await loadOwnedImage(body.imageUrl, user.uid, 'profile-photos');

    const r = await geminiJson<{ is_real_photo?: boolean; confidence?: number; reason?: string }>({
      system: SYSTEM,
      parts: [{ text: 'Check this profile photo:' }, inline(img)],
      maxTokens: 200,
    });
    if (!r) throw new ApiError(502, 'Could not check this photo. Please try again.');

    const isRealPhoto = r.is_real_photo === true && (r.confidence ?? 0) >= 60;
    return NextResponse.json({
      isRealPhoto,
      reason: r.reason || (isRealPhoto ? 'Looks like a real photo.' : 'This doesn\u2019t look like a real photo of you.'),
    });
  } catch (err) {
    return fail(err);
  }
}
