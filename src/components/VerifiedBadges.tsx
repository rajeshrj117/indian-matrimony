'use client';

import { Crown, ShieldCheck, BadgeCheck } from 'lucide-react';

// Shared gold gradient + border used across all "verified/premium" pills so they read as
// one consistent visual language wherever a profile is shown full-bleed over a photo.
const GOLD_BG = 'linear-gradient(135deg, #F7D98A 0%, #D4A94A 55%, #B8860B 100%)';
const GOLD_BORDER = '1px solid rgba(255, 224, 130, 0.9)';

// Gold "Verified" pill with a crown, for the top-left corner of a photo (matches the
// reference design). Only rendered when the profile has actually passed face verification.
export function VerifiedPill({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  return (
    <span
      className={`flex items-center gap-1 rounded-full ${pad} ${textSize} font-extrabold text-[#3B2A06] shadow-sm`}
      style={{ background: GOLD_BG, border: GOLD_BORDER }}
    >
      <Crown size={size === 'sm' ? 11 : 13} color="#3B2A06" fill="#3B2A06" /> Verified
    </span>
  );
}

// Gold "Premium Profile" pill for the top-right corner, shown for premium subscribers.
export function PremiumPill({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  return (
    <span
      className={`flex items-center gap-1 rounded-full ${pad} ${textSize} font-extrabold text-[#3B2A06] shadow-sm`}
      style={{ background: GOLD_BG, border: GOLD_BORDER }}
    >
      <Crown size={size === 'sm' ? 11 : 13} color="#3B2A06" fill="#3B2A06" /> Premium Profile
    </span>
  );
}

// Small blue checkmark shown right next to the name — kept separate from the gold pill
// above so the name row still reads at a glance even when the photo badges scroll away.
export function NameCheckmark({ size = 16 }: { size?: number }) {
  return <BadgeCheck size={size} color="#3B82F6" fill="#DBEAFE" />;
}

// The dark trust strip from the reference design, shown below the name/location line over
// the photo gradient. Copy is kept accurate to what verification actually checks (a live
// selfie matched to the profile photo) rather than the reference's "ID Verified" wording —
// this app doesn't run identity/background checks, and Safety Center says so explicitly, so
// the badge shouldn't imply otherwise.
export function VerifiedTrustStrip() {
  return (
    <div
      className="mt-2 inline-flex items-center gap-2 rounded-xl px-3 py-1.5"
      style={{ background: 'rgba(20, 14, 3, 0.55)', border: GOLD_BORDER, backdropFilter: 'blur(2px)' }}
    >
      <span
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-[#3B2A06]"
        style={{ background: GOLD_BG }}
      >
        <ShieldCheck size={11} color="#3B2A06" /> Verified User
      </span>
      <span className="text-[11px] font-semibold text-white/90">Selfie Verified &bull; Photo Match Confirmed</span>
    </div>
  );
}

// ---- Selfie-verification badges (shown only once the server has marked the profile verified) ----

// Green "✓ Verified" pill for the top-left of a card photo.
export function VerifiedCardPill() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[12px] font-extrabold text-white shadow">
      <ShieldCheck size={13} strokeWidth={2.5} /> Verified
    </span>
  );
}

// Blue tick next to a name. Renders nothing for unverified profiles, so it's safe to drop in anywhere.
export function VerifiedTick({ verified, size = 18 }: { verified?: boolean; size?: number }) {
  if (!verified) return null;
  return <BadgeCheck size={size} color="#fff" fill="#2563EB" className="shrink-0" aria-label="Selfie verified" />;
}

// Small prompt for people who haven't verified yet.
export function GetVerifiedPrompt({ onPress }: { onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-3 text-left"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB]">
        <ShieldCheck size={18} color="#fff" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-[#1E3A8A]">Get your Verified badge</span>
        <span className="block text-[12px] text-[#3B5BA5]">Take a quick selfie so people know it&apos;s really you.</span>
      </span>
    </button>
  );
}