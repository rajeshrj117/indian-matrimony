import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where,
  onSnapshot, orderBy, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteField, limit as fsLimit, Unsubscribe,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { authedFetch } from '@/lib/api-client';
import { screenText } from '@/lib/text-safety';
import { splitProfile, mergeProfile, PUBLIC_PROFILE_FIELDS, approxCoord } from '@/lib/profile-fields';
import { calculateDistance } from '@/lib/geo';
import { matchesFilters, rankProfiles, type SearchFilters } from '@/lib/matrimony';
import type {
  Profile, MatchDoc, MessageDoc,
  InterestDoc, ShortlistDoc, ProfileViewDoc,
  NotificationPrefs, LanguageCode, PremiumPlan, ReportReason,
  TypingIndicator, ActivityNotification,
  RatingDoc, RatingSummary, ContactRequestDoc, ContactRequestType, PhotoAccessRequestDoc, SpotlightDoc, PremiumMessageDoc, FamilyAccountDoc,
} from '@/lib/types';

export const matchIdFor = (a: string, b: string) => [a, b].sort().join('_');
export const ratingIdFor = (from: string, to: string) => `${from}_${to}`;
export const interestIdFor = (from: string, to: string) => `${from}_${to}`;
export const shortlistIdFor = (owner: string, target: string) => `${owner}_${target}`;
export const viewIdFor = (viewer: string, target: string) => `${viewer}_${target}`;

// True if either profile has blocked the other. Blocking is meant to be a hard, mutual
// wall: neither side can see the other's chat/profile actions or reconnect until an
// explicit unblock, regardless of who did the blocking.
export const isBlockedEitherWay = (a: Profile | null | undefined, b: Profile | null | undefined): boolean => {
  if (!a || !b) return false;
  return (a.blockedUsers ?? []).includes(b.uid) || (b.blockedUsers ?? []).includes(a.uid);
};

// ---------- Spam/bot rate limiting ----------
// Accounts younger than this are treated as "new" and subject to message throttling —
// this is where bot/spam blasts right after signup do the most damage. Keep in sync
// with the mirrored check in firestore.rules (messageWindowUpdateValid).
const NEW_ACCOUNT_MS = 48 * 60 * 60 * 1000; // 48 hours
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
export const MAX_MESSAGES_PER_WINDOW = 15; // generous for real conversation, throttles blasting

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super('You\u2019re sending messages too fast. New accounts are limited to prevent spam.');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ---------- Profiles ----------

// Profiles are split in two (see profile-fields.ts): users/{uid} is PUBLIC (what any signed-in
// user can read); userPrivate/{uid} holds phone, email, DOB, exact location, block list, push
// tokens, premium state, etc. and is owner-only. getProfile(myUid) returns the two merged;
// getProfile(someoneElse) returns only the public part.
export async function getProfile(uid: string): Promise<Profile | null> {
  const isMe = auth.currentUser?.uid === uid;
  const [pub, priv] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    isMe ? getDoc(doc(db, 'userPrivate', uid)) : Promise.resolve(null),
  ]);
  if (!pub.exists()) return null;
  return mergeProfile(pub.data(), priv?.exists() ? priv.data() : undefined) as unknown as Profile;
}

// Writes owner-only fields (creates the doc if needed).
export async function updatePrivate(uid: string, data: Record<string, unknown>) {
  await setDoc(doc(db, 'userPrivate', uid), data, { merge: true });
}

// One-time move of sensitive fields off the world-readable users/{uid} doc for accounts created
// before the public/private split. Safe to call repeatedly; auth-context calls it on sign-in.
export async function migrateLegacyProfile(uid: string): Promise<boolean> {
  const ref2 = doc(db, 'users', uid);
  const snap = await getDoc(ref2);
  if (!snap.exists()) return false;
  const data = snap.data();
  const publicSet = new Set<string>(PUBLIC_PROFILE_FIELDS);
  const stray = Object.keys(data).filter((k) => !publicSet.has(k));
  if (stray.length === 0) return false;

  // The message-window counters are server-rule-guarded, so start them fresh.
  const priv: Record<string, unknown> = {};
  for (const k of stray) if (k !== 'msgWindowStart' && k !== 'msgWindowCount') priv[k] = data[k];
  if (Object.keys(priv).length) await setDoc(doc(db, 'userPrivate', uid), priv, { merge: true });

  const patch: Record<string, unknown> = {};
  for (const k of stray) patch[k] = deleteField();
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    patch.approxLatitude = approxCoord(data.latitude);
    patch.approxLongitude = approxCoord(data.longitude);
  }
  await updateDoc(ref2, patch);
  return true;
}

// ---------- One-profile-per-phone/email enforcement ----------
// Firestore has no native unique-field constraint, so uniqueness is enforced with
// dedicated index docs: phoneIndex/{phone} -> { uid } and emailIndex/{email} -> { uid }.
// firestore.rules only lets a user create the index doc that matches their own
// verified phone_number/email auth-token claim, and forbids update/delete, so this
// can't be spoofed or overwritten from the client.
export class DuplicateAccountError extends Error {
  field: 'phone' | 'email';
  constructor(field: 'phone' | 'email') {
    super(field === 'phone'
      ? 'This mobile number is already registered with another account.'
      : 'This email is already registered with another account.');
    this.name = 'DuplicateAccountError';
    this.field = field;
  }
}

// Call once, before the first saveProfile() for a brand-new uid. Throws
// DuplicateAccountError if the phone or email is already claimed by a different uid;
// otherwise atomically claims whichever of phone/email is present for this uid.
export async function claimIdentity(uid: string, phone: string | null, email: string | null) {
  const phoneRef = phone ? doc(db, 'phoneIndex', phone) : null;
  const emailRef = email ? doc(db, 'emailIndex', email) : null;

  await runTransaction(db, async (tx) => {
    const [phoneSnap, emailSnap] = await Promise.all([
      phoneRef ? tx.get(phoneRef) : Promise.resolve(null),
      emailRef ? tx.get(emailRef) : Promise.resolve(null),
    ]);

    if (phoneSnap?.exists() && phoneSnap.data().uid !== uid) throw new DuplicateAccountError('phone');
    if (emailSnap?.exists() && emailSnap.data().uid !== uid) throw new DuplicateAccountError('email');

    if (phoneRef && !phoneSnap?.exists()) tx.set(phoneRef, { uid, createdAt: Date.now() });
    if (emailRef && !emailSnap?.exists()) tx.set(emailRef, { uid, createdAt: Date.now() });
  });
}

