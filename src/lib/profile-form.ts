import type {
  FamilyDetails, ManglikStatus, NriStatus, PartnerPreferences, Profile, ProfileCreatedBy, RelocationPreference,
} from '@/lib/types';
import { HEIGHT_MAX_CM, HEIGHT_MIN_CM } from '@/lib/matrimony';

// Flat, string-based form state shared by the sign-up wizard (/profile-setup) and the edit
// screen (/settings/matrimony). Inputs stay strings so empty means "not answered"; the
// helpers below turn it into the typed `Profile` fields and back.

export type PartnerPrefsForm = {
  ageMin: string;
  ageMax: string;
  heightMinCm: string;
  heightMaxCm: string;
  maritalStatus: string[];
  religion: string[];
  community: string[];
  motherTongue: string[];
  education: string[];
  occupation: string[];
  annualIncome: string[];
  diet: string[];
  states: string[];
  nriStatus: string[];
  manglik: string;
  about: string;
};

export type ProfileForm = {
  // Basics
  createdBy: string;
  profileFor: string;
  name: string;
  dob: string;
  gender: string;
  // Background
  maritalStatus: string;
  heightCm: string;
  religion: string;
  community: string;
  motherTongue: string;
  // Education & career
  education: string;
  occupation: string;
  job: string;
  annualIncome: string;
  diet: string;
  // Location
  location: string;
  latitude?: number;
  longitude?: number;
  state: string;
  nativePlace: string;
  willingToRelocate: string;
  nriStatus: string;
  countryOfResidence: string;
  // Family
  familyType: string;
  familyStatus: string;
  familyValues: string;
  fatherOccupation: string;
  motherOccupation: string;
  brothers: string;
  brothersMarried: string;
  sisters: string;
  sistersMarried: string;
  familyAbout: string;
  // Horoscope
  star: string;
  rashi: string;
  manglik: string;
  birthTime: string;
  birthPlace: string;
  // Lifestyle & about
  drinking: string;
  smoking: string;
  interests: string[];
  bio: string;
  // Partner preferences
  prefs: PartnerPrefsForm;
};

export const EMPTY_PREFS: PartnerPrefsForm = {
  ageMin: '', ageMax: '', heightMinCm: '', heightMaxCm: '',
  maritalStatus: [], religion: [], community: [], motherTongue: [], education: [],
  occupation: [], annualIncome: [], diet: [], states: [], nriStatus: [], manglik: '', about: '',
};

export const EMPTY_FORM: ProfileForm = {
  createdBy: '', profileFor: '', name: '', dob: '', gender: '',
  maritalStatus: '', heightCm: '', religion: '', community: '', motherTongue: '',
  education: '', occupation: '', job: '', annualIncome: '', diet: '',
  location: '', state: '', nativePlace: '', willingToRelocate: '', nriStatus: '', countryOfResidence: '',
  familyType: '', familyStatus: '', familyValues: '', fatherOccupation: '', motherOccupation: '',
  brothers: '', brothersMarried: '', sisters: '', sistersMarried: '', familyAbout: '',
  star: '', rashi: '', manglik: '', birthTime: '', birthPlace: '',
  drinking: '', smoking: '', interests: [], bio: '',
  prefs: EMPTY_PREFS,
};

