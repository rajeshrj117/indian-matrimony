// Lightweight, dependency-free text screening for bios and chat messages. Shared by the
// client (instant feedback before saving/sending) and the server (AI prompts, admin views).
//
// This is a first line of defence, not a replacement for human review: it catches the
// obvious explicit / threatening / scam patterns and produces "abuse signals" that feed the
// admin moderation dashboard. Tune the lists to your community over time.

export type TextVerdict = {
  level: 'allow' | 'warn' | 'block';
  flags: string[];
  message?: string; // user-facing explanation when level !== 'allow'
};

const normalize = (t: string) =>
  t.toLowerCase()
    .replace(/[@4]/g, 'a').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/\$/g, 's').replace(/3/g, 'e')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ');

const EXPLICIT = /\b(send nudes?|nudes?|sex ?chat|sexting|hook ?up for money|escort|call ?girl|paid (meet|date|sex)|happy ending|blowjob|handjob|dick pic|cock|pussy|fuck me|horny)\b/;
const THREAT = /\b(i (will|ll|m gonna|am going to) (kill|rape|hurt|find) you|kill yourself|kys|rape you|acid on)\b/;
const HARASS = /\b(slut|whore|randi|raandi|bitch|bastard|harami|chutiya|madarchod|bhosdike|behenchod)\b/;
const SCAM_MONEY = /\b(send money|western union|gift ?card|crypto|bitcoin|usdt|investment (plan|opportunity)|trading (group|signal)|double your|loan app|recharge me|upi id|paytm me|pay me first|advance payment)\b/;
const OFF_PLATFORM = /\b(whatsapp|whats app|telegram|snapchat|insta(gram)? id|signal app|call me on)\b/;

