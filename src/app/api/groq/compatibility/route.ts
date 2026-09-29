import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';
import { limitAi } from '@/lib/server/guard';
export async function POST(req: Request) {
  try {
    initAdmin();
    const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getAuth().verifyIdToken(authHeader);
    await limitAi(req, user, 'groq-compatibility', 10);
    const apiKey = process.env.GROQ_API_KEY; const body = await req.json();
    if (!apiKey) return NextResponse.json({ explanation: body.fallback || 'Compatibility explanation is available from the profile preferences.' });
    const prompt = `Explain this matrimonial compatibility result in a neutral, concise, respectful way. Do not predict marriage success. Use only these facts. Score: ${body.score ?? 'unknown'}%. Matching factors: ${JSON.stringify(body.factors ?? [])}. Horoscope signal: ${body.horoscope ?? 'not available'}. Give 3 short bullets and one caveat.`;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', { method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'user',content:prompt}],temperature:0.2,max_tokens:250}) });
    if (!res.ok) return NextResponse.json({ explanation: body.fallback || 'Compatibility explanation is unavailable right now.' });
    const data = await res.json(); return NextResponse.json({ explanation:data?.choices?.[0]?.message?.content || body.fallback || 'Compatibility explanation is unavailable right now.' });
  } catch (error) { console.error('compatibility AI failed',error); return NextResponse.json({ explanation:'Compatibility explanation is unavailable right now.' }); }
}
