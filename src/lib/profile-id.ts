// Member-facing profile IDs look like ISM1234567: a fixed prefix plus 7 digits.
export const PROFILE_ID_PREFIX = 'ISM';
const DIGITS = 7;
const PROFILE_ID_RE = new RegExp(`^${PROFILE_ID_PREFIX}\\d{${DIGITS}}$`);

export const isProfileId = (value: string): boolean => PROFILE_ID_RE.test(value);

// Turns whatever the member typed into a canonical profile ID, or null if it isn't one.
// Accepts "ISM1234567", "ism 1234567", "ISM-1234567" and the bare 7 digits "1234567".
// Anything else (a name, a city, a partial number) returns null so callers can treat the
// input as an ordinary keyword search.
export function normalizeProfileId(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim().toUpperCase().replace(/[\s-]+/g, '');
  const candidate = /^\d+$/.test(cleaned) ? `${PROFILE_ID_PREFIX}${cleaned}` : cleaned;
  return isProfileId(candidate) ? candidate : null;
}

// Random ID for a new profile. Callers must still check it isn't already taken.
export function generateProfileId(): string {
  const n = Math.floor(Math.random() * 10 ** DIGITS);
  return `${PROFILE_ID_PREFIX}${String(n).padStart(DIGITS, '0')}`;
}
