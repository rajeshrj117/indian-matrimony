// Multilingual bad-word / sexual-word screening for names, bios and every other free-text
// field. Covers English plus Tamil, Hindi, Telugu, Kannada and Malayalam, each both in
// native script and romanized ("Tanglish", "Hinglish", "Manglish", "Tenglish", "Kanglish").
//
// This is a fast first line of defence (instant, offline, same code on client and server).
// It cannot catch everything, so saveProfile() also sends profile text to an AI check
// (/api/groq/profile-moderation) that understands slang, misspellings and mixed languages.
//
// To extend: add words to the arrays below. Romanized entries are lower-case; repeated
// letters are collapsed automatically ("punda" also matches "pundaaa"), so don't write
// both. Keep entries distinctive: ordinary words that merely resemble a slur (e.g. "lanjam",
// Tamil for "bribe", or "kutti", "child") would block honest users.

export type ProfanityKind = 'sexual' | 'abuse';

// ---------------------------------------------------------------- romanized word lists
const SEXUAL_LATIN = [
  // English
  'dildo', 'vibrator', 'fetish', 'threesome', 'foursome', 'orgy', 'boner', 'erection', 'sperm',
  'cumshot', 'creampie', 'gangbang', 'bukkake', 'milf', 'camgirl', 'cam girl', 'onlyfans', 'strip club',
  'stripper', 'prostitute', 'prostitution', 'one night stand', 'sugar daddy', 'sugar mummy', 'sugar mommy',
  'dick', 'cock', 'pussy', 'cunt', 'clit', 'clitoris', 'scrotum', 'testicles', 'ballsack',
  // Tamil (Tanglish)
  'punda', 'pundai', 'pundamavan', 'pundamavane', 'pundaimavane', 'kena punda', 'kenapunda', 
  'oombu', 'oombura', 'oombuven', 'ommala', 'ommale', 
  'mayiru', 'mayir', 'mairu', 'thayoli', 'thaayoli', 'thevidiya', 'thevdiya', 'thevudiya', 'devidiya', 'thevidiyamavane',
  // Malayalam (Manglish)
  'kunna', 'kunnan', 'kunne', 'kandaroli', 'kandaaroli', 'poorimone', 'myre', 'myru',
  // Telugu (Tenglish)
  'dengu', 'dengey', 'dengutha', 'dengesta', 'dengesa', 'dengithe', 'puka', 'puku', 'pooku', 'erripuka', 'erripooku',
  'erripuku', 'modda', 'moddalu', 'bokka', 'kojja',
  // Kannada (Kanglish)
  'bosudi', 'bosadi', 'bosudike', 'bosudimaga', 'thunne', 'thunni', 'lavada', 'lavda', 'lavde',
  // Hindi (Hinglish)
  'chutiya', 'chutiye', 'chutia', 'choot', 'bhosdi', 'bhosda', 'bhosadi', 'bhosdika', 'bhosdike', 'bhosadike', 'bhosdiwala',
  'bhosdk', 'gaand', 'gaandu', 'gandu', 'gand mara', 'lauda', 'lawda', 'loda', 'lode', 'jhaatu', 'jhatu', 'jhaat',
  'chudai', 'chudasi', 'chudwa', 'randikhana', 'raandkhana', 'bsdk', 'mkc', 'bkl',
];

const ABUSE_LATIN = [
  // English
  'fuck', 'fucker', 'fucking', 'fuckin', 'fucked', 'motherfucker', 'mother fucker', 'bullshit', 'shit', 'shithead',
  'asshole', 'arsehole', 'dickhead', 'prick', 'wanker', 'bitch', 'bitches', 'bastard', 'whore', 'slut', 'retard',
  'son of a bitch', 'piece of shit', 'go to hell', 'idiot', 'moron', 'stupid bitch',
  // Hindi
  'madarchod', 'madarchodh', 'maderchod', 'madrchod', 'madar chod', 'mader chod', 'behenchod', 'bhenchod', 'behnchod',
  'behen chod', 'bhen chod', 'behan chod', 'randi', 'randwa', 'harami', 'haramzada', 'haramzade', 'haramkhor',
  'kamina', 'kutiya', 'bhadwa', 'bhadwe', 'bhadva', 'bhadve', 'chinal', 'chhinal', 'chinaal', 'bakchod', 'chodu',
  'teri maa ki', 'teri ma ki', 'teri behen ki', 'maa ki chut',
  // Tamil
  'thevidiya paiyan', 'thevidiya pasanga',
  // Malayalam
  'thendi', 'thendikal', 'pulayadi', 'nayinte mone', 'patti mone',
  // Telugu
  'lanja', 'lanjakoduku', 'lanjakodaka', 'lanjamunda', 'lanjamuda', 'nee yamma', 'ni yamma', 'ne yamma',
  // Kannada
  'suleemaga', 'sulemaga', 'suleemagane', 'sulemagane', 'bevarsi', 'bewarsi', 'bolimaga', 'bolimagane', 'sule maga',
];

