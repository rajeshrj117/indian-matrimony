import { NextRequest, NextResponse } from 'next/server';
import { ApiError, fail, limitAi, readJson, requireUser, str } from '@/lib/server/guard';
import { screenField } from '@/lib/text-safety';

// Second-layer screen for profile text (name, bio, job, family details ...), called from
// saveProfile() in firestore.ts. The free word lists in lib/profanity.ts run first; this adds
// an AI check that understands slang, misspellings, mixed languages and native scripts.
//
// Body:  { fields: [{ label, text }] }  ->  { allowed: true } | { allowed: false, reason }
// Fails open if the AI provider is unavailable (the word lists still apply).

const SYSTEM =
  'You moderate the public profile text of an adult user on an Indian matrimony app. The text is in English, ' +
  'Tamil, Hindi, Telugu, Kannada or Malayalam, in native script or typed in English letters (Tanglish, Hinglish, ' +
  'Manglish, Tenglish, Kanglish), and may be mixed or deliberately misspelled to dodge filters. ' +
  'Block (allowed=false) only for: sexual or obscene words, innuendo or sexual offers; profanity, insults or ' +
  'abusive words in any of those languages; hate speech or caste / religious slurs; threats; requests for money; ' +
  'promotion of escort, dating-for-money or casual-hookup services. ' +
  'Allow everything normal for a matrimony profile: family, caste or community names, religion, horoscope, ' +
  'jobs, places, hobbies, marriage expectations, dowry-free statements, and ordinary words that merely look like ' +
  'slang (for example Tamil \"sotthu\" = property, Hindi \"naye\" = new, \"poori\" = bread). When unsure, allow. ' +
  'Respond ONLY with JSON: {\"allowed\": boolean, \"field\": string (the label of the offending field), ' +
  '\"reason\": string (short, user-facing, under 15 words, only when allowed is false)}';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await limitAi(req, user, 'groq-profile-moderation', 60);

    const body = await readJson(req, 12_000);
    const raw = Array.isArray(body.fields) ? body.fields.slice(0, 15) : [];
    const fields = raw
      .map((f: { label?: unknown; text?: unknown }) => ({ label: str(f?.label, 40) || 'profile', text: str(f?.text, 800) }))
      .filter((f: { text: string }) => f.text.trim().length > 0);
    if (fields.length === 0) return NextResponse.json({ allowed: true });

    // Same word lists as the client, re-run here so it can't be skipped by editing the app.
    for (const f of fields) {
      const hit = screenField(f.label, f.text);
      if (hit) return NextResponse.json({ allowed: false, reason: hit.message });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ allowed: true });
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          max_tokens: 120,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: JSON.stringify(fields) },
          ],
        }),
      });
      if (!res.ok) {
        console.error('Groq profile-moderation error', res.status, await res.text().catch(() => ''));
        return NextResponse.json({ allowed: true });
      }
      const data = await res.json();
      const out: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
      const v = JSON.parse(out.replace(/```json|```/g, '').trim());
      if (v && v.allowed === false) {
        const label = typeof v.field === 'string' && v.field ? `Your ${v.field.slice(0, 40)}: ` : '';
        return NextResponse.json({
          allowed: false,
          reason: `${label}${v.reason || 'contains words that go against our Community Guidelines. Please edit it.'}`,
        });
      }
    } catch (err) {
      console.error('profile-moderation: provider error', err);
    }
    return NextResponse.json({ allowed: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) return NextResponse.json({ allowed: true });
    return fail(err);
  }
}