export class ContentPolicyError extends Error {
  strikes?: number;
  maxStrikes?: number;
  constructor(message: string, opts: { strikes?: number; maxStrikes?: number } = {}) {
    super(message);
    this.name = 'ContentPolicyError';
    this.strikes = opts.strikes;
    this.maxStrikes = opts.maxStrikes;
  }
}

// Thrown when the sender's chat is locked (5 strikes for sexual or abusive messages ->
// 5 day lock). `lockedUntil` is epoch ms.
export class ChatLockedError extends Error {
  lockedUntil: number;
  constructor(lockedUntil: number, message?: string) {
    super(message ?? `Chat is locked until ${new Date(lockedUntil).toLocaleString()}.`);
    this.name = 'ChatLockedError';
    this.lockedUntil = lockedUntil;
  }
}

type ModerationResult = {
  allowed: boolean;
  category?: string;
  reason?: string;
  strike?: boolean;
  strikes?: number;
  maxStrikes?: number;
  locked?: boolean;
  lockedUntil?: number;
};

// Calls /api/groq/message-moderation, which (server-side) checks the chat lock, runs the
// regex + AI screen, and records a strike / applies the 5-day lock. Fails open on any
// network/parse/rate-limit issue — firestore.rules still refuse writes while locked, and
// screenText() still runs on the client, so an outage never blocks the whole chat.
async function aiScreenMessage(text: string): Promise<ModerationResult> {
  try {
    const res = await authedFetch('/api/groq/message-moderation', { text });
    if (!res.ok) return { allowed: true };
    const data = await res.json();
    if (data?.allowed === false) return data as ModerationResult;
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

// Current chat-lock state for the signed-in user (null if it can't be determined).
export async function getChatLockStatus(): Promise<{ locked: boolean; lockedUntil: number; strikes: number; maxStrikes: number } | null> {
  try {
    const res = await authedFetch('/api/groq/message-moderation', { check: true });
    if (!res.ok) return null;
    const d = await res.json();
    if (typeof d?.locked !== 'boolean') return null;
    return { locked: d.locked, lockedUntil: Number(d.lockedUntil) || 0, strikes: Number(d.strikes) || 0, maxStrikes: Number(d.maxStrikes) || 5 };
  } catch {
    return null;
  }
}

// Shared by sendMessage() and editMessage(): throws ChatLockedError / ContentPolicyError if the
// text must not go out. Server first (lock + strikes + AI), then the client-only regex rules.
async function assertMessageAllowed(uid: string, text: string) {
  const verdict = screenText(text, 'message');
  if (verdict.level !== 'allow') void recordAbuseSignal(uid, 'message', verdict.flags, verdict.level === 'block');

  const mod = await aiScreenMessage(text);
  if (mod.locked && mod.strike !== true) throw new ChatLockedError(mod.lockedUntil ?? 0, mod.reason);
  if (!mod.allowed) {
    if (verdict.level !== 'block') void recordAbuseSignal(uid, 'message', [mod.category ?? 'ai_flagged'], true);
    if (mod.locked) throw new ChatLockedError(mod.lockedUntil ?? 0, mod.reason);
    throw new ContentPolicyError(
      mod.reason ?? 'This message goes against our Community Guidelines and wasn\u2019t sent.',
      { strikes: mod.strikes, maxStrikes: mod.maxStrikes },
    );
  }
  if (verdict.level === 'block') throw new ContentPolicyError(verdict.message ?? 'This message goes against our Community Guidelines.');
}

export async function saveProfile(uid: string, data: Partial<Profile>) {
  // Screen every free-text field that ends up on the public profile (no phone numbers, links,
  // social handles, explicit or abusive text).
  const fam = data.familyDetails;
  const texts: string[] = [
    data.bio, data.job, data.community, data.nativePlace, data.countryOfResidence,
    fam?.about, fam?.fatherOccupation, fam?.motherOccupation, data.partnerPreferences?.about,
  ].filter((t): t is string => typeof t === 'string' && t.length > 0);
  for (const text of texts) {
    const v = screenText(text, 'bio');
    if (v.level === 'block') {
      void recordAbuseSignal(uid, 'bio', v.flags, true);
      throw new ContentPolicyError(v.message ?? 'This text goes against our Community Guidelines.');
    }
  }

  const ref2 = doc(db, 'users', uid);
  const existing = await getDoc(ref2);
  const now = Date.now();
  const { public: pub, private: priv } = splitProfile(data as Record<string, unknown>);
  if (existing.exists()) {
    await updateDoc(ref2, { ...pub, updatedAt: now });
  } else {
    await setDoc(ref2, { uid, createdAt: now, updatedAt: now, ...pub });
  }
  if (Object.keys(priv).length > 0 || !existing.exists()) {
    await updatePrivate(uid, priv);
  }
}

// Best-effort telemetry for the admin "abuse signals" tab. Never throws.
export async function recordAbuseSignal(uid: string, context: 'bio' | 'message', flags: string[], blocked: boolean) {
  try {
    await addDoc(collection(db, 'abuseSignals'), { uid, context, flags: flags.slice(0, 10), blocked, createdAt: Date.now() });
  } catch { /* ignore */ }
}

export class PhotoPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoPolicyError';
  }
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
};

