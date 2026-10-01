import type { InterestState } from '@/lib/firestore';
import type { PhotoPrivacy, Profile } from '@/lib/types';

// Returns 'blur' | 'hidden' when `owner`'s photos should be locked for this viewer, else null.
// Photos unlock once the owner has shown interest in the viewer (viewer's state === 'received')
// or the two are connected. The owner always sees their own photos.
export function photoLock(
  owner: Pick<Profile, 'uid' | 'photoPrivacy'> | null | undefined,
  viewerUid: string | undefined,
  state?: InterestState,
): Exclude<PhotoPrivacy, 'public'> | null {
  const mode = owner?.photoPrivacy;
  if (!owner || !mode || mode === 'public') return null;
  if (viewerUid && owner.uid === viewerUid) return null;
  if (state && (state.state === 'received' || state.state === 'connected')) return null;
  return mode;
}
