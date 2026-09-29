'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Star, Globe2, Check, Loader2, MessageCircle, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { upgradeToPremium, cancelPremium } from '@/lib/firestore';
import type { PremiumPlan } from '@/lib/types';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLANS: { id: PremiumPlan; label: string; price: string; sub: string }[] = [
  { id: 'monthly', label: 'Monthly', price: '₹299', sub: 'Billed every month' },
  { id: 'quarterly', label: '3 Months', price: '₹749', sub: '≈ ₹250/mo • best value' },
];

const PERKS = [
  { icon: Heart, text: 'See everyone who already liked you' },
  { icon: Star, text: 'Unlimited super likes, every day' },
  { icon: Globe2, text: 'Passport — browse and match in any city' },
  { icon: Star, text: 'Advanced matrimonial search filters' },
  { icon: Heart, text: 'See who viewed your profile' },
  { icon: MessageCircle, text: 'Premium messaging before a match' },
  { icon: Phone, text: 'Contact number & WhatsApp requests' },
  { icon: Sparkles, text: '1-hour Spotlight profile boost' },
];

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PremiumPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [plan, setPlan] = useState<PremiumPlan>('monthly');
  const [busy, setBusy] = useState(false);

  const isPremium = Boolean(profile?.premium);
  const amountPaise = plan === 'monthly' ? 29900 : 74900;

  const activate = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await upgradeToPremium(user.uid, plan);
      await refreshProfile();
    } catch (err) {
      console.error(err);
      alert('Could not activate premium. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const upgrade = async () => {
    if (!user) return;
    // Real payment flow if a Razorpay key is configured (NEXT_PUBLIC_RAZORPAY_KEY_ID).
    if (RAZORPAY_KEY) {
      setBusy(true);
      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        alert('Could not load the payment gateway. Please check your connection.');
        setBusy(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: amountPaise,
        currency: 'INR',
        name: 'Flirty Premium',
        description: `${plan === 'monthly' ? 'Monthly' : '3 Month'} plan`,
        handler: async () => {
          await activate();
        },
        prefill: { contact: user.phoneNumber ?? undefined, name: profile?.name },
        theme: { color: '#F43F5E' },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
      return;
    }
    // No payment gateway configured yet — activate directly so the feature is usable
    // while you finish wiring Razorpay (set NEXT_PUBLIC_RAZORPAY_KEY_ID to switch this on).
    await activate();
  };

  const downgrade = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await cancelPremium(user.uid);
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Flirty Premium</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grad-primary-diag rounded-3xl p-6 text-center text-white">
          <p className="text-2xl font-black">Unlock the full Flirty experience</p>
          <p className="mt-1.5 text-sm text-white/85">Cancel anytime, no strings attached.</p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          {PERKS.map((p) => (
            <div key={p.text} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50"><p.icon size={16} color="var(--primary)" /></span>
              <p className="font-semibold text-[var(--text)]">{p.text}</p>
            </div>
          ))}
        </div>

        {isPremium ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="flex items-center gap-1.5 text-emerald-700"><Check size={18} /><span className="font-extrabold">You&apos;re on Premium</span></div>
            {profile?.premiumExpiresAt && (
              <p className="text-xs text-emerald-700">
                Renews / expires {new Date(profile.premiumExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            <button onClick={downgrade} disabled={busy} className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-extrabold text-emerald-700 disabled:opacity-60">
              {busy ? 'Please wait…' : 'Cancel plan'}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex gap-2.5">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className="flex-1 rounded-2xl border p-3.5 text-left"
                  style={{
                    borderColor: plan === p.id ? 'var(--primary)' : 'var(--border)',
                    background: plan === p.id ? 'rgba(244,63,94,0.06)' : 'var(--card)',
                  }}
                >
                  <p className="font-extrabold text-[var(--text)]">{p.label}</p>
                  <p className="mt-1 text-xl font-black text-[var(--primary)]">{p.price}</p>
                  <p className="text-[11px] text-[var(--muted)]">{p.sub}</p>
                </button>
              ))}
            </div>

            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] font-extrabold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {busy ? 'Processing…' : `Upgrade • ${PLANS.find((p) => p.id === plan)?.price}`}
            </button>
            {!RAZORPAY_KEY && (
              <p className="mt-2 text-center text-[11px] text-[var(--muted2)]">
                Demo mode — payments aren&apos;t wired up yet, so upgrading activates instantly.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