// Long, distinctive words that are also checked with the spaces removed ("madar chod" -> "madarchod").
const STRONG_COMPACT = [
  'madarchod', 'behenchod', 'bhenchod', 'bhosdike', 'chutiya', 'thevidiya', 'motherfucker', 'lanjakoduku',
  'haramzada', 'suleemaga', 'pundamavan', 'kandaroli',
];

// ---------------------------------------------------------------- native-script word lists
// Matched at the START of a word (so inflected forms like "புண்டையில்" are caught) but never in
// the middle of a longer word. Zero-width joiners are stripped before matching.
const SEXUAL_NATIVE = [
  // Tamil
  'புண்டை', 'ஓத்தா', 'ஊம்பு', 'சூத்து', 'தேவடியா', 'தேவிடியா', 'தேவுடியா', 'தாயோளி',
  // Hindi / Marathi (Devanagari)
  'चूतिया', 'चूतिये', 'चुतिया', 'चूत', 'भोसड़ी', 'भोसडी', 'भोसड़ीके', 'गांड', 'गाण्ड', 'गांडू', 'गान्डू', 'लौड़ा', 'लौडा', 'लंड',
  'लण्ड', 'चुदाई', 'चुदासी', 'झांट', 'झाँट', 'झाटू', 'चोदना', 'चोदू',
  // Telugu
  'దెంగు', 'పూకు', 'ఎర్రిపూకు', 'మొడ్డ', 'లంజ',
  // Kannada
  'ಬೋಸುಡಿ', 'ಬೋಸೂಡಿ', 'ತುಣ್ಣೆ', 'ಗಾಂಡು', 'ಲವಡಾ',
  // Malayalam
  'കുണ്ണ', 'പൂറ്', 'പൂറി', 'കണ്ടാരോളി', 'തായോളി',
];

const ABUSE_NATIVE = [
  // Tamil
  'மயிர்',
  // Hindi / Marathi
  'मादरचोद', 'मादर चोद', 'बहनचोद', 'बहन चोद', 'भेनचोद', 'रंडी', 'रांड', 'हरामी', 'हरामज़ादा', 'हरामजादा', 'हरामखोर', 'कमीना',
  'भड़वा', 'भड़वे', 'छिनाल', 'बकचोद',
  // Telugu
  'లంజకొడుకు', 'కొజ్జా', 'నీయమ్మ',
  // Kannada
  'ಸೂಳೆ', 'ಸೂಳೆಮಗ', 'ಬೇವರ್ಸಿ', 'ಬೋಳಿಮಗ',
  // Malayalam
  'തെണ്ടി', 'മൈര്', 'മയിര്', 'പുലയാടി',
];

// ---------------------------------------------------------------- matching
const squash = (t: string) => t.replace(/([a-z])\1+/g, '$1');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const latinRe = (words: string[]) =>
  new RegExp(`\\b(?:${words.map((w) => escapeRe(squash(w)).replace(/ /g, '\\s+')).join('|')})\\b`);

const SEXUAL_RE = latinRe(SEXUAL_LATIN);
const ABUSE_RE = latinRe(ABUSE_LATIN);
const COMPACT = STRONG_COMPACT.map(squash);

const nativeRe = (words: string[]) => new RegExp(words.map(escapeRe).join('|'), 'gu');
const SEXUAL_NATIVE_RE = nativeRe(SEXUAL_NATIVE);
const ABUSE_NATIVE_RE = nativeRe(ABUSE_NATIVE);
const LETTER_OR_MARK = /[\p{L}\p{M}]/u;

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

// Lower-case letters only: strips accents, undoes common character swaps (a->@/4, i->1/!,
// o->0, s->$, e->3), re-joins spaced-out letters ("s e x", "f.u.c.k") and collapses repeats.
function latinForm(raw: string): string {
  let x = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  x = x.replace(/['\u2019`]/g, '')
    .replace(/[@4]/g, 'a').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/\$/g, 's').replace(/3/g, 'e')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ');
  x = x.replace(/\b(?:[a-z]\s+){2,}[a-z]\b/g, (m) => m.replace(/\s+/g, ''));
  return squash(x).trim();
}

// A native-script word counts only when it starts a word (nothing letter-like right before it).
function nativeHit(text: string, re: RegExp): boolean {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = m.index > 0 ? text[m.index - 1] : '';
    if (!before || !LETTER_OR_MARK.test(before)) return true;
    if (m[0].length === 0) re.lastIndex++;
  }
  return false;
}

export function findProfanity(input: string): ProfanityKind | null {
  if (!input) return null;
  const native = input.normalize('NFC').replace(ZERO_WIDTH, '');
  if (nativeHit(native, SEXUAL_NATIVE_RE)) return 'sexual';
  if (nativeHit(native, ABUSE_NATIVE_RE)) return 'abuse';

  const latin = latinForm(native);
  if (!latin) return null;
  if (SEXUAL_RE.test(latin)) return 'sexual';
  if (ABUSE_RE.test(latin)) return 'abuse';
  const compact = latin.replace(/\s+/g, '');
  if (COMPACT.some((w) => compact.includes(w))) return 'abuse';
  return null;
}
