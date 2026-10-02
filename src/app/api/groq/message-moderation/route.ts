import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { ApiError, fail, limitAi, readJson, requireUser, str } from '@/lib/server/guard';
import { screenText } from '@/lib/text-safety';
import { APP_NAME } from '@/lib/brand';

// Gatekeeper for chat messages, called from sendMessage()/editMessage() in firestore.ts
// BEFORE the message is written.
//
// This is a matrimony app. Respectful conversation between people who have accepted each
// other's interest is the whole point, including talk about marriage, family, values and
// expectations. What is NOT allowed: sexual content, asking for intimate photos, proposing a
// casual / "timepass" relationship, harassment, threats, hate, scams and dowry demands. Sexual
// and casual-relationship messages are a "strike" against the sender:
//
//   strikes 1-4  -> message blocked + a warning ("Warning 2 of 5")
//   strike 5     -> message blocked + chat locked for 5 days (CHAT_LOCK_MS); the counter resets
//
// State lives in moderation/{uid} (Admin-SDK only, clients can't touch it):
//   chatStrikes, chatLockedUntil (epoch ms), chatLockCount, lastChatStrikeAt
// firestore.rules ALSO refuse message writes while chatLockedUntil is in the future, so the
// lock holds even if someone bypasses the app UI.
//
// Body:  { text }    -> { allowed: true }
//                     | { allowed: false, category, reason, strike?, strikes?, maxStrikes?, locked?, lockedUntil? }
//        { check: true } -> { locked, lockedUntil, strikes, maxStrikes }   (no message, no AI call)
//
// If the AI provider is down or rate-limited the *AI* part fails open (the regex filter and
// the lock check still apply), so a Groq outage never blocks the whole chat.

const MAX_STRIKES = 5;
const CHAT_LOCK_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// Categories that count as a strike. Add e.g. 'harassment' here to make it stricter.
const STRIKE_CATEGORIES = new Set(['sexual', 'casual']);

type Verdict = {
  allowed?: boolean;
  category?: 'sexual' | 'casual' | 'harassment' | 'threat' | 'hate' | 'scam' | 'dowry' | 'self_harm' | 'spam' | 'ok';
  reason?: string;
};

const SYSTEM =
  'You moderate one chat message on a matrimony app used by adults in India. The two people have accepted each ' +
  'other\u2019s interest and are getting to know each other with marriage in mind, so respectful, warm conversation ' +
  'about themselves, family, values, career, horoscope, religion, future plans, meeting families and marriage is ' +
  'GOOD and must be allowed, as are polite, respectful compliments about character, values or family. Flirty, romantic or sexual talk is NOT allowed. Messages may be in ' +
  'any language, including Hindi/Tamil/Telugu etc. written in English letters (Hinglish/Tanglish) and slang or ' +
  'misspellings meant to dodge filters. Categories: ' +
  '"sexual" = sexual talk, innuendo or fantasies; pornography; asking for nude, intimate or private photos/videos; ' +
  'obscene, sexual or flirty comments about someone\u2019s looks or body (e.g. "you look sexy", "so hot"). ' +
  '"casual" = proposing or asking about a casual relationship, hookup, friends-with-benefits, "timepass" or ' +
  'dating without marriage intent; flirty or romantic talk such as "I love you", "I miss you", pet names (baby, ' +
  'darling, jaanu), kisses/hugs, love declarations or asking for a girlfriend/boyfriend. ' +
  '"dowry" = demanding or hinting at dowry, cash, gold, property or gifts as a condition of marriage. ' +
  '"harassment" (insults, abuse, pressure after a refusal), "threat" (threats of violence), "hate" (hate speech/slurs, ' +
  'including caste or religious slurs), "scam" (asking for money, OTPs, gift cards, investment/crypto schemes, ' +
  'emergency-money stories), "self_harm" (sender describes harming themselves), "spam" (bulk/promotional ' +
  'junk), or "ok" = everything else: greetings, introductions, family and career questions, expectations about ' +
  'marriage, disagreement and blunt but polite opinions. ' +
  'Flag "sexual" and "casual" whenever present, even if mild or joking. For every other category be conservative: only flag real ' +
  'problems, not rude or awkward phrasing. ' +
  'Respond ONLY with JSON: {"allowed": boolean, "category": string, "reason": string (short, user-facing, ' +
  'under 15 words, only when allowed is false)}';

const dayWord = Math.round(CHAT_LOCK_MS / 86_400_000);

async function readChatState(db: Firestore, uid: string) {
  const snap = await db.collection('moderation').doc(uid).get();
  const d = snap.data() ?? {};
  return {
    lockedUntil: typeof d.chatLockedUntil === 'number' ? (d.chatLockedUntil as number) : 0,
    strikes: typeof d.chatStrikes === 'number' ? (d.chatStrikes as number) : 0,
  };
}