const s = (v: unknown) => (typeof v === 'string' ? v : '');
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function formFromProfile(p?: Partial<Profile> | null): ProfileForm {
  if (!p) return { ...EMPTY_FORM, prefs: { ...EMPTY_PREFS } };
  const fam: FamilyDetails = p.familyDetails ?? {};
  const pp: PartnerPreferences = p.partnerPreferences ?? {};
  return {
    createdBy: s(p.createdBy), profileFor: s(p.profileFor), name: s(p.name), dob: s(p.dob), gender: s(p.gender),
    maritalStatus: s(p.maritalStatus), heightCm: n(p.heightCm), religion: s(p.religion),
    community: s(p.community), motherTongue: s(p.motherTongue),
    education: s(p.education), occupation: s(p.occupation), job: s(p.job),
    annualIncome: s(p.annualIncome), diet: s(p.diet),
    location: s(p.location), latitude: p.latitude, longitude: p.longitude, state: s(p.state),
    nativePlace: s(p.nativePlace), willingToRelocate: s(p.willingToRelocate),
    nriStatus: s(p.nriStatus), countryOfResidence: s(p.countryOfResidence),
    familyType: s(fam.familyType), familyStatus: s(fam.familyStatus), familyValues: s(fam.familyValues),
    fatherOccupation: s(fam.fatherOccupation), motherOccupation: s(fam.motherOccupation),
    brothers: n(fam.brothers), brothersMarried: n(fam.brothersMarried),
    sisters: n(fam.sisters), sistersMarried: n(fam.sistersMarried), familyAbout: s(fam.about),
    star: s(p.star), rashi: s(p.rashi), manglik: s(p.manglik), birthTime: s(p.birthTime), birthPlace: s(p.birthPlace),
    drinking: s(p.drinking), smoking: s(p.smoking), interests: arr(p.interests), bio: s(p.bio),
    prefs: {
      ageMin: n(pp.ageMin), ageMax: n(pp.ageMax), heightMinCm: n(pp.heightMinCm), heightMaxCm: n(pp.heightMaxCm),
      maritalStatus: arr(pp.maritalStatus), religion: arr(pp.religion), community: arr(pp.community),
      motherTongue: arr(pp.motherTongue), education: arr(pp.education), occupation: arr(pp.occupation),
      annualIncome: arr(pp.annualIncome), diet: arr(pp.diet), states: arr(pp.states),
      nriStatus: arr(pp.nriStatus), manglik: s(pp.manglik), about: s(pp.about),
    },
  };
}

const clean = (v: string, max: number) => v.trim().replace(/\s+/g, ' ').slice(0, max);
const num = (v: string, min: number, max: number): number | undefined => {
  if (v === '') return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : undefined;
};

// Drops undefined keys and empty objects so nothing blank is written to Firestore.
// With `keepEmpty`, blank strings and empty lists are kept so an edit can clear a field.
function compact<T extends Record<string, unknown>>(o: T, keepEmpty = false): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (!keepEmpty && (v === '' || (Array.isArray(v) && v.length === 0))) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function buildFamilyDetails(f: ProfileForm, keepEmpty = false): FamilyDetails | undefined {
  const brothers = num(f.brothers, 0, 15);
  const sisters = num(f.sisters, 0, 15);
  const d = compact({
    familyType: f.familyType, familyStatus: f.familyStatus, familyValues: f.familyValues,
    fatherOccupation: clean(f.fatherOccupation, 60), motherOccupation: clean(f.motherOccupation, 60),
    brothers, sisters,
    // Married siblings can never exceed the sibling count.
    brothersMarried: brothers === undefined ? undefined : Math.min(brothers, num(f.brothersMarried, 0, 15) ?? 0),
    sistersMarried: sisters === undefined ? undefined : Math.min(sisters, num(f.sistersMarried, 0, 15) ?? 0),
    about: clean(f.familyAbout, 300),
  }, keepEmpty);
  return keepEmpty || Object.keys(d).length ? (d as FamilyDetails) : undefined;
}