// Uploads a profile photo and runs the server-side safety check (/api/groq/photo-policy) for
// EVERY user: nudity/explicit content, violence, hate symbols, apparent minors, no-face images and
// duplicate/stolen photos. A photo that fails, or that we couldn't check, is deleted from Storage
// and never attached to the profile.
export async function uploadProfilePhoto(uid: string, file: File, _gender?: Profile['gender']): Promise<string> {
  void _gender;
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new PhotoPolicyError('Please choose a JPEG, PNG or WebP photo.');
  if (file.size >= 8 * 1024 * 1024) throw new PhotoPolicyError('That photo is too large. Please choose one under 8 MB.');

  const path = `profile-photos/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const policyRes = await authedFetch('/api/groq/photo-policy', { imageUrl: url }).catch(() => null);
  if (!policyRes || !policyRes.ok) {
    const data = policyRes ? await policyRes.json().catch(() => ({})) : {};
    await deleteObject(storageRef).catch(() => {});
    if (policyRes?.status === 422) {
      throw new PhotoPolicyError(data?.reason || 'This photo doesn\u2019t meet our photo guidelines. Please choose a different one.');
    }
    if (policyRes?.status === 429) throw new PhotoPolicyError('You\u2019re uploading too quickly. Please wait a minute and try again.');
    throw new PhotoPolicyError('We couldn\u2019t check this photo right now. Please try again.');
  }
  return url;
}

export async function uploadPrivatePhoto(uid: string, file: File): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new PhotoPolicyError('Please choose a JPEG, PNG or WebP photo.');
  if (file.size >= 8 * 1024 * 1024) throw new PhotoPolicyError('That photo is too large. Please choose one under 8 MB.');
  const path = `private-photos/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const policyRes = await authedFetch('/api/groq/photo-policy', { imageUrl: url }).catch(() => null);
  if (!policyRes || !policyRes.ok) {
    const data = policyRes ? await policyRes.json().catch(() => ({})) : {};
    await deleteObject(storageRef).catch(() => {});
    throw new PhotoPolicyError(data?.reason || 'This private photo could not be approved.');
  }
  return url;
}

// ---------- Search ----------

// Loads a pool of complete, visible profiles of the opposite gender, then applies
// the member's filters on the client. The Firestore query only uses equality filters so it needs
// no composite index; once the member base grows past a few thousand, move this behind a search
// service (Typesense / Algolia / Meilisearch) and keep the same SearchFilters shape.
const SEARCH_POOL_SIZE = 400;

export async function fetchSearchPool(me: Profile): Promise<Profile[]> {
  // Brides look for grooms and vice versa. Members who chose "Other" see everyone.
  const wanted = me.gender === 'Male' ? 'Female' : me.gender === 'Female' ? 'Male' : null;
  const constraints = [where('profileComplete', '==', true)];
  if (wanted) constraints.push(where('gender', '==', wanted));
  const snap = await getDocs(query(collection(db, 'users'), ...constraints, fsLimit(SEARCH_POOL_SIZE)));

  const myBlocked = new Set(me.blockedUsers ?? []);
  return snap.docs
    .map((d) => d.data() as Profile)
    .filter((p) => p.uid !== me.uid && !p.moderated && !myBlocked.has(p.uid));
}

export async function searchProfiles(me: Profile, filters: SearchFilters): Promise<Profile[]> {
  const pool = await fetchSearchPool(me);
  return rankProfiles(pool.filter((p) => matchesFilters(p, filters)));
}

export async function getProfilesByUids(uids: string[]): Promise<Profile[]> {
  const unique = Array.from(new Set(uids));
  const profiles = await Promise.all(unique.map((u) => getProfile(u).catch(() => null)));
  return profiles.filter((p): p is Profile => Boolean(p) && !p!.moderated);
}

// ---------- Interests (Send Interest -> Accept / Decline) ----------

export class InterestLimitError extends Error {
  constructor(limit: number) {
    super(`You\u2019ve sent ${limit} interests today. You can send more tomorrow.`);
    this.name = 'InterestLimitError';
  }
}

export const FREE_INTERESTS_PER_DAY = 10;
export const PREMIUM_INTERESTS_PER_DAY = 40;

// Daily cap on outgoing interests. Reuses the swipesUsed / swipesResetAt counters on userPrivate
// (legacy field names). It deters spam and mass-messaging; it is a client-side guard, not a
// server-enforced limit.
async function consumeDailyInterestQuota(uid: string, isPremium: boolean): Promise<void> {
  const limit = isPremium ? PREMIUM_INTERESTS_PER_DAY : FREE_INTERESTS_PER_DAY;
  const ref2 = doc(db, 'userPrivate', uid);
  const snap = await getDoc(ref2);
  const data = snap.data() as Profile | undefined;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const resetAt = data?.swipesResetAt ?? 0;
  const used = now > resetAt ? 0 : (data?.swipesUsed ?? 0);
  if (used >= limit) throw new InterestLimitError(limit);
  await setDoc(ref2, {
    swipesUsed: used + 1,
    swipesResetAt: now > resetAt ? now + dayMs : resetAt,
  }, { merge: true });
}

async function createMatchForAccepted(a: string, b: string): Promise<MatchDoc> {
  const id = matchIdFor(a, b);
  const matchRef = doc(db, 'matches', id);
  const existing = await getDoc(matchRef);
  const now = Date.now();
  const match: MatchDoc = {
    id,
    users: [a, b],
    createdAt: existing.exists() ? (existing.data() as MatchDoc).createdAt : now,
    lastMessage: existing.exists() ? (existing.data() as MatchDoc).lastMessage : 'Interest accepted. Say hello \ud83d\udc4b',
    lastMessageAt: now,
  };
  await setDoc(matchRef, match, { merge: true });
  return match;
}

export type SendInterestResult =
  | { kind: 'sent' }
  | { kind: 'accepted'; match: MatchDoc }; // they had already sent you interest, so it was accepted

export async function sendInterest(
  from: string, to: string, opts: { message?: string; isPremium?: boolean } = {},
): Promise<SendInterestResult> {
  const [fromProfile, toProfile] = await Promise.all([getProfile(from), getProfile(to)]);
  if (isBlockedEitherWay(fromProfile, toProfile)) throw new BlockedError();

  // They already sent you one: sending back means "yes" — accept theirs instead of creating a second doc.
  const reverse = await getDoc(doc(db, 'interests', interestIdFor(to, from)));
  if (reverse.exists() && (reverse.data() as InterestDoc).status === 'pending') {
    const match = await respondToInterest(to, from, true);
    return { kind: 'accepted', match: match! };
  }

  const ref2 = doc(db, 'interests', interestIdFor(from, to));
  const existing = await getDoc(ref2);
  if (existing.exists()) {
    const st = (existing.data() as InterestDoc).status;
    if (st === 'declined') throw new Error('This member has declined your interest.');
    return { kind: 'sent' }; // pending / accepted already — nothing to do
  }

  await consumeDailyInterestQuota(from, Boolean(opts.isPremium));
  const now = Date.now();
  const message = opts.message?.trim().slice(0, 200);
  const data: InterestDoc = {
    from, to, status: 'pending', createdAt: now, updatedAt: now,
    ...(message ? { message } : {}),
  };
  try {
    await setDoc(ref2, data);
  } catch (e) {
    if ((e as { code?: string })?.code === 'permission-denied') throw new BlockedError();
    throw e;
  }
  return { kind: 'sent' };
}

