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