export function buildPartnerPreferences(p: PartnerPrefsForm, keepEmpty = false): PartnerPreferences | undefined {
  let ageMin = num(p.ageMin, 18, 75);
  let ageMax = num(p.ageMax, 18, 75);
  if (ageMin !== undefined && ageMax !== undefined && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
  let heightMinCm = num(p.heightMinCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM);
  let heightMaxCm = num(p.heightMaxCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM);
  if (heightMinCm !== undefined && heightMaxCm !== undefined && heightMinCm > heightMaxCm) {
    [heightMinCm, heightMaxCm] = [heightMaxCm, heightMinCm];
  }
  const d = compact({
    ageMin, ageMax, heightMinCm, heightMaxCm,
    maritalStatus: p.maritalStatus, religion: p.religion, community: p.community, motherTongue: p.motherTongue,
    education: p.education, occupation: p.occupation, annualIncome: p.annualIncome, diet: p.diet,
    states: p.states, nriStatus: p.nriStatus as NriStatus[],
    manglik: p.manglik as PartnerPreferences['manglik'],
    about: clean(p.about, 500),
  }, keepEmpty);
  return keepEmpty || Object.keys(d).length ? (d as PartnerPreferences) : undefined;
}

// The wizard asks only "who is creating this profile"; who the profile is *for* follows from that
// plus the gender of the person getting married.
export function deriveProfileFor(createdBy: string, gender: string): string {
  if (createdBy === 'Self') return 'Self';
  if (createdBy === 'Friend') return 'Friend';
  if (createdBy === 'Parent') return gender === 'Male' ? 'Son' : gender === 'Female' ? 'Daughter' : 'Relative';
  if (createdBy === 'Sibling') return gender === 'Male' ? 'Brother' : gender === 'Female' ? 'Sister' : 'Relative';
  return '';
}

// Everything the form controls, as the Partial<Profile> that saveProfile() takes. Fields the
// person left blank are omitted, so an edit never wipes data it didn't touch. `includeIdentity`
// 
export function profileDataFromForm(f: ProfileForm, opts: { clearBlanks?: boolean } = {}): Partial<Profile> {
  const keepEmpty = opts.clearBlanks === true;
  const data: Partial<Profile> = compact({
    createdBy: f.createdBy as ProfileCreatedBy,
    profileFor: deriveProfileFor(f.createdBy, f.gender) || f.profileFor,
    maritalStatus: f.maritalStatus,
    heightCm: num(f.heightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM),
    religion: f.religion,
    community: clean(f.community, 40).replace(/[^\p{L}\s.&'()/-]/gu, ''),
    motherTongue: f.motherTongue,
    education: f.education,
    occupation: f.occupation,
    job: clean(f.job, 60),
    annualIncome: f.annualIncome,
    diet: f.diet,
    location: clean(f.location, 60),
    latitude: f.latitude,
    longitude: f.longitude,
    state: f.state,
    nativePlace: clean(f.nativePlace, 60),
    willingToRelocate: f.willingToRelocate as RelocationPreference,
    nriStatus: f.nriStatus as NriStatus,
    countryOfResidence: f.nriStatus && f.nriStatus !== 'Resident Indian' ? clean(f.countryOfResidence, 60) : '',
    star: f.star,
    rashi: f.rashi,
    manglik: f.manglik as ManglikStatus,
    birthTime: /^\d{2}:\d{2}$/.test(f.birthTime) ? f.birthTime : '',
    birthPlace: clean(f.birthPlace, 60),
    drinking: f.drinking,
    smoking: f.smoking,
    interests: f.interests.slice(0, 8),
    bio: f.bio.trim(),
  }, keepEmpty) as Partial<Profile>;
  const fam = buildFamilyDetails(f, keepEmpty);
  if (fam) data.familyDetails = fam;
  const prefs = buildPartnerPreferences(f.prefs, keepEmpty);
  if (prefs) data.partnerPreferences = prefs;
  return data;
}

// ---------- Validation ----------

export type StepId = 'basics' | 'background' | 'career' | 'location' | 'family' | 'horoscope' | 'about' | 'partner';

export function validateStep(step: StepId, f: ProfileForm): string | null {
  switch (step) {
    case 'basics':
      if (!f.createdBy) return 'Tell us who is creating this profile';
      if (!f.name.trim()) return 'Please enter the name of the person getting married';
      if (!f.dob) return 'Please enter the date of birth';
      if (!f.gender) return 'Please select gender';
      return null;
    case 'background':
      if (!f.maritalStatus) return 'Select marital status';
      if (!f.heightCm) return 'Select height';
      if (!f.religion) return 'Select religion';
      if (!f.motherTongue) return 'Select mother tongue';
      return null;
    case 'career':
      if (!f.education) return 'Select highest education';
      if (!f.occupation) return 'Select occupation';
      return null;
    case 'location':
      if (!f.location.trim()) return 'Add your city';
      if (!f.state) return 'Select the state you live in';
      return null;
    case 'about':
      if (f.bio.trim().length < 20) return 'Write a few lines about yourself (at least 20 characters)';
      return null;
    default:
      return null;
  }
}
