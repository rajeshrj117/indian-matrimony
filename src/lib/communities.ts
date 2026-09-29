// Community / caste / denomination lists used by the profile form, search filters and
// partner preferences. `Profile.community` stays a free-text string, so anything not in
// these lists (or a sub-caste) can still be typed in; the lists exist for pickers and
// autocomplete. Lists are alphabetical and deliberately broad rather than exhaustive —
// India has thousands of jatis, so the "Other" escape hatch matters.
//
// "No bar" (NO_BAR in matrimony.ts) is always offered first by `communityOptions`.

export const NO_BAR_LABEL = 'No bar';
export const OTHER_COMMUNITY = 'Other';

const HINDU = [
  // Brahmin (regional)
  'Brahmin - Iyer', 'Brahmin - Iyengar', 'Brahmin - Smartha', 'Brahmin - Madhwa', 'Brahmin - Deshastha',
  'Brahmin - Chitpavan (Konkanastha)', 'Brahmin - Karhade', 'Brahmin - Saraswat (GSB)', 'Brahmin - Gaur',
  'Brahmin - Kanyakubja', 'Brahmin - Saryuparin', 'Brahmin - Maithil', 'Brahmin - Bengali (Rarhi / Barendra)',
  'Brahmin - Kashmiri Pandit', 'Brahmin - Nambudiri', 'Brahmin - Niyogi', 'Brahmin - Vaidiki', 'Brahmin - Havyaka',
  'Brahmin - Audichya', 'Brahmin - Nagar', 'Brahmin - Mohyal', 'Brahmin - Tyagi',
  'Brahmin - Garhwali', 'Brahmin - Kumaoni', 'Brahmin - Oriya', 'Brahmin - Other',
  // Kshatriya / warrior
  'Rajput', 'Kshatriya', 'Maratha', 'Maratha - Kunbi', 'Thakur', 'Bhumihar', 'Jat', 'Gurjar', 'Ahir / Yadav',
  'Reddy', 'Kapu', 'Balija', 'Kamma', 'Velama', 'Naidu', 'Nair', 'Menon', 'Ezhava', 'Thiyya', 'Nadar',
  'Mudaliar', 'Pillai', 'Chettiar', 'Nattukottai Chettiar', 'Gounder (Kongu Vellalar)', 'Vellalar', 'Thevar',
  'Mukkulathor', 'Vanniyar', 'Naicker', 'Reddiar', 'Kallar', 'Maravar', 'Agamudayar', 'Yadava (Konar)',
  'Vokkaliga', 'Gowda', 'Lingayat', 'Veerashaiva', 'Kuruba', 'Bunt', 'Billava', 'Devanga', 'Padmashali',
  'Kurmi', 'Koeri / Kushwaha', 'Lodhi', 'Saini', 'Kamboj', 'Ramgarhia', 'Arora', 'Khatri', 'Aggarwal',
  'Baniya', 'Maheshwari', 'Oswal', 'Gupta', 'Vaishya', 'Marwari', 'Khandelwal',
  'Kayastha', 'Chitraguptavanshi Kayastha', 'Bengali Kayastha', 'Karan', 'Khandayat', 'Chasa', 'Sadgop',
  'Mahishya', 'Baidya', 'Namasudra', 'Rajbanshi', 'Ahom', 'Koch', 'Kalita', 'Kachari', 'Meitei',
  'Patel (Patidar)', 'Kadva Patidar', 'Leuva Patel', 'Lohana', 'Bhatia', 'Kutchi', 'Darji', 'Soni',
  'Sonar', 'Suthar', 'Lohar', 'Kumhar', 'Kumbhar', 'Teli', 'Tamboli', 'Mali', 'Nai (Barber)', 'Dhobi',
  'Kahar', 'Nishad / Mallah', 'Kori', 'Sunar', 'Gadaria', 'Baghel', 'Rawat', 'Chauhan',
  'Chamar', 'Jatav', 'Valmiki', 'Mahar', 'Mang', 'Paraiyar', 'Pallar', 'Arunthathiyar', 'Madiga', 'Mala',
  'Holeya', 'Adi Dravida', 'Adi Karnataka', 'Pulaya', 'Dhangar', 'Koli', 'Agri', 'Bhandari', 'Sonar (Maharashtra)',
  'CKP (Chandraseniya Kayastha Prabhu)', 'Daivadnya', 'Gabit', 'Lad', 'Mathur', 'Mudiraj',
  'Munnuru Kapu', 'Perika', 'Vishwakarma', 'Vaishnav', 'Vanjara / Lambadi',
  'Gond', 'Santhal', 'Bhil', 'Munda', 'Oraon', 'Khasi', 'Naga', 'Mizo', 'Bodo', 'Tribal (other)',
  'Intercaste / Open to all',
] as const;