// The recipient (`me`) accepts or declines the interest `from` sent them.
export async function respondToInterest(from: string, me: string, accept: boolean): Promise<MatchDoc | null> {
  const ref2 = doc(db, 'interests', interestIdFor(from, me));
  await updateDoc(ref2, { status: accept ? 'accepted' : 'declined', updatedAt: Date.now() });
  if (!accept) return null;
  return createMatchForAccepted(from, me);
}

// Sender takes back a still-pending interest.
export async function withdrawInterest(from: string, to: string) {
  await deleteDoc(doc(db, 'interests', interestIdFor(from, to)));
}

export function listenInterestsReceived(uid: string, cb: (items: InterestDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'interests'), where('to', '==', uid));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as InterestDoc).sort((a, b) => b.updatedAt - a.updatedAt);
    cb(items);
  }, () => cb([]));
}

export function listenInterestsSent(uid: string, cb: (items: InterestDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'interests'), where('from', '==', uid));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as InterestDoc).sort((a, b) => b.updatedAt - a.updatedAt);
    cb(items);
  }, () => cb([]));
}

export type InterestState =
  | { state: 'none' }
  | { state: 'sent'; status: 'pending' | 'declined' }
  | { state: 'received' }          // they sent you interest, pending your reply
  | { state: 'connected' }         // accepted in either direction
  | { state: 'declined-by-me' };

// Live map of otherUid -> where things stand, so cards/profile pages can show the right button.
export function listenInterestStates(uid: string, cb: (map: Record<string, InterestState>) => void): Unsubscribe {
  let sent: InterestDoc[] = [];
  let received: InterestDoc[] = [];
  const emit = () => {
    const map: Record<string, InterestState> = {};
    for (const i of sent) {
      map[i.to] = i.status === 'accepted' ? { state: 'connected' }
        : i.status === 'declined' ? { state: 'sent', status: 'declined' }
        : { state: 'sent', status: 'pending' };
    }
    for (const i of received) {
      if (i.status === 'accepted') map[i.from] = { state: 'connected' };
      else if (i.status === 'declined') map[i.from] = { state: 'declined-by-me' };
      else if (!map[i.from]) map[i.from] = { state: 'received' };
    }
    cb(map);
  };
  const u1 = listenInterestsSent(uid, (items) => { sent = items; emit(); });
  const u2 = listenInterestsReceived(uid, (items) => { received = items; emit(); });
  return () => { u1(); u2(); };
}

// ---------- Shortlist ----------

export async function addToShortlist(owner: string, target: string) {
  const data: ShortlistDoc = { owner, target, createdAt: Date.now() };
  await setDoc(doc(db, 'shortlists', shortlistIdFor(owner, target)), data);
}

export async function removeFromShortlist(owner: string, target: string) {
  await deleteDoc(doc(db, 'shortlists', shortlistIdFor(owner, target)));
}

export function listenShortlist(uid: string, cb: (items: ShortlistDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'shortlists'), where('owner', '==', uid));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as ShortlistDoc).sort((a, b) => b.createdAt - a.createdAt);
    cb(items);
  }, () => cb([]));
}

// ---------- Profile views ("Viewed you") ----------

const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // repeat visits inside 30 min don't re-bump the entry

export async function recordProfileView(viewer: string, target: string) {
  if (viewer === target) return;
  const ref2 = doc(db, 'profileViews', viewIdFor(viewer, target));
  const snap = await getDoc(ref2);
  const now = Date.now();
  if (snap.exists()) {
    const cur = snap.data() as ProfileViewDoc;
    if (now - cur.viewedAt < VIEW_COOLDOWN_MS) return;
    await updateDoc(ref2, { viewedAt: now, count: (cur.count ?? 1) + 1 });
  } else {
    const data: ProfileViewDoc = { viewer, target, viewedAt: now, count: 1 };
    await setDoc(ref2, data);
  }
}

export function listenViewedMe(uid: string, cb: (items: ProfileViewDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'profileViews'), where('target', '==', uid));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as ProfileViewDoc).sort((a, b) => b.viewedAt - a.viewedAt);
    cb(items);
  }, () => cb([]));
}

// ---------- Trust ratings ----------
// Separate from the swipe/like mechanic above: a 0-10 "likes" score anyone can leave, plus
// a 0-10 "stars" trust rating that only women can leave (men simply have no `stars` field
// to write — enforced in firestore.rules, so a modified client can't fake it either).
const clamp0to10 = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

export async function submitRating(
  from: string,
  to: string,
  fromGender: Profile['gender'],
  values: { likes: number; stars?: number }
): Promise<void> {
  const ref = doc(db, 'ratings', ratingIdFor(from, to));
  const existing = await getDoc(ref);
  const now = Date.now();
  const payload: RatingDoc = {
    from,
    to,
    likes: clamp0to10(values.likes),
    createdAt: existing.exists() ? (existing.data() as RatingDoc).createdAt : now,
    updatedAt: now,
  };
  // Only women write a `stars` field at all — firestore.rules reject a `stars` key from
  // anyone else, so leaving it undefined here (rather than 0) keeps male raters' writes valid.
  if (fromGender === 'Female' && values.stars !== undefined) {
    payload.stars = clamp0to10(values.stars);
  }
  await setDoc(ref, payload);
}

export async function getMyRatingFor(from: string, to: string): Promise<RatingDoc | null> {
  const snap = await getDoc(doc(db, 'ratings', ratingIdFor(from, to)));
  return snap.exists() ? (snap.data() as RatingDoc) : null;
}

export async function getRatingSummary(uid: string): Promise<RatingSummary> {
  const snap = await getDocs(query(collection(db, 'ratings'), where('to', '==', uid)));
  let starsTotal = 0;
  let starsCount = 0;
  let totalLikes = 0;
  snap.docs.forEach((d) => {
    const r = d.data() as RatingDoc;
    totalLikes += r.likes ?? 0;
    if (typeof r.stars === 'number') {
      starsTotal += r.stars;
      starsCount += 1;
    }
  });
  return {
    avgStars: starsCount > 0 ? starsTotal / starsCount : 0,
    starsCount,
    totalLikes,
  };
}

