export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type NotificationPrefs = {
  matches: boolean;
  messages: boolean;
  likes: boolean;
};

export type LanguageCode = 'en' | 'ta' | 'hi' | 'te';

export type PremiumPlan = 'monthly' | 'quarterly';

export type ProfileCreatedBy = 'Self' | 'Parent' | 'Sibling' | 'Friend';

export type ManglikStatus = 'Yes' | 'No' | 'Partial (Anshik)' | "Don't know";

export type RelocationPreference = 'Yes' | 'No' | 'Open to discuss';

export type NriStatus = 'Resident Indian' | 'NRI' | 'PIO / OCI' | 'Foreign national';

export type FamilyDetails = {
  familyType?: string;       // Joint / Nuclear
  familyStatus?: string;     // Middle class / Upper middle class / Affluent
  familyValues?: string;     // Orthodox / Traditional / Moderate / Liberal
  fatherOccupation?: string;
  motherOccupation?: string;
  brothers?: number;
  brothersMarried?: number;
  sisters?: number;
  sistersMarried?: number;
  about?: string;            // short free-text note, max 300 chars
};

// For every list field an empty / missing value means "no preference". Community lists may
// include "No bar".
export type PartnerPreferences = {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  maritalStatus?: string[];
  religion?: string[];
  community?: string[];
  motherTongue?: string[];
  education?: string[];
  occupation?: string[];
  annualIncome?: string[];
  diet?: string[];
  states?: string[];
  nriStatus?: NriStatus[];
  manglik?: 'Yes' | 'No' | "Doesn't matter";
  about?: string;            // free-text "what I'm looking for", max 500 chars
};