// ---- Flirty / romantic / sexual vocabulary (chat messages) ---------------------------------
// Matching runs on a "squashed" copy of the text (repeated letters collapsed: "sexxxy" -> "sexy",
// "loooking" -> "loking") so stretched spellings can't dodge the filter. Every list entry is
// squashed the same way when the regex is built, so just write the words normally.
// Phrases are used for ambiguous words ("love marriage", "I love cooking", "date of birth" and
// "hot weather" are fine; "love you", "you are hot", "go on a date" are not).
const squash = (t: string) => t.replace(/([a-z])\1+/g, '$1');
// Also re-joins spaced-out letters ("s.e.x" -> "sex") before squashing.
const normalizeLoose = (t: string) =>
  squash(
    normalize(t.replace(/['\u2019`]/g, ''))
      .replace(/\b(?:[a-z]\s+){2,}[a-z]\b/g, (m) => m.replace(/\s+/g, '')),
  );
// "you are so hot", "u looking too hot" ... but not "you hot-tempered".
const HOT_AT_PERSON = /\b(?:you|u|ur|your|youre|ure)(?:\s+(?:are|r|re|look|looks|looking|feel))?\s+(?:(?:so|very|too|really|damn|v|sooo)\s+)*hot\b(?!\s+(?:tempered|headed|blooded|water|tea|coffee|food|weather))/;
const listRe = (words: string[]) =>
  new RegExp(`\\b(?:${words.map((w) => squash(w).replace(/ /g, '\\s+')).join('|')})\\b`);

// Sexual: body / sex talk, porn, "sexy", sexual comments about the person.
const SEXUAL = listRe([
  'sex', 'sexy', 'sexi', 'sexual', 'sexting', 'sexual chat', 'porn', 'porno', 'pornography', 'xnxx', 'xvideos',
  'nude', 'nudes', 'naked', 'horny', 'boobs', 'boobies', 'tits', 'titties', 'nipple', 'nipples', 'cleavage',
  'penis', 'vagina', 'blowjob', 'handjob', 'masturbate', 'masturbation', 'orgasm', 'erotic', 'seduce', 'seductive',
  'hottie', 'hotty', 'hot body', 'sexy body', 'sexy figure', 'nice figure',
  'perfect figure', 'sema figure', 'sema item', 'sema maal', 'curves', 'thighs', 'bra size',
  'you are hot', 'you re hot', 'you r hot', 'u are hot', 'u r hot', 'ur hot', 'youre hot', 'ure hot',
  'you look hot', 'you looking hot', 'u look hot', 'u looking hot', 'look so hot', 'looking so hot',
  'so hot and', 'hot girl', 'hot boy', 'hot babe', 'hot lady', 'hot aunty', 'hot pic', 'hot pics', 'hot photo',
  'hot photos', 'hot video', 'hot videos', 'hot chat', 'hot dress',
  'lund', 'chut', 'gaand', 'pundai', 'punda', 'kunji', 'thevidiya', 'thevdiya', 'poolu',
]);

// Flirty / romantic / casual-relationship talk: not what this app is for.
const FLIRTY = listRe([
  'i love you', 'love you', 'love u', 'luv u', 'luv you', 'i luv u', 'i luv you', 'iloveyou', 'ily', 'lv u',
  'i miss you', 'miss you', 'miss u', 'missing you', 'missing u',
  'in love with you', 'fall in love with you', 'fell in love with you', 'falling for you', 'fall for you',
  'love at first sight', 'crush on you', 'you are my crush', 'my love', 'my jaan', 'meri jaan',
  'jaanu', 'jaaneman', 'my darling', 'my sweetheart', 'my baby', 'baby girl', 'baby boy', 'hey baby',
  'hi baby', 'hello baby', 'hey babe', 'hi babe', 'babe', 'babes', 'darling', 'darlin', 'sweetheart',
  'sweet heart', 'sweetie', 'cutie', 'cutie pie', 'hi honey', 'hey honey', 'my honey', 'honey bunny',
  'kiss', 'kisses', 'kissing', 'kiss me', 'muah', 'mwah', 'smooch', 'hug', 'hugs', 'hug me', 'cuddle', 'cuddles',
  'cuddling', 'romance', 'romantic', 'romantically', 'romantic chat', 'be my gf', 'be my bf', 'be my girlfriend',
  'be my boyfriend', 'be my valentine', 'be my lover', 'be my love', 'become my girlfriend', 'become my boyfriend',
  'my girlfriend', 'my boyfriend', 'my gf', 'my bf', 'will you be my', 'go on a date', 'go out on a date',
  'date me', 'date with me', 'lets date', 'let s date', 'lets go on a date', 'lets have fun', 'let s have fun',
  'timepass', 'time pass', 'just friends', 'friends with benefits', 'fwb', 'night stand',
  'hookup', 'hook up', 'casual relationship', 'casual fun', 'no strings', 'just for fun', 'sleep with me',
  'sleep together', 'come to bed', 'in my bed', 'spend the night', 'night chat', 'late night chat', 'nite chat',
  'pyaar karta', 'pyar karta', 'pyaar karti', 'pyar karti', 'mujhse pyaar', 'mohabbat', 'ishq',
  'mutham', 'muththam', 'love panren', 'love pannren', 'love panra', 'love pannalama', 'love panlama', 'love pannunga',
]);

export const RULES_MESSAGE =
  'Flirty, romantic or sexual messages are against our texting rules and weren\u2019t sent.';

const PHONE_RE = /(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}\b/;
const LINK_RE = /(https?:\/\/|www\.|bit\.ly|t\.me\/|wa\.me\/)/i;

export function screenText(input: string, context: 'bio' | 'message' = 'message'): TextVerdict {
  const raw = input ?? '';
  const n = normalize(raw);
  const flags: string[] = [];

  if (EXPLICIT.test(n)) flags.push('explicit');
  if (context === 'message') {
    const loose = normalizeLoose(raw);
    if ((SEXUAL.test(loose) || HOT_AT_PERSON.test(loose)) && !flags.includes('explicit')) flags.push('explicit');
    // "love you" is fine when followed by "to meet my parents" etc.
    if (FLIRTY.test(loose.replace(/\blove you to\b/g, ' '))) flags.push('flirty');
  } else {
    // Public bio: only the sexual list applies ("I'm a romantic person" is fine in a bio).
    if (SEXUAL.test(normalizeLoose(raw)) && !flags.includes('explicit')) flags.push('explicit');
  }
  if (THREAT.test(n)) flags.push('threat');
  if (HARASS.test(n)) flags.push('harassment');
  if (SCAM_MONEY.test(n)) flags.push('scam_money');
  if (OFF_PLATFORM.test(n)) flags.push('off_platform');
  if (PHONE_RE.test(raw.replace(/[()]/g, ''))) flags.push('phone_number');
  if (LINK_RE.test(raw)) flags.push('link');

  const hardBlock = flags.some((f) => f === 'explicit' || f === 'flirty' || f === 'threat' || f === 'harassment' || f === 'scam_money');
  if (hardBlock) {
    return {
      level: 'block',
      flags,
      message: context === 'bio'
        ? 'Your bio contains content that goes against our Community Guidelines. Please edit it.'
        : flags.includes('explicit') || flags.includes('flirty')
          ? RULES_MESSAGE
          : 'This message goes against our Community Guidelines and wasn\u2019t sent.',
    };
  }

  // Sharing contact details / links is allowed in chat (people do move off-app), but not
  // in a public bio where scammers and stalkers harvest it.
  if (context === 'bio' && (flags.includes('phone_number') || flags.includes('off_platform') || flags.includes('link'))) {
    return {
      level: 'block',
      flags,
      message: 'For your safety, please don\u2019t put phone numbers, social handles or links in your bio.',
    };
  }
  if (flags.length) {
    return {
      level: 'warn',
      flags,
      message: 'Tip: keep chatting in the app until you\u2019re comfortable. Never send money or share OTPs.',
    };
  }
  return { level: 'allow', flags };
}
