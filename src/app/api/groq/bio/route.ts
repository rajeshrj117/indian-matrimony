import { NextRequest, NextResponse } from 'next/server';
import { fail, limitAi, readJson, requireUser, str, strArray, ApiError } from '@/lib/server/guard';
import { screenText } from '@/lib/text-safety';

// Requires a signed-in user (Authorization: Bearer <ID token>), caps input sizes and rate
// limits per user and per IP so the Groq key can't be drained by anonymous traffic.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await limitAi(req, user, 'groq-bio', 20);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new ApiError(500, 'AI is not configured on the server.');

    const body = await readJson(req, 4_000);
    const bio = str(body.bio, 400);
    const job = str(body.job, 80);
    const interests = strArray(body.interests, 10, 30);
    if (!bio) throw new ApiError(400, 'Provide a bio draft to enhance.');
    if (screenText(bio, 'message').level === 'block') throw new ApiError(422, 'That draft goes against our Community Guidelines.');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content:
              'You polish dating-app bios for an Indian audience. Keep the person\'s own facts and voice, ' +
              'fix grammar, make it warm and confident, and keep it under 150 characters. ' +
              'Return ONLY the improved bio text, no quotes, no preamble, no explanation.',
          },
          {
            role: 'user',
            content: `Current bio draft: "${bio}"\nJob: ${job || 'not specified'}\nInterests: ${interests.join(', ') || 'not specified'}\n\nRewrite this bio.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Groq bio error', res.status, text);
      return NextResponse.json({ error: 'AI enhancement failed. Please try again.' }, { status: 502 });
    }

    const data = await res.json();
    const enhanced: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ bio: enhanced.slice(0, 150) });
  } catch (err) {
    return fail(err);
  }
}
