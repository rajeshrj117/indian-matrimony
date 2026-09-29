'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShieldCheck, MessageCircle, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const slides = [
  {
    title: 'Real connections,\nnot just swipes',
    desc: 'Verified profiles, thoughtful prompts and safety first. Flirty helps you meet people who mean it.',
    Icon: Heart,
    gradient: 'linear-gradient(135deg, #FF3B6E, #FF8A45)',
  },
  {
    title: 'Safe & verified\ncommunity',
    desc: 'Photo verification, block & report in one tap. Your privacy is our promise.',
    Icon: ShieldCheck,
    gradient: 'linear-gradient(135deg, #7C3AED, #EC4899)',
  },
  {
    title: 'Chat instantly\nwhen you match',
    desc: 'When both say yes, the conversation starts. No waiting, no games.',
    Icon: MessageCircle,
    gradient: 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user && profile?.profileComplete) { router.replace('/discover'); return; }
    if (user) { router.replace('/profile-setup'); return; }
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, [loading, user, profile, router]);

  if (!ready) return null;

  const s = slides[page];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-8 pt-10">
      <div className="flex flex-[1.2] items-center justify-center">
        <div
          className="relative flex aspect-square w-[78%] items-center justify-center rounded-[32px] shadow-2xl"
          style={{ background: s.gradient }}
        >
          <div className="flex h-[140px] w-[140px] items-center justify-center rounded-full border border-white/30 bg-white/20">
            <s.Icon size={64} color="#fff" strokeWidth={1.75} />
          </div>
          <div className="absolute right-7 top-7 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-neutral-900">Verified</span>
          </div>
          <div className="absolute bottom-7 left-7 flex items-center gap-2 rounded-2xl bg-black/35 px-3.5 py-2.5">
            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200" className="h-7 w-7 rounded-full border border-white object-cover" alt="" />
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" className="-ml-2.5 h-7 w-7 rounded-full border border-white object-cover" alt="" />
            <span className="ml-1.5 text-[13px] font-semibold text-white">12k+ matches today</span>
          </div>
        </div>
      </div>

      <div className="flex-[0.9]">
        <h1 className="whitespace-pre-line text-[32px] font-extrabold leading-[36px] text-[var(--text)]">{s.title}</h1>
        <p className="mt-3 text-base leading-6 text-[var(--muted)]">{s.desc}</p>

        <div className="mt-6 flex gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === page ? 32 : 8, background: i === page ? 'var(--primary)' : 'var(--border)' }}
            />
          ))}
        </div>

        <button
          onClick={() => (page < 2 ? setPage(page + 1) : router.push('/auth'))}
          className="grad-primary mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-extrabold text-white shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]"
        >
          {page === 2 ? 'Get Started' : 'Continue'}
          <ArrowRight size={20} />
        </button>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => router.push('/auth')} className="font-semibold text-[var(--muted)]">Skip</button>
          <span className="h-3.5 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5 text-[var(--muted2)]">
            <Lock size={12} />
            <span className="text-xs font-semibold">Trusted by 2M+ Indians</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-4 text-[var(--muted2)]">
          By continuing you agree to our Terms &amp; Privacy Policy. Flirty is for 18+ only. Safety first.
        </p>
      </div>
    </div>
  );
}
