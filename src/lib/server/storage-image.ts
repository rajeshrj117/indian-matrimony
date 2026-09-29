import 'server-only';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '@/lib/firebase-admin';
import { ApiError } from './guard';

// Loads an image the caller uploaded to OUR Storage bucket. The URL is only used to work
// out which object it points at — the bytes come from the Admin SDK, so the server never
// fetches an attacker-supplied URL (no SSRF, no internal-network probing) and a user can't
// point the checks at someone else's photo.
const MAX_BYTES = 8 * 1024 * 1024;

export async function loadOwnedImage(
  url: unknown,
  uid: string,
  folder: 'profile-photos' | 'verification-selfies',
): Promise<{ mimeType: string; data: Buffer; objectPath: string }> {
  const app = getAdminApp();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!app || !bucketName) throw new ApiError(500, 'Server is not configured.');
  if (typeof url !== 'string' || url.length > 2048) throw new ApiError(400, 'Invalid image URL.');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(400, 'Invalid image URL.');
  }
  const m = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'firebasestorage.googleapis.com' || !m || m[1] !== bucketName) {
    throw new ApiError(400, 'Image must be uploaded through the app.');
  }
  const objectPath = decodeURIComponent(m[2]);
  if (objectPath.includes('..') || !objectPath.startsWith(`${folder}/${uid}/`)) {
    throw new ApiError(403, 'You can only check your own images.');
  }

  const file = getStorage(app).bucket(bucketName).file(objectPath);
  const [meta] = await file.getMetadata().catch(() => {
    throw new ApiError(404, 'Image not found.');
  });
  const size = Number(meta.size ?? 0);
  const mimeType = String(meta.contentType ?? '');
  if (size <= 0 || size > MAX_BYTES) throw new ApiError(400, 'Image is too large.');
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mimeType)) throw new ApiError(400, 'Unsupported image type.');
  const [data] = await file.download();
  return { mimeType, data, objectPath };
}