// Atomically add one strike. On the 5th, lock chat and reset the counter.
async function recordStrike(db: Firestore, uid: string): Promise<{ strikes: number; lockedUntil: number }> {
  const ref = db.collection('moderation').doc(uid);
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const d = (await tx.get(ref)).data() ?? {};
    const alreadyLockedUntil = typeof d.chatLockedUntil === 'number' ? (d.chatLockedUntil as number) : 0;
    if (alreadyLockedUntil > now) return { strikes: MAX_STRIKES, lockedUntil: alreadyLockedUntil }; // parallel request
    const strikes = (typeof d.chatStrikes === 'number' ? (d.chatStrikes as number) : 0) + 1;
    if (strikes >= MAX_STRIKES) {
      const lockedUntil = now + CHAT_LOCK_MS;
      tx.set(ref, {
        chatStrikes: 0, chatLockedUntil: lockedUntil, chatLockCount: ((d.chatLockCount as number) ?? 0) + 1, lastChatStrikeAt: now,
      }, { merge: true });
      return { strikes: MAX_STRIKES, lockedUntil };
    }
    tx.set(ref, { chatStrikes: strikes, lastChatStrikeAt: now }, { merge: true });
    return { strikes, lockedUntil: 0 };
  });
}

const lockedReason = (until: number) =>
  `Chat is locked until ${new Date(until).toUTCString()} because of repeated messages that go against our respectful-chat rules.`;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    // Generous — this runs on (up to) every message, not just an occasional AI action.
    await limitAi(req, user, 'groq-message-moderation', 600);

    const body = await readJson(req, 4_000);
    const now = Date.now();

    // 1) Chat lock. Checked first so a locked user costs nothing (no AI call).
    const state = await readChatState(user.db, user.uid);
    const locked = state.lockedUntil > now;
    if (body.check === true) {
      return NextResponse.json({ locked, lockedUntil: locked ? state.lockedUntil : 0, strikes: state.strikes, maxStrikes: MAX_STRIKES });
    }
    if (locked) {
      return NextResponse.json({
        allowed: false, locked: true, lockedUntil: state.lockedUntil, category: 'chat_locked', reason: lockedReason(state.lockedUntil),
      });
    }

    const text = str(body.text, 2000);
    if (!text) return NextResponse.json({ allowed: true });

    // 2) Free regex screen (same rules the client uses). Explicit words are a strike; other
    //    hard blocks (threat / abuse / scam) are refused here without an AI call.
    const regex = screenText(text, 'message');
    let category: string | null = null;
    let reason = '';
    if (regex.flags.includes('explicit')) {
      category = 'sexual';
    } else if (regex.flags.includes('flirty')) {
      category = 'casual'; // flirty / romantic talk counts as a strike too
    } else if (regex.level === 'block') {
      return NextResponse.json({ allowed: false, category: 'policy', reason: regex.message });
    }

    // 3) AI screen (skipped if the regex already caught it, or no key / provider error -> fail-open).
    const apiKey = process.env.GROQ_API_KEY;
    if (!category && apiKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0,
            max_tokens: 120,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
          }),
        });
        if (!res.ok) {
          console.error('Groq message-moderation error', res.status, await res.text().catch(() => ''));
        } else {
          const data = await res.json();
          const raw: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
          try {
            const v: Verdict = JSON.parse(raw.replace(/```json|```/g, '').trim());
            if (v && v.allowed === false) { category = v.category ?? 'other'; reason = v.reason ?? ''; }
          } catch {
            console.error('message-moderation: unparseable response', raw.slice(0, 200));
          }
        }
      } catch (err) {
        console.error('message-moderation: provider unreachable', err);
      }
    }

    if (!category) return NextResponse.json({ allowed: true });

    // 4) Not a strike category (harassment, scam, ...): blocked, no warning counter.
    if (!STRIKE_CATEGORIES.has(category)) {
      return NextResponse.json({
        allowed: false, category, reason: reason || 'This message goes against our Community Guidelines and wasn\u2019t sent.',
      });
    }

    // 5) Strike.
    const { strikes, lockedUntil } = await recordStrike(user.db, user.uid);
    if (lockedUntil > 0) {
      return NextResponse.json({
        allowed: false, category, strike: true, strikes, maxStrikes: MAX_STRIKES, locked: true, lockedUntil,
        reason: `Warning ${MAX_STRIKES} of ${MAX_STRIKES}: chat is now locked for ${dayWord} days. Please keep conversations respectful.`,
      });
    }
    const left = MAX_STRIKES - strikes;
    return NextResponse.json({
      allowed: false, category, strike: true, strikes, maxStrikes: MAX_STRIKES,
      reason:
        `Warning ${strikes} of ${MAX_STRIKES}: ${APP_NAME} is for people looking for marriage. ` +
        `Flirty, romantic or sexual messages are against our texting rules and weren\u2019t sent. ` +
        `${left} more ${left === 1 ? 'warning' : 'warnings'} and chat will be locked for ${dayWord} days.`,
    });
  } catch (err) {
    // Rate-limit: fail-open rather than surfacing a moderation 429 mid-chat. The lock is still
    // enforced by firestore.rules, and screenText() still runs on the client.
    if (err instanceof ApiError && err.status === 429) return NextResponse.json({ allowed: true });
    return fail(err);
  }
}
