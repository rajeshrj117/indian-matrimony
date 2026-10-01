import { NextRequest, NextResponse } from 'next/server';
import { limitAi, readJson, requireUser, str, strArray } from '@/lib/server/guard';

// Explains a compatibility score in plain language. Always answers with a usable
// `explanation` (falls back to the client-supplied text) so the UI never breaks.
export async function POST(req: NextRequest) {
  let fallback = 'Compatibility explanation is unavailable right now.';
  try {
    const user = await requireUser(req);
    await limitAi(req, user, 'groq-compatibility', 10);

    const body = await readJson(req, 4_000);
    const clientFallback = str(body.fallback, 600);
    if (clientFallback) fallback = clientFallback;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ explanation: fallback });

    const score = typeof body.score === 'number' ? Math.round(body.score) : 'unknown';
    const factors = strArray(body.factors, 12, 80);
    const horoscope = str(body.horoscope, 80) || 'not available';

    const prompt = `Explain this matrimonial compatibility result in a neutral, concise, respectful way. Do not predict marriage success. Use only these facts. Score: ${score}%. Matching factors: ${JSON.stringify(factors)}. Horoscope signal: ${horoscope}. Give 3 short bullets and one caveat.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 250,
      }),
    });
    if (!res.ok) return NextResponse.json({ explanation: fallback });

    const data = await res.json();
    return NextResponse.json({ explanation: data?.choices?.[0]?.message?.content || fallback });
  } catch (error) {
    console.error('compatibility AI failed', error);
    return NextResponse.json({ explanation: fallback });
  }
}