// Single source of truth for which profile fields are PUBLIC (users/{uid}, readable by any
// signed-in user) and which are PRIVATE (userPrivate/{uid}, readable only by the owner).
//
// Anything not explicitly listed as public defaults to private, so a newly added sensitive
// field can never leak by accident. firestore.rules enforces the same public allowlist.

export const PUBLIC_PROFILE_FIELDS = [
  'uid', 'name', 'age', 'gender', 'interestedIn', 'relationship', 'bio', 'expectations',
  'work', 'drinking', 'smoking', 'location', 'approxLatitude', 'approxLongitude', 'job',
  'interests', 'images', 'verified', 'verificationStatus', 'online', 'lastSeenAt',
  'hideLastSeen', 'photoPrivacy', 'onlyVerifiedCanMessage', 'profileComplete', 'createdAt', 'updatedAt',
  // Matrimony details
  'profileFor', 'maritalStatus', 'heightCm', 'religion', 'community', 'motherTongue',
  'education', 'annualIncome', 'diet', 'state', 'createdBy', 'occupation', 'nativePlace',
  'willingToRelocate', 'nriStatus', 'countryOfResidence', 'familyDetails', 'partnerPreferences',
  // Horoscope: star / rashi / manglik are public (filterable). birthTime and birthPlace are
  // intentionally NOT listed, so they default to private (userPrivate/{uid}).
  'star', 'rashi', 'manglik',
  // Admin-controlled (clients cannot change it — see firestore.rules).
  'moderated',
] as const;

const PUBLIC_SET = new Set<string>(PUBLIC_PROFILE_FIELDS);

// ~11 km grid. Other users only ever see this coarse location, never the exact GPS fix.
export const approxCoord = (n: number) => Math.round(n * 10) / 10;

export type SplitProfile = {
  public: Record<string, unknown>;
  private: Record<string, unknown>;
};

export function splitProfile(data: Record<string, unknown>): SplitProfile {
  const pub: Record<string, unknown> = {};
  const priv: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (PUBLIC_SET.has(key)) pub[key] = value;
    else priv[key] = value;
  }
  // Exact coordinates stay private; publish only the fuzzed grid cell.
  const lat = data.latitude;
  const lng = data.longitude;
  if (typeof lat === 'number' && typeof lng === 'number') {
    pub.approxLatitude = approxCoord(lat);
    pub.approxLongitude = approxCoord(lng);
  }
  return { public: pub, private: priv };
}

export function mergeProfile(
  pub: Record<string, unknown>,
  priv?: Record<string, unknown>,
): Record<string, unknown> {
  return { ...pub, ...(priv ?? {}) };
}

// Fields that used to live on users/{uid} and must be moved out (see migrateLegacyProfile).
export const LEGACY_PRIVATE_KEYS = [
  'phone', 'email', 'dob', 'latitude', 'longitude', 'blockedUsers', 'mutedMatches',
  'notificationPrefs', 'language', 'fcmTokens', 'premium', 'premiumPlan', 'premiumSince',
  'premiumExpiresAt', 'superLikesUsed', 'superLikesResetAt', 'msgWindowStart',
  'msgWindowCount', 'verificationSelfieUrl', 'verificationRejectionReason',
] as const;