export type Profile = {
  uid: string;
  // PRIVATE (userPrivate/{uid}) — only present on your own merged profile, never on others'.
  phone?: string | null;
  email?: string | null;
  name: string;
  dob?: string; // ISO date — PRIVATE; other users only see `age`
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  /** @deprecated Dating field. Matrimony search targets the opposite gender by default; use `partnerPreferences`. Kept optional so existing docs still load. */
  interestedIn?: 'Male' | 'Female' | 'Both';
  /** @deprecated Dating field, superseded by `maritalStatus`. */
  relationship?: string;
  bio: string;
  /** @deprecated Dating field, superseded by `partnerPreferences.about`. */
  expectations?: string;
  /** @deprecated Superseded by `occupation`. */
  work?: string;
  drinking: string;
  smoking: string;
  location: string;
  // Exact GPS fix — PRIVATE (own profile only).
  latitude?: number;
  longitude?: number;
  // Public ~11 km grid cell derived from the exact fix; what other users see.
  approxLatitude?: number;
  approxLongitude?: number;
  // Set by moderators only; hidden from discovery when true.
  moderated?: boolean;
  job: string;
  interests: string[];
  images: string[];
  verified: boolean;

  // ---- Matrimony details (all optional; option lists live in matrimony.ts / communities.ts) ----
  // Basics
  createdBy?: ProfileCreatedBy; // who is filling in / managing this profile
  profileFor?: string;      // Self / Son / Daughter / Brother / Sister / Relative / Friend (who the match is for)
  maritalStatus?: string;   // Never married / Divorced / Widowed / Awaiting divorce
  heightCm?: number;
  religion?: string;
  community?: string;       // caste / community / denomination; free text, "No bar" allowed (see communities.ts)
  motherTongue?: string;

  // Education & career
  education?: string;
  occupation?: string;      // occupation category, e.g. "Software / IT"; `job` stays the free-text title
  annualIncome?: string;    // income bucket label
  diet?: string;            // Vegetarian / Non-vegetarian / Eggetarian / Vegan / Jain

  // Location & family
  state?: string;           // Indian state / UT, or "Outside India"
  nativePlace?: string;     // hometown / ancestral place, free text
  willingToRelocate?: RelocationPreference;
  nriStatus?: NriStatus;
  countryOfResidence?: string; // when not living in India
  familyDetails?: FamilyDetails;

  // Partner preferences (public — shown on the profile and used for match scoring)
  partnerPreferences?: PartnerPreferences;

  // Horoscope. star / rashi / manglik are public so members can filter and match on them.
  // birthTime / birthPlace are PRIVATE (userPrivate/{uid}) — see profile-fields.ts.
  star?: string;            // nakshatra
  rashi?: string;           // moon sign
  manglik?: ManglikStatus;
  birthTime?: string;       // 24h "HH:mm" — PRIVATE
  birthPlace?: string;      // city / town of birth — PRIVATE

  online: boolean;
  lastSeenAt?: number;
  profileComplete: boolean;
  createdAt: number;
  updatedAt: number;

  // Verification
  verificationStatus?: VerificationStatus;
  verificationSelfieUrl?: string;
  // Set when verificationStatus === 'rejected', explaining why the automated
  // face-match check didn't pass (shown to the user so they know what to fix).
  verificationRejectionReason?: string;

  // Privacy & safety
  blockedUsers?: string[];
  mutedMatches?: string[];
  // When true, this user's "last seen" timestamp is hidden from others (they'll only
  // see the live online dot while active). Mirrors the common reciprocal convention:
  // hiding your own last seen also hides everyone else's from you — enforced in the UI.
  hideLastSeen?: boolean;
  // If true, only face-verified accounts (see `verified`) can message this profile.
  onlyVerifiedCanMessage?: boolean;
  // Opt-in extra filtering for women: verified-only feed/messaging plus more aggressive
  // filtering of thin/low-signal profiles. Enabling it force-enables onlyVerifiedCanMessage.
  womenSafetyMode?: boolean;

  // Notifications
  notificationPrefs?: NotificationPrefs;

  // Language
  language?: LanguageCode;

  // Push notifications — one token per device/browser the user granted permission on
  fcmTokens?: string[];

  // Premium
  premium?: boolean;
  premiumPlan?: PremiumPlan;
  premiumSince?: number;
  premiumExpiresAt?: number;
  // Owner-only private gallery; never written to the public users document.
  privatePhotoUrls?: string[];

  // Daily outgoing-interest counter (field names predate the interest flow; see consumeDailyInterestQuota).
  swipesUsed?: number;
  swipesResetAt?: number;

  // Spam/bot rate limiting for new accounts. Fixed 60s window: msgWindowCount messages
  // sent since msgWindowStart. Rolls over (count resets to 1) once the window has fully
  // elapsed. Only enforced while the account is "new" (see NEW_ACCOUNT_MS in firestore.ts) —
  // established accounts aren't gated by this.
  msgWindowStart?: number;
  msgWindowCount?: number;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  matches: true,
  messages: true,
  likes: true,
};

export type ReportReason = 'fake_profile' | 'inappropriate' | 'harassment' | 'spam' | 'underage' | 'other';

export type ReportPriority = 'critical' | 'high' | 'normal';
export type ReportStatus = 'open' | 'triaged' | 'actioned' | 'dismissed';

export type ReportDoc = {
  id?: string;
  reporterUid: string;
  reportedUid: string;
  reason: ReportReason;
  details: string;
  createdAt: number;
  status: ReportStatus;
  priority?: ReportPriority;
  autoRestricted?: boolean;
};

// ---------- Interests (replaces swiping) ----------
// interests/{from}_{to}. The sender creates it as 'pending'; only the recipient can move it
// to 'accepted' or 'declined'. Accepting creates the matches/{pair} doc that unlocks chat.
// A declined interest is final: the sender cannot re-send to the same person.
export type InterestStatus = 'pending' | 'accepted' | 'declined';

export type InterestDoc = {
  from: string;
  to: string;
  status: InterestStatus;
  message?: string; // optional short note, max 200 chars
  createdAt: number;
  updatedAt: number;
};

// shortlists/{owner}_{target} — private bookmark, the target is never told.
export type ShortlistDoc = {
  owner: string;
  target: string;
  createdAt: number;
};

// profileViews/{viewer}_{target} — one doc per pair, `viewedAt` is the latest visit.
export type ProfileViewDoc = {
  viewer: string;
  target: string;
  viewedAt: number;
  count: number;
};

