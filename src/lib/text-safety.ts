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

const PHONE_RE = /(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}\b/;
const LINK_RE = /(https?:\/\/|www\.|bit\.ly|t\.me\/|wa\.me\/)/i;

export function screenText(input: string, context: 'bio' | 'message' = 'message'): TextVerdict {
  const raw = input ?? '';
  const n = normalize(raw);
  const flags: string[] = [];

  if (EXPLICIT.test(n)) flags.push('explicit');
  if (THREAT.test(n)) flags.push('threat');
  if (HARASS.test(n)) flags.push('harassment');
  if (SCAM_MONEY.test(n)) flags.push('scam_money');
  if (OFF_PLATFORM.test(n)) flags.push('off_platform');
  if (PHONE_RE.test(raw.replace(/[()]/g, ''))) flags.push('phone_number');
  if (LINK_RE.test(raw)) flags.push('link');

  const hardBlock = flags.some((f) => f === 'explicit' || f === 'threat' || f === 'harassment' || f === 'scam_money');
  if (hardBlock) {
    return {
      level: 'block',
      flags,
      message: context === 'bio'
        ? 'Your bio contains content that goes against our Community Guidelines. Please edit it.'
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