// ---------- Blocking & reporting ----------

export async function blockUser(uid: string, targetUid: string) {
  await updatePrivate(uid, { blockedUsers: arrayUnion(targetUid) });
}

export async function unblockUser(uid: string, targetUid: string) {
  await updatePrivate(uid, { blockedUsers: arrayRemove(targetUid) });
}

export async function getBlockedProfiles(uid: string): Promise<Profile[]> {
  const me = await getProfile(uid);
  const ids = me?.blockedUsers ?? [];
  const profiles = await Promise.all(ids.map((id) => getProfile(id)));
  return profiles.filter((p): p is Profile => Boolean(p));
}

// Reports go through the server (/api/reports): validated, de-duplicated, rate limited, auto-blocks the
// reported user for the reporter, and escalates high-risk reports (underage, repeat reporters) to
// moderators with an automatic temporary restriction. (`reporterUid` is now taken from the session.)
export async function reportUser(_reporterUid: string, reportedUid: string, reason: ReportReason, details = '') {
  void _reporterUid;
  const res = await authedFetch('/api/reports', { reportedUid, reason, details });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Could not submit your report. Please try again.');
  }
}

// ---------- Mute (per-match, stored on the user doc) ----------

export async function muteMatch(uid: string, matchId: string) {
  await updatePrivate(uid, { mutedMatches: arrayUnion(matchId) });
}

export async function unmuteMatch(uid: string, matchId: string) {
  await updatePrivate(uid, { mutedMatches: arrayRemove(matchId) });
}

// ---------- Verification ----------

