import type { Profile } from '@/lib/types';
import { NO_BAR_LABEL } from '@/lib/communities';

export {
  ALL_COMMUNITIES, COMMUNITIES_BY_RELIGION, MANGLIK_PREFERENCES, MANGLIK_STATUSES, NAKSHATRAS, RASHIS,
  communityOptions,
} from '@/lib/communities';

// ---------- Option lists (used by profile forms and search filters) ----------

export const PROFILE_FOR = ['Self', 'Son', 'Daughter', 'Brother', 'Sister', 'Relative', 'Friend'] as const;

export const MARITAL_STATUSES = ['Never married', 'Divorced', 'Widowed', 'Awaiting divorce'] as const;

export const RELIGIONS = [
  'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish',
  'Spiritual / no religion', 'Other',
] as const;

export const MOTHER_TONGUES = [
  'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Marathi', 'Gujarati', 'Bengali',
  'Punjabi', 'Odia', 'Assamese', 'Urdu', 'Konkani', 'Rajasthani', 'Bhojpuri', 'Maithili',
  'Kashmiri', 'Sindhi', 'Nepali', 'Tulu', 'English', 'Other',
] as const;

export const EDUCATION_LEVELS = [
  'High school', 'Diploma', "Bachelor's", 'Engineering / Tech', 'Medical', "Master's",
  'MBA / Management', 'CA / CS / Finance', 'Law', 'Doctorate', 'Other',
] as const;

export const INCOME_RANGES = [
  'Not working', 'Under ₹3 lakh', '₹3–6 lakh', '₹6–10 lakh', '₹10–20 lakh',
  '₹20–35 lakh', '₹35–60 lakh', '₹60 lakh – 1 crore', 'Above ₹1 crore',
] as const;

export const DIETS = ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan', 'Jain'] as const;

export const NO_BAR = NO_BAR_LABEL;

export const CREATED_BY = ['Self', 'Parent', 'Sibling', 'Friend'] as const;

export const OCCUPATIONS = [
  'Software / IT', 'Engineering (non-IT)', 'Doctor / Healthcare', 'Teaching / Academia', 'Government / PSU',
  'Civil services (IAS / IPS etc.)', 'Defence / Armed forces', 'Banking / Finance', 'CA / CS / Accounting',
  'Law', 'Business / Entrepreneur', 'Self-employed / Professional', 'Media / Creative / Design',
  'Sales / Marketing', 'Hospitality', 'Agriculture / Farming', 'Merchant Navy / Aviation', 'Research / Scientist',
  'Student', 'Homemaker', 'Not working', 'Other',
] as const;

export const FAMILY_TYPES = ['Joint', 'Nuclear'] as const;
export const FAMILY_STATUSES = ['Middle class', 'Upper middle class', 'Affluent'] as const;
export const FAMILY_VALUES = ['Orthodox', 'Traditional', 'Moderate', 'Liberal'] as const;

export const RELOCATION_OPTIONS = ['Yes', 'No', 'Open to discuss'] as const;

export const NRI_STATUSES = ['Resident Indian', 'NRI', 'PIO / OCI', 'Foreign national'] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman & Nicobar Islands', 'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry', 'Outside India',
] as const;

// ---------- Height ----------

export const HEIGHT_MIN_CM = 135;
export const HEIGHT_MAX_CM = 210;

export function formatHeight(cm?: number): string {
  if (!cm) return '';
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}'${inch}" (${cm} cm)`;
}

