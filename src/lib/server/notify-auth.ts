import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';
import { ApiError, pairId } from './guard';

export type NotifyType = 'like' | 'match' | 'message' | 'superlike' | 'interest' | 'accepted';
export const NOTIFY_TYPES: NotifyType[] = ['like', 'match', 'message', 'superlike', 'interest', 'accepted'];
const PREF_KEY: Record<NotifyType, 'likes' | 'matches' | 'messages'> = {
  like: 'likes', superlike: 'likes', interest: 'likes', match: 'matches', accepted: 'matches', message: 'messages',
};

export const PUSH_COPY: Record<NotifyType, (n: string) => { title: string; body: string }> = {
  like: (n) => ({ title: 'New like 💕', body: `${n} liked your profile` }),
  superlike: (n) => ({ title: 'Super Like ⭐', body: `${n} super liked you!` }),
  match: (n) => ({ title: "It's a match! 🎉", body: `You and ${n} liked each other` }),
  message: (n) => ({ title: n, body: 'Sent you a message' }),
  interest: (n) => ({ title: 'New interest', body: `${n} is interested in your profile` }),
  accepted: (n) => ({ title: 'Interest accepted \uD83C\uDF89', body: `${n} accepted your interest. You can chat now.` }),
};

export const PUSH_URL: Record<NotifyType, (matchId?: string) => string> = {
  like: () => '/interests',
  superlike: () => '/interests',
  match: (m) => (m ? `/chat/${m}` : '/chats'),
  message: (m) => (m ? `/chat/${m}` : '/chats'),
  interest: () => '/interests',
  accepted: (m) => (m ? `/chat/${m}` : '/chats'),
};

export type NotifyDecision = {
  allowed: boolean;          // caller has a real relationship with the target
  pushAllowed: boolean;      // target's notification prefs allow a push
  fromName: string;          // derived from the caller's real profile — never client-supplied
  matchId?: string;
};

// A notification (or push) on behalf of `caller` to `target` is only legitimate if the
// caller actually did the thing it announces:
//   like / superlike -> a likes/{caller}_{target} doc of that kind exists
//   interest         -> a pending interests/{caller}_{target} doc exists
//   accepted         -> an accepted interests/{target}_{caller} doc exists (caller accepted it)
//   match / message  -> a matches/{sortedPair} doc exists that includes both users
// and neither side has blocked the other. Blocked/unrelated requests get `allowed: false`
// and the routes answer with a generic success so a blocker is never revealed.
export async function authorizeNotification(
  db: Firestore,
  caller: string,
  target: string,
  type: NotifyType,
): Promise<NotifyDecision> {
  const deny: NotifyDecision = { allowed: false, pushAllowed: false, fromName: '' };
  if (!target || target === caller || target.length > 128) throw new ApiError(400, 'Invalid recipient.');

  const [callerPub, callerPriv, targetPriv] = await Promise.all([
    db.collection('users').doc(caller).get(),
    db.collection('userPrivate').doc(caller).get(),
    db.collection('userPrivate').doc(target).get(),
  ]);
  if (!callerPub.exists) return deny;
  if ((callerPriv.data()?.blockedUsers ?? []).includes(target)) return deny;
  if ((targetPriv.data()?.blockedUsers ?? []).includes(caller)) return deny;

  let matchId: string | undefined;
  if (type === 'like' || type === 'superlike') {
    const like = await db.collection('likes').doc(`${caller}_${target}`).get();
    const t = like.data()?.type;
    if (!like.exists || (t !== 'like' && t !== 'superlike')) return deny;
    if (type === 'superlike' && t !== 'superlike') return deny;
    // Once matched, "X liked you" is stale and misleading — the match notification covers it.
  } else if (type === 'interest') {
    // Caller must have a pending interest on file for the target.
    const i = await db.collection('interests').doc(`${caller}_${target}`).get();
    if (!i.exists || i.data()?.status !== 'pending') return deny;
  } else if (type === 'accepted') {
    // Caller is the recipient who accepted: the doc is target -> caller, status accepted.
    const i = await db.collection('interests').doc(`${target}_${caller}`).get();
    if (!i.exists || i.data()?.status !== 'accepted') return deny;
    matchId = pairId(caller, target);
  } else {
    matchId = pairId(caller, target);
    const match = await db.collection('matches').doc(matchId).get();
    if (!match.exists || !(match.data()?.users ?? []).includes(caller)) return deny;
  }

  const prefs = targetPriv.data()?.notificationPrefs;
  const pushAllowed = !prefs || prefs[PREF_KEY[type]] !== false;
  const fromName = String(callerPub.data()?.name ?? 'Someone').slice(0, 40);
  return { allowed: true, pushAllowed, fromName, matchId };
}