const MUSLIM = [
  'Sunni', 'Sunni - Hanafi', 'Sunni - Shafi', 'Sunni - Maliki', 'Sunni - Hanbali', 'Sunni - Barelvi',
  'Sunni - Deobandi', 'Sunni - Ahle Hadith', 'Shia', 'Shia - Ithna Ashari', 'Shia - Bohra (Dawoodi)',
  'Shia - Ismaili (Khoja)', 'Shia - Sulaimani Bohra', 'Ahmadiyya', 'Sufi', 'Syed', 'Sheikh', 'Pathan',
  'Mughal', 'Ansari', 'Qureshi', 'Siddiqui', 'Memon', 'Mapila (Moplah)', 'Labbay', 'Rowther', 'Marakkayar',
  'Dakhni', 'Konkani Muslim', 'Khoja', 'Bohra', 'Malik', 'Mirza', 'Khan', 'Quraishi', 'Julaha (Momin)',
  'Raeen', 'Saifi', 'Salmani', 'Idrisi', 'Other',
] as const;

const CHRISTIAN = [
  'Roman Catholic', 'Syrian Catholic', 'Latin Catholic', 'Goan Catholic', 'Mangalorean Catholic',
  'East Indian Catholic', 'Syrian Christian (Malankara)', 'Jacobite', 'Orthodox', 'Marthoma', 'CSI',
  'CNI', 'Protestant', 'Anglican', 'Baptist', 'Methodist', 'Presbyterian', 'Lutheran', 'Pentecostal',
  'Evangelical', 'Born Again', 'Brethren', 'Seventh Day Adventist', 'Salvation Army', 'Church of God',
  'Knanaya', 'Chaldean Syrian', 'Nadar Christian', 'Anglo-Indian', 'Naga Christian', 'Mizo Christian',
  'Khasi Christian', 'Garo Christian', 'Telugu Christian', 'Tamil Christian', 'Other',
] as const;

const SIKH = [
  'Jat Sikh', 'Khatri Sikh', 'Arora Sikh', 'Ramgarhia', 'Saini Sikh', 'Kamboj Sikh', 'Mazhabi',
  'Ravidasia', 'Ahluwalia', 'Bhatia Sikh', 'Lubana', 'Gursikh', 'Amritdhari', 'Keshdhari',
  'Sehajdhari', 'Namdhari', 'Sikligar', 'Other',
] as const;

const JAIN = [
  'Digambar', 'Shwetambar', 'Sthanakvasi', 'Terapanthi', 'Murtipujak', 'Agarwal Jain', 'Oswal Jain',
  'Porwal', 'Khandelwal Jain', 'Bania Jain', 'Jain - Kutchi', 'Jain - Gujarati', 'Jain - Marwari',
  'Jain - Maharashtrian', 'Jain - Kannadiga (Bunt / Saraogi)', 'Other',
] as const;

const BUDDHIST = [
  'Theravada', 'Mahayana', 'Vajrayana', 'Navayana (Ambedkarite)', 'Tibetan Buddhist', 'Mahar Buddhist',
  'Sikkimese Buddhist', 'Ladakhi Buddhist', 'Arunachali Buddhist', 'Other',
] as const;

const PARSI = ['Parsi - Zoroastrian', 'Irani', 'Other'] as const;

const JEWISH = ['Bene Israel', 'Cochin Jew', 'Baghdadi Jew', 'Bnei Menashe', 'Other'] as const;

const NONE = ['Other'] as const;

export const COMMUNITIES_BY_RELIGION: Record<string, readonly string[]> = {
  Hindu: HINDU,
  Muslim: MUSLIM,
  Christian: CHRISTIAN,
  Sikh: SIKH,
  Jain: JAIN,
  Buddhist: BUDDHIST,
  Parsi: PARSI,
  Jewish: JEWISH,
  'Spiritual / no religion': NONE,
  Other: NONE,
};

// Every community across all religions, de-duplicated and sorted — for the search filter when
// no religion is selected.
export const ALL_COMMUNITIES: readonly string[] = Array.from(
  new Set(Object.values(COMMUNITIES_BY_RELIGION).flat()),
).sort((a, b) => a.localeCompare(b));

// Picker options for a religion: "No bar" first, then that religion's communities.
export function communityOptions(religion?: string): string[] {
  const list = religion && COMMUNITIES_BY_RELIGION[religion] ? COMMUNITIES_BY_RELIGION[religion] : ALL_COMMUNITIES;
  return [NO_BAR_LABEL, ...list];
}

// ---------- Horoscope ----------

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

// Vedic (sidereal) moon signs, with the Western name for people who know it that way.
export const RASHIS = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)',
  'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)', 'Dhanu (Sagittarius)', 'Makara (Capricorn)',
  'Kumbha (Aquarius)', 'Meena (Pisces)',
] as const;

export const MANGLIK_STATUSES = ['Yes', 'No', 'Partial (Anshik)', "Don't know"] as const;

// Used in partner preferences, where "Doesn't matter" is a valid answer.
export const MANGLIK_PREFERENCES = ['Yes', 'No', "Doesn't matter"] as const;