export function formatHeightShort(cm?: number): string {
  if (!cm) return '';
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

// ---------- Search filters ----------

export type SortBy = 'compatibility' | 'recommended';

export type SearchFilters = {
  ageMin: number;
  ageMax: number;
  heightMin: number;
  heightMax: number;
  maritalStatus: string[];   // empty = any
  religion: string[];        // empty = any
  community: string[];       // empty = any; containing "No bar" also means any
  motherTongue: string[];
  state: string[];
  education: string[];
  occupation: string[];
  annualIncome: string[];
  diet: string[];
  nriStatus: string[];       // residency status
  manglik: string[];         // Yes / No / Partial (Anshik)
  star: string[];            // nakshatra
  willingToRelocate: string[];
  verifiedOnly: boolean;
  withPhotoOnly: boolean;
  mutualOnly: boolean;       // hide profiles below MUTUAL_MATCH_MIN mutual compatibility
  sortBy: SortBy;
  keyword: string;           // matches name / occupation / city
};

export const DEFAULT_FILTERS: SearchFilters = {
  ageMin: 21,
  ageMax: 40,
  heightMin: HEIGHT_MIN_CM,
  heightMax: HEIGHT_MAX_CM,
  maritalStatus: [],
  religion: [],
  community: [],
  motherTongue: [],
  state: [],
  education: [],
  occupation: [],
  annualIncome: [],
  diet: [],
  nriStatus: [],
  manglik: [],
  star: [],
  willingToRelocate: [],
  verifiedOnly: false,
  withPhotoOnly: false,
  mutualOnly: false,
  sortBy: 'compatibility',
  keyword: '',
};

// Number of filters that differ from "show everything" — drives the badge on the filter button.
export function activeFilterCount(f: SearchFilters, base: SearchFilters = DEFAULT_FILTERS): number {
  let n = 0;
  if (f.ageMin !== base.ageMin || f.ageMax !== base.ageMax) n++;
  if (f.heightMin !== HEIGHT_MIN_CM || f.heightMax !== HEIGHT_MAX_CM) n++;
  n += [
    f.maritalStatus, f.religion, f.motherTongue, f.state, f.education, f.occupation, f.annualIncome,
    f.diet, f.nriStatus, f.manglik, f.star, f.willingToRelocate,
  ].filter((a) => a.length > 0).length;
  if (activeCommunities(f.community).length > 0) n++;
  if (f.verifiedOnly) n++;
  if (f.withPhotoOnly) n++;
  if (f.mutualOnly) n++;
  return n;
}

const norm = (s?: string) => (s ?? '').trim().toLowerCase();

// "No bar" in a community filter means the searcher doesn't care, so it switches the filter off
// (same rule preferenceMatch applies to partner preferences).
export function activeCommunities(list: string[]): string[] {
  if (list.some((c) => norm(c) === norm(NO_BAR))) return [];
  return list.filter((c) => c.trim() !== '');
}

// Exact match, or one is the broader parent of the other ("Sunni" vs "Sunni - Hanafi"). Plain
// substring matching would wrongly treat "Jat" as "Jatav".
function communityMatches(want: string, have: string): boolean {
  const w = norm(want);
  const h = norm(have);
  return w === h || h.startsWith(`${w} - `) || w.startsWith(`${h} - `);
}

const LIST_FILTER_KEYS = [
  'maritalStatus', 'religion', 'community', 'motherTongue', 'state', 'education', 'occupation',
  'annualIncome', 'diet', 'nriStatus', 'manglik', 'star', 'willingToRelocate',
] as const;

// Turns whatever was saved by an earlier version (e.g. `community` used to be a string) into a
// valid SearchFilters, so old saved searches keep working.
export function normalizeFilters(raw: unknown): SearchFilters {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: SearchFilters = { ...DEFAULT_FILTERS };
  for (const k of LIST_FILTER_KEYS) {
    const v = src[k];
    out[k] = Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string')
      : typeof v === 'string' && v.trim() ? [v.trim()] : [];
  }
  for (const k of ['ageMin', 'ageMax', 'heightMin', 'heightMax'] as const) {
    if (typeof src[k] === 'number' && Number.isFinite(src[k])) out[k] = src[k] as number;
  }
  for (const k of ['verifiedOnly', 'withPhotoOnly', 'mutualOnly'] as const) {
    if (typeof src[k] === 'boolean') out[k] = src[k] as boolean;
  }
  if (src.sortBy === 'compatibility' || src.sortBy === 'recommended') out.sortBy = src.sortBy;
  if (typeof src.keyword === 'string') out.keyword = src.keyword;
  return out;
}

// Profiles that left a field blank are NOT hidden by a filter on that field unless the
// person asks for it — most members fill matrimony details gradually, and silently
// dropping half the pool would make search look empty. `strictMissing` flips that.
export function matchesFilters(p: Profile, f: SearchFilters, strictMissing = false): boolean {
  if (p.age < f.ageMin || p.age > f.ageMax) return false;

  if (p.heightCm) {
    if (p.heightCm < f.heightMin || p.heightCm > f.heightMax) return false;
  } else if (strictMissing && (f.heightMin !== HEIGHT_MIN_CM || f.heightMax !== HEIGHT_MAX_CM)) return false;

  const inList = (list: string[], value?: string) => {
    if (list.length === 0) return true;
    if (!value) return !strictMissing;
    return list.some((x) => norm(x) === norm(value));
  };
  if (!inList(f.maritalStatus, p.maritalStatus)) return false;
  if (!inList(f.religion, p.religion)) return false;
  if (!inList(f.motherTongue, p.motherTongue)) return false;
  if (!inList(f.state, p.state)) return false;
  if (!inList(f.education, p.education)) return false;
  if (!inList(f.occupation, p.occupation)) return false;
  if (!inList(f.annualIncome, p.annualIncome)) return false;
  if (!inList(f.diet, p.diet)) return false;
  if (!inList(f.nriStatus, p.nriStatus)) return false;
  if (!inList(f.star, p.star)) return false;
  if (!inList(f.willingToRelocate, p.willingToRelocate)) return false;
  // "Don't know" is the same as not having answered.
  if (!inList(f.manglik, p.manglik === "Don't know" ? undefined : p.manglik)) return false;

  const wanted = activeCommunities(f.community);
  if (wanted.length > 0) {
    if (!p.community?.trim()) {
      if (strictMissing) return false;
    } else if (norm(p.community) !== norm(NO_BAR) && !wanted.some((w) => communityMatches(w, p.community!))) {
      // A profile that says "No bar" is open to anyone, so it always passes.
      return false;
    }
  }

  if (f.verifiedOnly && !p.verified) return false;
  if (f.withPhotoOnly && !(p.images && p.images.length > 0)) return false;

  const kw = norm(f.keyword);
  if (kw) {
    const hay = `${p.name} ${p.job} ${p.location} ${p.state ?? ''} ${p.community ?? ''}`.toLowerCase();
    if (!hay.includes(kw)) return false;
  }
  return true;
}

// Ordering for the results list: verified + photo + recently active first.
const qualityScore = (p: Profile) =>
  (p.verified ? 4 : 0) + (p.images?.length ? 2 : 0) + (p.online ? 1 : 0) + (p.premium ? 0.5 : 0);

export function rankProfiles(list: Profile[]): Profile[] {
  return [...list].sort((a, b) => qualityScore(b) - qualityScore(a) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

// Same, but highest mutual compatibility first. At equal scores a two-way match outranks a
// one-sided one; profiles with no score yet sort last, and ties fall back to quality ordering.
export function rankByCompatibility(list: Profile[], me: Profile | null | undefined): Profile[] {
  const compat = new Map(list.map((p) => [p.uid, mutualCompatibility(me, p)]));
  return [...list].sort((a, b) => {
    const ca = compat.get(a.uid)!;
    const cb = compat.get(b.uid)!;
    return (cb.score ?? -1) - (ca.score ?? -1)
      || Number(cb.twoWay) - Number(ca.twoWay)
      || qualityScore(b) - qualityScore(a)
      || (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });
}

// One-line "Hindu · Iyer · Tamil" style summary used on cards.
export function communityLine(p: Profile): string {
  return [p.religion, p.community && p.community !== NO_BAR ? p.community : '', p.motherTongue]
    .filter(Boolean)
    .join(' · ');
}

// "5'6" · Never married · Chennai" style facts row.
export function factsLine(p: Profile): string {
  return [formatHeightShort(p.heightCm), p.maritalStatus, p.location].filter(Boolean).join(' · ');
}

export function daysAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Sensible starting age window from the searcher's own age and gender, following the usual
// convention that the groom is a few years older. Members can change it in the filter sheet.
export function defaultFiltersFor(me?: Pick<Profile, 'age' | 'gender'> | null): SearchFilters {
  if (!me?.age) return { ...DEFAULT_FILTERS };
  const isMan = me.gender === 'Male';
  const ageMin = Math.max(18, isMan ? me.age - 7 : me.age - 2);
  const ageMax = Math.min(70, isMan ? me.age + 2 : me.age + 7);
  return { ...DEFAULT_FILTERS, ageMin, ageMax };
}

// ---------- Shared choices for forms ----------

export const HABITS = ['No', 'Occasionally', 'Yes'] as const;

export const HOBBIES = [
  'Travel', 'Reading', 'Cooking', 'Music', 'Movies', 'Photography', 'Yoga', 'Fitness', 'Cricket',
  'Dance', 'Art', 'Gardening', 'Volunteering', 'Spirituality', 'Writing', 'Trekking',
] as const;

// Every inch from 4'5" to 6'11", as centimetres, clamped to the allowed range.
export const HEIGHT_CHOICES_CM: number[] = (() => {
  const out: number[] = [];
  for (let inch = 53; inch <= 83; inch++) {
    const cm = Math.round(inch * 2.54);
    if (cm >= HEIGHT_MIN_CM && cm <= HEIGHT_MAX_CM) out.push(cm);
  }
  return out;
})();

export const AGE_CHOICES: number[] = Array.from({ length: 58 }, (_, i) => i + 18); // 18..75

// ---------- Display helpers ----------

export type DetailRow = { k: string; v: string };
export type DetailGroup = { title: string; rows: DetailRow[] };

const rows = (pairs: [string, string | undefined | false][]): DetailRow[] =>
  pairs.filter((p): p is [string, string] => typeof p[1] === 'string' && p[1].trim() !== '').map(([k, v]) => ({ k, v }));

const list = (a?: string[]) => (a && a.length ? a.join(', ') : undefined);

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function siblingsLine(f?: Profile['familyDetails']): string | undefined {
  if (!f) return undefined;
  const parts: string[] = [];
  if (f.brothers !== undefined) {
    parts.push(f.brothers === 0 ? 'No brothers' : `${plural(f.brothers, 'brother', 'brothers')}${f.brothersMarried ? ` (${f.brothersMarried} married)` : ''}`);
  }
  if (f.sisters !== undefined) {
    parts.push(f.sisters === 0 ? 'No sisters' : `${plural(f.sisters, 'sister', 'sisters')}${f.sistersMarried ? ` (${f.sistersMarried} married)` : ''}`);
  }
  return parts.length ? parts.join(', ') : undefined;
}

// What to show on a profile page, grouped. `showPrivate` adds birth time/place, which only the
// owner's merged profile contains.
export function profileDetailGroups(p: Profile, opts: { showPrivate?: boolean } = {}): DetailGroup[] {
  const f = p.familyDetails;
  const residency = [p.nriStatus, p.nriStatus && p.nriStatus !== 'Resident Indian' ? p.countryOfResidence : ''].filter(Boolean).join(' · ');
  const groups: DetailGroup[] = [
    {
      title: 'Basic details',
      rows: rows([
        ['Profile created by', p.createdBy ?? p.profileFor],
        ['Height', formatHeight(p.heightCm)],
        ['Marital status', p.maritalStatus],
        ['Mother tongue', p.motherTongue],
        ['Diet', p.diet],
        ['Drinking', p.drinking],
        ['Smoking', p.smoking],
      ]),
    },
    { title: 'Religion & community', rows: rows([['Religion', p.religion], ['Community', p.community]]) },
    {
      title: 'Education & career',
      rows: rows([
        ['Education', p.education],
        ['Occupation', p.occupation],
        ['Job title', p.job],
        ['Annual income', p.annualIncome],
      ]),
    },
    {
      title: 'Location',
      rows: rows([
        ['Lives in', [p.location, p.state].filter(Boolean).join(', ')],
        ['Native place', p.nativePlace],
        ['Residency status', residency],
        ['Willing to relocate', p.willingToRelocate],
      ]),
    },
    {
      title: 'Family',
      rows: rows([
        ['Family type', f?.familyType],
        ['Family status', f?.familyStatus],
        ['Family values', f?.familyValues],
        ["Father's occupation", f?.fatherOccupation],
        ["Mother's occupation", f?.motherOccupation],
        ['Siblings', siblingsLine(f)],
        ['About the family', f?.about],
      ]),
    },
    {
      title: 'Horoscope',
      rows: rows([
        ['Manglik', p.manglik],
        ['Star (nakshatra)', p.star],
        ['Rashi', p.rashi],
        ...(opts.showPrivate
          ? ([['Time of birth (private)', p.birthTime], ['Place of birth (private)', p.birthPlace]] as [string, string | undefined][])
          : []),
      ]),
    },
  ];
  return groups.filter((g) => g.rows.length > 0);
}

export function partnerPreferenceRows(pp?: Profile['partnerPreferences']): DetailRow[] {
  if (!pp) return [];
  const range = (lo?: number, hi?: number, fmt: (n: number) => string = String) =>
    lo !== undefined && hi !== undefined ? `${fmt(lo)} to ${fmt(hi)}` : lo !== undefined ? `${fmt(lo)} and above` : hi !== undefined ? `Up to ${fmt(hi)}` : undefined;
  return rows([
    ['Age', range(pp.ageMin, pp.ageMax, (n) => `${n} yrs`)],
    ['Height', range(pp.heightMinCm, pp.heightMaxCm, formatHeightShort)],
    ['Marital status', list(pp.maritalStatus)],
    ['Religion', list(pp.religion)],
    ['Community', list(pp.community)],
    ['Mother tongue', list(pp.motherTongue)],
    ['Education', list(pp.education)],
    ['Occupation', list(pp.occupation)],
    ['Annual income', list(pp.annualIncome)],
    ['Diet', list(pp.diet)],
    ['Lives in', list(pp.states)],
    ['Residency status', list(pp.nriStatus)],
    ['Manglik', pp.manglik],
    ['In their words', pp.about],
  ]);
}

// Share of the fields that matter to searchers that are filled in, and what's still missing.
export function profileCompleteness(p: Profile): { percent: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ['Photo', !!p.images?.length],
    ['About you', (p.bio ?? '').trim().length >= 20],
    ['Marital status', !!p.maritalStatus],
    ['Height', !!p.heightCm],
    ['Religion', !!p.religion],
    ['Community', !!p.community],
    ['Mother tongue', !!p.motherTongue],
    ['Education', !!p.education],
    ['Occupation', !!p.occupation],
    ['Annual income', !!p.annualIncome],
    ['Diet', !!p.diet],
    ['State', !!p.state],
    ['Family details', !!p.familyDetails && Object.keys(p.familyDetails).length > 0],
    ['Horoscope', !!(p.star || p.rashi || p.manglik)],
    ['Partner preferences', !!p.partnerPreferences && Object.keys(p.partnerPreferences).length > 0],
    ['Verification', !!p.verified],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

// ---------- Mutual compatibility ----------

export type Criterion = { key: string; label: string; ok: boolean };

// Every partner-preference criterion that `owner` set AND `candidate` answered, each marked as met
// or not. Criteria the owner left open (or the candidate left blank) are not counted at all.
export function preferenceCriteria(owner: Profile | null | undefined, candidate: Profile): Criterion[] {
  const pp = owner?.partnerPreferences;
  if (!pp) return [];
  const out: Criterion[] = [];
  const p = candidate;
  const check = (key: string, label: string, applies: boolean, ok: boolean) => {
    if (applies) out.push({ key, label, ok });
  };
  const inList = (want: string[] | undefined, have?: string) =>
    !!want?.length && !!have && want.some((w) => norm(w) === norm(have));
  const listApplies = (want?: string[], have?: string) => !!want?.length && !!have;

  check('age', 'Age', pp.ageMin !== undefined || pp.ageMax !== undefined,
    p.age >= (pp.ageMin ?? 0) && p.age <= (pp.ageMax ?? 200));
  check('height', 'Height', (pp.heightMinCm !== undefined || pp.heightMaxCm !== undefined) && !!p.heightCm,
    !!p.heightCm && p.heightCm >= (pp.heightMinCm ?? 0) && p.heightCm <= (pp.heightMaxCm ?? 999));
  check('maritalStatus', 'Marital status', listApplies(pp.maritalStatus, p.maritalStatus), inList(pp.maritalStatus, p.maritalStatus));
  check('religion', 'Religion', listApplies(pp.religion, p.religion), inList(pp.religion, p.religion));
  const communityOpen = !!pp.community?.some((c) => norm(c) === norm(NO_BAR));
  check('community', 'Community', !communityOpen && listApplies(pp.community, p.community),
    norm(p.community) === norm(NO_BAR) || inList(pp.community, p.community));
  check('motherTongue', 'Mother tongue', listApplies(pp.motherTongue, p.motherTongue), inList(pp.motherTongue, p.motherTongue));
  check('education', 'Education', listApplies(pp.education, p.education), inList(pp.education, p.education));
  check('occupation', 'Occupation', listApplies(pp.occupation, p.occupation), inList(pp.occupation, p.occupation));
  check('annualIncome', 'Annual income', listApplies(pp.annualIncome, p.annualIncome), inList(pp.annualIncome, p.annualIncome));
  check('diet', 'Diet', listApplies(pp.diet, p.diet), inList(pp.diet, p.diet));
  check('states', 'Location', listApplies(pp.states, p.state), inList(pp.states, p.state));
  check('nriStatus', 'Residency status', listApplies(pp.nriStatus, p.nriStatus), inList(pp.nriStatus, p.nriStatus));
  check('manglik', 'Manglik',
    !!pp.manglik && pp.manglik !== "Doesn't matter" && !!p.manglik && p.manglik !== "Don't know",
    (pp.manglik === 'Yes') === (p.manglik === 'Yes' || p.manglik === 'Partial (Anshik)'));
  return out;
}

// How well a profile fits what the viewer asked for in their partner preferences. Only the
// criteria the viewer actually set (and the profile actually answered) are counted.
export function preferenceMatch(me: Profile | null | undefined, p: Profile): { matched: number; total: number } {
  const c = preferenceCriteria(me, p);
  return { matched: c.filter((x) => x.ok).length, total: c.length };
}

export type MatchTier = 'great' | 'good' | 'partial';

export type Compatibility = {
  /** Does the other person meet what the viewer is looking for? */
  theyFitYou: Criterion[];
  /** Does the viewer meet what the other person is looking for? */
  youFitThem: Criterion[];
  /** 0-100, or null when neither side has any usable preference to compare. */
  score: number | null;
  /** True when both directions could be scored; false means the score rests on one side only. */
  twoWay: boolean;
  tier: MatchTier | null;
};

export const MUTUAL_MATCH_MIN = 60;

const ratio = (c: Criterion[]) => (c.length ? c.filter((x) => x.ok).length / c.length : null);

// Two-way compatibility. A great match needs BOTH people to fit each other's wishes, so the score
// is the geometric mean of the two fit ratios: 100% + 40% gives 63%, not the 70% a plain average
// would suggest. When only one side has set preferences the score is that side's ratio alone and
// `twoWay` is false so the UI can say so instead of pretending it is mutual.
export function mutualCompatibility(me: Profile | null | undefined, other: Profile): Compatibility {
  const theyFitYou = preferenceCriteria(me, other);
  const youFitThem = me ? preferenceCriteria(other, me) : [];
  const a = ratio(theyFitYou);
  const b = ratio(youFitThem);

  let score: number | null = null;
  if (a !== null && b !== null) score = Math.round(Math.sqrt(a * b) * 100);
  else if (a !== null) score = Math.round(a * 100);
  else if (b !== null) score = Math.round(b * 100);

  const tier: MatchTier | null =
    score === null ? null : score >= 80 ? 'great' : score >= MUTUAL_MATCH_MIN ? 'good' : 'partial';
  return { theyFitYou, youFitThem, score, twoWay: a !== null && b !== null, tier };
}

export const TIER_LABEL: Record<MatchTier, string> = {
  great: 'Great match',
  good: 'Good match',
  partial: 'Partial match',
};