export async function submitVerificationSelfie(uid: string, file: File): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new VerificationError('Please use a JPEG, PNG or WebP selfie.');
  const path = `verification-selfies/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'users', uid), { verificationStatus: 'pending' });
  await updatePrivate(uid, { verificationSelfieUrl: url });
  return url;
}

export class VerificationError extends Error {}

// Runs the actual face-match check: sends the freshly-uploaded selfie plus the user's
// existing profile photo to the server, which asks a Groq vision model whether they're
// the same person (and that the selfie looks like a genuine live photo, not a screen/
// photo-of-a-photo). The server — not this client call — is what writes `verified`/
// `verificationStatus` to Firestore (see /api/groq/face-verify), so a user can't just
// flip their own profile to verified from devtools; firestore.rules blocks that too.
// (`_idToken` is kept for call-site compatibility; the token is now sent in the Authorization header.)
export async function verifyFaceSelfie(_idToken: string, selfieUrl: string): Promise<{ verified: boolean; reason?: string }> {
  void _idToken;
  const res = await authedFetch('/api/groq/face-verify', { selfieUrl });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new VerificationError(data?.error ?? 'Could not verify your selfie. Please try again.');
  return data;
}

// Single source of truth for "is this profile allowed to connect/chat" — used to gate
// messaging until the blue-check face verification above has passed.
export function isVerified(p?: Profile | null): boolean {
  return p?.verified === true;
}

// ---------- Notifications ----------

export async function updateNotificationPrefs(uid: string, prefs: NotificationPrefs) {
  await updatePrivate(uid, { notificationPrefs: prefs });
}

// ---------- Language ----------

export async function updateLanguage(uid: string, language: LanguageCode) {
  await updatePrivate(uid, { language });
}

// ---------- Premium ----------

export async function upgradeToPremium(uid: string, plan: PremiumPlan) {
  const days = plan === 'monthly' ? 30 : 90;
  await updatePrivate(uid, {
    premium: true,
    premiumPlan: plan,
    premiumSince: Date.now(),
    premiumExpiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
  });
}

export async function cancelPremium(uid: string) {
  await updatePrivate(uid, { premium: false });
}

// ---------- Data controls ----------

export async function exportMyData(uid: string) {
  const [profile, matchesSnap, sentSnap, receivedSnap, shortlistSnap] = await Promise.all([
    getProfile(uid),
    getDocs(query(collection(db, 'matches'), where('users', 'array-contains', uid))),
    getDocs(query(collection(db, 'interests'), where('from', '==', uid))),
    getDocs(query(collection(db, 'interests'), where('to', '==', uid))),
    getDocs(query(collection(db, 'shortlists'), where('owner', '==', uid))),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    matches: matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    interestsSent: sentSnap.docs.map((d) => d.data()),
    interestsReceived: receivedSnap.docs.map((d) => d.data()),
    shortlist: shortlistSnap.docs.map((d) => d.data()),
  };
}

// Deletes EVERYTHING for the signed-in account on the server (profile + private docs, photos and
// selfies in Storage, likes, matches and all messages, notifications, photo hashes, phone/email
// claims) and then the Auth user itself. See /api/account/delete. Throws Error with
// `code === 'reauth-required'` if the sign-in is older than 10 minutes.
export async function deleteMyProfileData(_uid: string) {
  void _uid;
  const res = await authedFetch('/api/account/delete');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data?.error ?? 'Could not delete your account.') as Error & { code?: string };
    err.code = data?.code;
    throw err;
  }
}

export function listenMatches(uid: string, cb: (matches: MatchDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'matches'), where('users', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const matches = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MatchDoc, 'id'>) }));
    matches.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    cb(matches);
  });
}

export async function getMatch(matchId: string): Promise<MatchDoc | null> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<MatchDoc, 'id'>) }) : null;
}

// ---------- Messages ----------

export function listenMessages(matchId: string, cb: (messages: MessageDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'matches', matchId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MessageDoc, 'id'>) })));
  });
}

export class BlockedError extends Error {
  constructor() {
    super('Not available \u2014 you or this person has blocked the other.');
    this.name = 'BlockedError';
  }
}

export class MessagingRestrictedError extends Error {
  constructor() {
    super('This person only accepts messages from verified accounts.');
    this.name = 'MessagingRestrictedError';
  }
}

export async function sendMessage(
  matchId: string,
  from: string,
  to: string,
  text: string,
  replyTo?: { id: string; text: string; from: string }
) {
  const now = Date.now();
  text = text.trim();
  if (!text) return;
  if (text.length > 2000) throw new ContentPolicyError('That message is too long (max 2000 characters).');

  // Chat lock + friendly-chat strikes + regex/AI screening (see /api/groq/message-moderation).
  await assertMessageAllowed(from, text);

  const userRef = doc(db, 'users', from);
  const privRef = doc(db, 'userPrivate', from);
  const otherRef = doc(db, 'users', to);
  const matchRef = doc(db, 'matches', matchId);
  const msgRef = doc(collection(db, 'matches', matchId, 'messages'));

  try {
    await runTransaction(db, async (tx) => {
      // Public docs for account age/verification and the recipient's "only verified" flag;
      // my own private doc for my block list and rate-limit window. The recipient's block list is
      // private — firestore.rules enforce it on the write below.
      const [userSnap, privSnap, otherSnap] = await Promise.all([tx.get(userRef), tx.get(privRef), tx.get(otherRef)]);
      const userData = userSnap.exists() ? (userSnap.data() as Profile) : null;
      const privData = privSnap.exists() ? (privSnap.data() as Profile) : null;
      const otherData = otherSnap.exists() ? (otherSnap.data() as Profile) : null;

      if ((privData?.blockedUsers ?? []).includes(to)) throw new BlockedError();

      if (otherData?.onlyVerifiedCanMessage && userData?.verified !== true) {
        throw new MessagingRestrictedError();
      }

      if (userData) {
        const accountAgeMs = now - (userData.createdAt ?? 0);
        if (accountAgeMs < NEW_ACCOUNT_MS) {
          const windowStart = privData?.msgWindowStart ?? 0;
          const windowCount = privData?.msgWindowCount ?? 0;
          const windowElapsed = now - windowStart >= RATE_WINDOW_MS;

          if (!windowElapsed && windowCount >= MAX_MESSAGES_PER_WINDOW) {
            throw new RateLimitError(RATE_WINDOW_MS - (now - windowStart));
          }

          tx.set(privRef, windowElapsed
            ? { msgWindowStart: now, msgWindowCount: 1 }
            : { msgWindowStart: windowStart, msgWindowCount: windowCount + 1 }, { merge: true });
        }
      }

      tx.set(msgRef, {
        text, from, createdAt: now, delivered: false, read: false,
        participants: [from, to],
        ...(replyTo ? { replyTo } : {}),
      });
      tx.update(matchRef, { lastMessage: text, lastMessageAt: now, lastMessageFrom: from });
    });
  } catch (e) {
    // Rules reject blocked pairs, unverified/moderated senders, etc. with permission-denied.
    if ((e as { code?: string })?.code === 'permission-denied') throw new BlockedError();
    throw e;
  }
  // serverTimestamp import kept available for future use (e.g. ordering across clients with clock skew)
  void serverTimestamp;
}

// ---------- Edit / Unsend ----------
// Both are sender-only (enforced in firestore.rules): only the person who wrote
// the message can change its text, edit it, or unsend it.

export async function editMessage(matchId: string, messageId: string, newText: string) {
  newText = newText.trim();
  if (!newText) return;
  if (newText.length > 2000) throw new ContentPolicyError('That message is too long (max 2000 characters).');
  // Edits get the same checks as new messages — otherwise "hi" could be edited into anything.
  const uid = auth.currentUser?.uid;
  if (uid) await assertMessageAllowed(uid, newText);
  const ref2 = doc(db, 'matches', matchId, 'messages', messageId);
  await updateDoc(ref2, { text: newText, editedAt: Date.now() });
}

// Soft-delete: clears the text and flags the message as unsent rather than
// removing the doc, so read/delivery state and any replies quoting it survive.
export async function unsendMessage(matchId: string, messageId: string) {
  const ref2 = doc(db, 'matches', matchId, 'messages', messageId);
  await updateDoc(ref2, { deleted: true, deletedAt: Date.now(), text: '' });
}

// ---------- Delivery Receipts ----------
// "Sent" = the message doc exists in Firestore (implicit, no flag needed).
// "Delivered" = the recipient's device has received it in realtime, anywhere in the app —
// tracked globally via listenUndeliveredMessagesForUser, not just while a specific chat is open.
// "Read" = the recipient has actually opened that chat.

export async function markMessagesAsDelivered(matchId: string, userId: string) {
  const q = query(
    collection(db, 'matches', matchId, 'messages'),
    where('from', '!=', userId),
    where('delivered', '==', false)
  );
  const snap = await getDocs(q);
  const now = Date.now();
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { delivered: true, deliveredAt: now })));
}

// Listens across ALL of a user's matches (via a collection-group query) so incoming messages get
// marked delivered the moment this device is online, regardless of which screen is open.
// Scoped to this user's own matches via the "participants" field on each message (see
// sendMessage) — without that scoping, the query would try to read messages from every match
// in the app and Firestore denies the *entire* query the moment it hits one the user isn't
// part of. Requires a Firestore composite index: participants (array-contains), from (asc),
// delivered (asc).
export function listenUndeliveredMessagesForUser(uid: string): Unsubscribe {
  const q = query(
    collectionGroup(db, 'messages'),
    where('participants', 'array-contains', uid),
    where('from', '!=', uid),
    where('delivered', '==', false)
  );
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    snap.docs.forEach((d) => {
      updateDoc(d.ref, { delivered: true, deliveredAt: now }).catch(() => {
        // Ignore permission errors for messages in matches this listener races to see
        // before the parent match doc is fully readable — they'll be marked delivered
        // on the next snapshot or when the chat is opened.
      });
    });
  }, () => {
    // Swallow listener errors (e.g. missing index while it's still building, or offline).
  });
}

// ---------- Read Receipts ----------

export async function markMessagesAsRead(matchId: string, userId: string) {
  const q = query(
    collection(db, 'matches', matchId, 'messages'),
    where('from', '!=', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const now = Date.now();
  // Reading implies delivered too, in case the global delivery listener hasn't caught up yet.
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true, readAt: now, delivered: true, deliveredAt: now })));
}

export function listenReadStatus(matchId: string, cb: (messages: MessageDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'matches', matchId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MessageDoc, 'id'>) })));
  });
}

// ---------- Message Reactions ----------
// One reaction per user per message, stored as a map on the message doc
// (reactions.{uid} = emoji). Tapping the same emoji again clears it; tapping
// a different emoji swaps it. Delivered/read status is picked up live via
// the existing listenMessages subscription, so no separate listener is needed.

export async function setReaction(matchId: string, messageId: string, userId: string, emoji: string) {
  const ref2 = doc(db, 'matches', matchId, 'messages', messageId);
  await updateDoc(ref2, { [`reactions.${userId}`]: emoji });
}

export async function removeReaction(matchId: string, messageId: string, userId: string) {
  const ref2 = doc(db, 'matches', matchId, 'messages', messageId);
  await updateDoc(ref2, { [`reactions.${userId}`]: deleteField() });
}

// Convenience: sets the emoji, or clears it if the user already reacted with it.
export async function toggleReaction(matchId: string, messageId: string, userId: string, emoji: string, currentReactions?: Record<string, string>) {
  if (currentReactions?.[userId] === emoji) {
    await removeReaction(matchId, messageId, userId);
  } else {
    await setReaction(matchId, messageId, userId, emoji);
  }
}

// ---------- Typing Indicators ----------

export async function setTypingStatus(matchId: string, userId: string, isTyping: boolean) {
  const typingRef = doc(db, 'matches', matchId, 'typing', userId);
  if (isTyping) {
    await setDoc(typingRef, {
      matchId,
      userId,
      isTyping: true,
      updatedAt: Date.now(),
    } satisfies TypingIndicator);
  } else {
    await deleteDoc(typingRef);
  }
}

export function listenTypingStatus(matchId: string, cb: (typingUsers: string[]) => void): Unsubscribe {
  const q = query(collection(db, 'matches', matchId, 'typing'));
  return onSnapshot(q, (snap) => {
    const typingUsers = snap.docs
      .map((d) => (d.data() as TypingIndicator).userId)
      .filter((u) => u);
    cb(typingUsers);
  });
}

// ---------- Online Presence ----------

export async function updateOnlineStatus(uid: string, online: boolean) {
  const ref2 = doc(db, 'users', uid);
  await updateDoc(ref2, {
    online,
    lastSeenAt: Date.now(),
  });
}

// Lets a user opt out of sharing their exact "last seen" timestamp. The online
// dot (live "active now" presence) is unaffected — this only controls the
// last-seen-at-time text shown once someone goes offline.
export async function updateLastSeenVisibility(uid: string, hideLastSeen: boolean) {
  await updateDoc(doc(db, 'users', uid), { hideLastSeen });
}

// Lets a user require that only face-verified accounts can message them. Reconstructed
// to match the existing hideLastSeen toggle's shape/pattern.
export async function updateOnlyVerifiedCanMessage(uid: string, onlyVerifiedCanMessage: boolean) {
  await updateDoc(doc(db, 'users', uid), { onlyVerifiedCanMessage });
}

// Lets a user (intended for women) turn on extra safety filtering: verified-only feed,
// more aggressive filtering of thin/low-signal profiles, and — mirrored here on the
// server so it can't be bypassed by a stale client — force-enables onlyVerifiedCanMessage
// while it's on. Turning womenSafetyMode off leaves onlyVerifiedCanMessage as-is, since the
// user may have wanted that setting independent of women safety mode.
export async function updateWomenSafetyMode(uid: string, womenSafetyMode: boolean) {
  const updates: Record<string, boolean> = { womenSafetyMode };
  if (womenSafetyMode) updates.onlyVerifiedCanMessage = true;
  await updateDoc(doc(db, 'users', uid), updates);
}

export type PresenceInfo = { online: boolean; lastSeenAt?: number; hideLastSeen?: boolean };

// Single-user realtime presence: online status + last-seen timestamp + whether
// that user has chosen to hide their last-seen from others.
export function listenUserPresence(uid: string, cb: (presence: PresenceInfo) => void): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as Profile;
    cb({ online: data.online ?? false, lastSeenAt: data.lastSeenAt, hideLastSeen: data.hideLastSeen });
  });
}

// ---------- Activity Notifications ----------

// Activity notifications for OTHER users are created server-side (POST /api/notifications/create,
// via notify() in notify.ts) — clients can no longer write /notifications directly.

export function listenActivityNotifications(uid: string, cb: (notifications: ActivityNotification[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    fsLimit(50)
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ActivityNotification, 'id'>),
    }));
    cb(notifications);
  });
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsAsRead(uid: string) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((doc) => updateDoc(doc.ref, { read: true })));
}

// ---------- Phase 3: contact, WhatsApp, private photos, spotlight ----------

export function contactRequestIdFor(requester: string, target: string, type: ContactRequestType) {
  return `${requester}_${target}_${type}`;
}

export async function requestContact(
  requester: string,
  target: string,
  type: ContactRequestType,
) {
  if (requester === target) throw new Error('You cannot request your own contact details.');
  const me = await getProfile(requester);
  if (!me?.premium) throw new Error('Contact requests are a Premium feature.');
  const id = contactRequestIdFor(requester, target, type);
  const existing = await getDoc(doc(db, 'contactRequests', id));
  const now = Date.now();
  const data: ContactRequestDoc = {
    id, requester, target, type,
    status: existing.exists() ? (existing.data() as ContactRequestDoc).status : 'pending',
    createdAt: existing.exists() ? (existing.data() as ContactRequestDoc).createdAt : now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'contactRequests', id), data);
}

export function listenContactRequests(uid: string, cb: (items: ContactRequestDoc[]) => void) {
  const q1 = query(collection(db, 'contactRequests'), where('target', '==', uid));
  const q2 = query(collection(db, 'contactRequests'), where('requester', '==', uid));
  let incoming: ContactRequestDoc[] = [];
  let outgoing: ContactRequestDoc[] = [];
  const emit = () => cb([...incoming, ...outgoing].sort((a, b) => b.updatedAt - a.updatedAt));
  const u1 = onSnapshot(q1, s => { incoming = s.docs.map(d => ({ id: d.id, ...d.data() } as ContactRequestDoc)); emit(); }, () => emit());
  const u2 = onSnapshot(q2, s => { outgoing = s.docs.map(d => ({ id: d.id, ...d.data() } as ContactRequestDoc)); emit(); }, () => emit());
  return () => { u1(); u2(); };
}

export async function respondToContactRequest(
  id: string,
  targetUid: string,
  status: 'approved' | 'declined',
  sharedPhone?: string,
) {
  const ref2 = doc(db, 'contactRequests', id);
  const snap = await getDoc(ref2);
  if (!snap.exists()) throw new Error('Request not found.');
  const item = snap.data() as ContactRequestDoc;
  if (item.target !== targetUid) throw new Error('You cannot respond to this request.');
  await updateDoc(ref2, {
    status,
    updatedAt: Date.now(),
    ...(status === 'approved' && sharedPhone ? { sharedPhone: sharedPhone.replace(/[^0-9+]/g, '').slice(0, 15) } : {}),
  });
}

export function photoAccessIdFor(requester: string, owner: string) { return `${requester}_${owner}`; }

export async function requestPrivatePhotos(requester: string, owner: string) {
  if (requester === owner) return;
  const id = photoAccessIdFor(requester, owner);
  const existing = await getDoc(doc(db, 'photoAccessRequests', id));
  if (existing.exists() && (existing.data() as PhotoAccessRequestDoc).status === 'approved') return;
  const now = Date.now();
  await setDoc(doc(db, 'photoAccessRequests', id), {
    requester, owner, status: 'pending', createdAt: existing.exists() ? (existing.data() as PhotoAccessRequestDoc).createdAt : now, updatedAt: now,
  });
}

export function listenPhotoAccessRequests(uid: string, cb: (items: PhotoAccessRequestDoc[]) => void) {
  const q1 = query(collection(db, 'photoAccessRequests'), where('owner', '==', uid));
  const q2 = query(collection(db, 'photoAccessRequests'), where('requester', '==', uid));
  let incoming: PhotoAccessRequestDoc[] = [], outgoing: PhotoAccessRequestDoc[] = [];
  const emit = () => cb([...incoming, ...outgoing].sort((a, b) => b.updatedAt - a.updatedAt));
  const u1 = onSnapshot(q1, s => { incoming = s.docs.map(d => ({ id: d.id, ...d.data() } as PhotoAccessRequestDoc)); emit(); }, () => emit());
  const u2 = onSnapshot(q2, s => { outgoing = s.docs.map(d => ({ id: d.id, ...d.data() } as PhotoAccessRequestDoc)); emit(); }, () => emit());
  return () => { u1(); u2(); };
}

export async function respondToPrivatePhotoRequest(id: string, ownerUid: string, approve: boolean, photoUrls: string[] = []) {
  const ref2 = doc(db, 'photoAccessRequests', id);
  const snap = await getDoc(ref2);
  if (!snap.exists()) throw new Error('Request not found.');
  const item = snap.data() as PhotoAccessRequestDoc;
  if (item.owner !== ownerUid) throw new Error('You cannot respond to this request.');
  await updateDoc(ref2, { status: approve ? 'approved' : 'declined', updatedAt: Date.now(), ...(approve ? { photoUrls: photoUrls.slice(0, 6) } : {}) });
}

export async function getApprovedPrivatePhotos(requester: string, owner: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'photoAccessRequests', photoAccessIdFor(requester, owner)));
  if (!snap.exists()) return [];
  const d = snap.data() as PhotoAccessRequestDoc;
  return d.status === 'approved' ? (d.photoUrls ?? []) : [];
}

export async function activateSpotlight(uid: string) {
  const p = await getProfile(uid);
  if (!p?.premium) throw new Error('Spotlight is a Premium feature.');
  const now = Date.now();
  const expiresAt = now + 60 * 60 * 1000;
  await setDoc(doc(db, 'spotlights', uid), { uid, startedAt: now, expiresAt });
}

export async function getActiveSpotlights(): Promise<SpotlightDoc[]> {
  const snap = await getDocs(query(collection(db, 'spotlights')));
  const now = Date.now();
  return snap.docs.map(d => d.data() as SpotlightDoc).filter(s => s.expiresAt > now);
}

// Premium messaging is implemented as a gated intro request. If the recipient accepts,
// the app can continue the conversation through the existing matched-chat system.
export async function sendPremiumMessage(from: string, to: string, text: string) {
  const p = await getProfile(from);
  if (!p?.premium) throw new Error('Premium Messaging requires Premium.');
  const clean = text.trim().slice(0, 500);
  if (!clean) throw new Error('Write a short introduction first.');
  const id = `${from}_${to}`;
  await setDoc(doc(db, 'premiumMessages', id), { from, to, text: clean, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() });
}

export function listenPremiumMessages(uid: string, cb: (items: PremiumMessageDoc[]) => void) {
  const q1 = query(collection(db, 'premiumMessages'), where('to', '==', uid));
  const q2 = query(collection(db, 'premiumMessages'), where('from', '==', uid));
  let incoming: PremiumMessageDoc[] = [], outgoing: PremiumMessageDoc[] = [];
  const emit = () => cb([...incoming, ...outgoing].sort((a, b) => b.updatedAt - a.updatedAt));
  const u1 = onSnapshot(q1, s => { incoming = s.docs.map(d => ({ id: d.id, ...d.data() } as PremiumMessageDoc)); emit(); }, () => emit());
  const u2 = onSnapshot(q2, s => { outgoing = s.docs.map(d => ({ id: d.id, ...d.data() } as PremiumMessageDoc)); emit(); }, () => emit());
  return () => { u1(); u2(); };
}

export async function respondToPremiumMessage(id: string, to: string, status: 'accepted' | 'declined') {
  const ref2 = doc(db, 'premiumMessages', id);
  const snap = await getDoc(ref2);
  if (!snap.exists()) throw new Error('Message not found.');
  const item = snap.data() as PremiumMessageDoc;
  if (item.to !== to) throw new Error('You cannot respond to this message.');
  await updateDoc(ref2, { status, updatedAt: Date.now() });
  if (status === 'accepted') {
    await createMatchForAccepted(to, item.from);
  }
}

export async function saveFamilyAccount(owner: string, data: Omit<FamilyAccountDoc, 'id' | 'owner' | 'createdAt' | 'updatedAt' | 'status'>) {
  const id = `${owner}_${Date.now()}`;
  const now = Date.now();
  await setDoc(doc(db, 'familyAccounts', id), { id, owner, ...data, status: 'invited', createdAt: now, updatedAt: now });
}

export function listenFamilyAccounts(owner: string, cb: (items: FamilyAccountDoc[]) => void) {
  const q = query(collection(db, 'familyAccounts'), where('owner', '==', owner));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as FamilyAccountDoc)).sort((a,b) => b.createdAt-a.createdAt)), () => cb([]));
}