// ---------- Trust ratings ----------
// A separate axis from the like/superlike/pass swipe above: any signed-in user can leave
// someone a "likes" score (0-10). Women additionally leave a "stars" trust rating (0-10) —
// men never write a `stars` field at all (enforced in firestore.rules, not just the UI), so
// averaging `stars` across a target's ratings only ever reflects what women rated them.
export type RatingDoc = {
  from: string;
  to: string;
  likes: number; // 0-10, either gender
  stars?: number; // 0-10, present only when `from` is a woman
  createdAt: number;
  updatedAt: number;
};

export type RatingSummary = {
  avgStars: number; // 0-10, average of stars across women who rated this profile; 0 if none yet
  starsCount: number; // how many women have left a star rating
  totalLikes: number; // sum of the `likes` field across every rating this profile has received
};

export type MatchDoc = {
  id: string;
  users: [string, string];
  createdAt: number;
  lastMessage: string;
  lastMessageAt: number;
  lastMessageFrom?: string;
  // Per-user "I've opened this chat as of ..." stamp, keyed by uid. Used to derive an
  // unread badge on the Chats tab without a separate query: a match is unread for uid
  // when lastMessageFrom !== uid && lastMessageAt > (lastReadAt?.[uid] ?? 0).
  lastReadAt?: Record<string, number>;
};

export type MessageDoc = {
  id: string;
  text: string;
  from: string;
  createdAt: number;
  // Delivery lifecycle: written to Firestore (sent, implicit — the doc exists) ->
  // recipient's device received it in realtime (delivered) -> recipient opened the chat (read).
  delivered: boolean;
  deliveredAt?: number;
  read: boolean;
  readAt?: number;
  // Emoji reactions, keyed by the reacting user's uid so each person has at most
  // one reaction per message. Absent/empty means no reactions yet.
  reactions?: Record<string, string>;
  // Set once the sender edits the message's text after sending. The original
  // text is not retained.
  editedAt?: number;
  // Soft-delete ("unsend"): text is cleared and the bubble renders a placeholder
  // instead. Kept as a doc (rather than removed) so ordering, replies that quote
  // it, and read/delivery state stay intact.
  deleted?: boolean;
  deletedAt?: number;
  // Snapshot of the message being replied to, captured at reply time so the
  // quote still renders correctly even if the original is later edited or unsent.
  replyTo?: {
    id: string;
    text: string;
    from: string;
  };
};

export const MESSAGE_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'] as const;

export type TypingIndicator = {
  matchId: string;
  userId: string;
  isTyping: boolean;
  updatedAt: number;
};



export type ContactRequestType = 'phone' | 'whatsapp';
export type ContactRequestStatus = 'pending' | 'approved' | 'declined';

export type ContactRequestDoc = {
  id?: string;
  requester: string;
  target: string;
  type: ContactRequestType;
  status: ContactRequestStatus;
  createdAt: number;
  updatedAt: number;
  sharedPhone?: string;
};

export type PhotoAccessRequestStatus = 'pending' | 'approved' | 'declined';
export type PhotoAccessRequestDoc = {
  id?: string;
  requester: string;
  owner: string;
  status: PhotoAccessRequestStatus;
  createdAt: number;
  updatedAt: number;
  photoUrls?: string[];
};

export type SpotlightDoc = {
  uid: string;
  startedAt: number;
  expiresAt: number;
};

export type PremiumMessageDoc = {
  id?: string;
  from: string;
  to: string;
  text: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  updatedAt: number;
};

export type FamilyMemberRole = 'parent' | 'sibling' | 'relative';
export type FamilyAccountDoc = {
  id?: string;
  owner: string;
  memberUid?: string;
  memberEmail?: string;
  memberName: string;
  role: FamilyMemberRole;
  permissions: ('profile' | 'matches' | 'messages')[];
  status: 'invited' | 'active' | 'revoked';
  createdAt: number;
  updatedAt: number;
};

export type ActivityNotification = {
  id?: string;
  userId: string;
  type: 'like' | 'match' | 'message' | 'superlike' | 'interest' | 'accepted';
  fromUser: string; // display name, derived server-side from the sender's profile
  fromUid?: string;
  matchId?: string;
  read: boolean;
  createdAt: number;
};
