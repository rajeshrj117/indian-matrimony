'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight, Lock, BadgeCheck, Sparkles, Languages, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const IMG_WOMAN = '/onboarding/image-3.jpg';
const IMG_MAN = '/onboarding/image-1.jpg';

const IMG_WOMAN1 = '/onboarding/image-4.jpg';
const IMG_MAN1 = '/onboarding/image-2.jpg';

const FEATURES = [
  { Icon: Sparkles, label: 'Preferences Match' },
  { Icon: Languages, label: 'Same Language' },
  { Icon: MapPin, label: '12 km away' },
  { Icon: Users, label: 'Family Values' },
];

/* ---------- Screen 1 : hero ---------- */
function WelcomeScreen() {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card)] py-10 shadow-xl shadow-[var(--primary)]/10">
          {/* soft background hearts */}
          <Heart size={22} className="animate-shield-glow absolute left-6 top-6 text-[var(--primary)]/40" fill="currentColor" />
          <Heart size={14} className="animate-shield-glow absolute right-10 top-14 text-[var(--primary)]/30" fill="currentColor" />
          <Heart size={16} className="animate-shield-glow absolute bottom-8 left-10 text-[var(--primary)]/30" fill="currentColor" />

          {/* verified badge */}
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            <span className="text-xs font-bold text-[var(--text)]">Verified</span>
          </div>

          {/* couple portraits */}
          <div className="relative flex items-center">
            <img src={IMG_MAN} alt="" className="relative z-10 h-[170px] w-[130px] rounded-[28px] border-4 border-[var(--card)] object-cover shadow-lg" />
            <img src={IMG_WOMAN} alt="" className="-ml-6 mt-10 h-[170px] w-[130px] rounded-[28px] border-4 border-[var(--card)] object-cover shadow-lg" />
            <div className="absolute left-1/2 top-1/2 z-20 bg-[var(--primary)] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[var(--card)] shadow-lg">
              <Heart size={20} color="#fff" fill="#fff" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <h1 className="text-[25px] font-extrabold leading-[36px] text-[var(--text)]">
          Your <span className="text-[var(--primary)]">perfect match</span> is just a step away!
        </h1>
    
      </div>
    </>
  );
}

/* ---------- Screen 2 : meaningful match ---------- */
function MeaningfulScreen() {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative w-full max-w-[300px]">
          {/* peeking second card */}
          <img
            src={IMG_MAN1}
            alt=""
            className="absolute -right-5 top-5 h-[210px] w-[150px] rotate-6 rounded-[24px] border-4 border-[var(--card)] object-cover opacity-90 shadow-lg"
          />
          {/* main profile card */}
          <div className="relative z-10 w-[230px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-[var(--primary)]/10">
            <div className="relative">
              <img src={IMG_WOMAN1} alt="" className="h-[210px] w-full object-cover" />
              <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card)] shadow">
                <Heart size={18} className="text-[var(--primary)]" fill="currentColor" />
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="flex items-center gap-1.5 text-[17px] font-black text-[var(--text)]">
                Ananya, 26 <BadgeCheck size={16} className="text-[var(--success)]" />
              </p>
              <p className="text-[13px] text-[var(--muted)]">Software Engineer</p>
            </div>
          </div>
        </div>

        {/* feature chips */}
        <div className="mt-6 grid w-full max-w-[340px] grid-cols-2 gap-2.5">
          {FEATURES.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)]">
                <Icon size={15} color="var(--primary)" />
              </span>
              <span className="text-[13px] font-bold leading-4 text-[var(--text)]">{label}</span>
            </div>
          ))}
        </div>
      </div>


    </>
  );
}

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

  const isLast = page === 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-6">
      {/* brand header */}
      <div className="flex items-center justify-center gap-2">
      <img src="/logo.png" alt="Indian Shaadi Matrimony" width="260" />
      </div>

      <div key={page} className="animate-fade-in flex min-h-0 flex-1 flex-col ">
        {page === 0 ? <WelcomeScreen /> : <MeaningfulScreen />}
      </div>

      {/* dots */}
 

      <button
        onClick={() => (isLast ? router.push('/auth') : setPage(1))}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] text-[17px] font-extrabold text-white shadow-lg shadow-[var(--primary)]/30 active:scale-[0.98]"
      >
        {isLast ? 'Get Started' : 'Find My Matches'}
        <ArrowRight size={20} />
      </button>

      <div className="mt-4 flex items-center justify-center gap-4">
        {!isLast && (
          <>
            <button onClick={() => router.push('/auth')} className="font-semibold text-[var(--muted)]">Skip</button>
            <span className="h-3.5 w-px bg-[var(--border)]" />
          </>
        )}
        <div className="flex items-center gap-1.5 text-[var(--muted2)]">
          <Lock size={12} />
          <span className="text-xs font-semibold">{isLast ? 'Trusted by 2M+ Indians' : 'Your preferences are private'}</span>
        </div>
      </div>

      {isLast && (
        <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted2)]">
          By continuing you agree to our Terms &amp; Privacy Policy. Flirty is for 18+ only. Safety first.
        </p>
      )}
    </div>
  );
}