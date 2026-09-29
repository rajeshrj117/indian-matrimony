'use client';

import { useState } from 'react';
import { Star, Heart, X } from 'lucide-react';
import type { Profile, RatingDoc, RatingSummary } from '@/lib/types';

const GOLD_BORDER = '1px solid rgba(255, 224, 130, 0.9)';

// Only women leave a trust-star rating (0-10); everyone can leave a likes score (0-10).
// See firestore.rules `isFemale` check, which enforces this server-side too.
export const canGiveStars = (gender: Profile['gender'] | undefined) => gender === 'Female';

// The dark/gold "Trust Rating ★★★★★ 4.8 (124 reviews) | ❤️ 248 likes" strip shown over a
// profile photo. Renders nothing until at least one rating exists, so it never shows a
// misleading "0.0 (0 reviews)" on a brand-new profile.
export function TrustRatingStrip({
  summary, onPress, dark = true,
}: { summary: RatingSummary | null; onPress?: () => void; dark?: boolean }) {
  if (!summary || (summary.starsCount === 0 && summary.totalLikes === 0)) {
    if (!onPress) return null;
    return (
      <button
        onClick={onPress}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold ${dark ? 'text-white/85' : 'text-[var(--muted)]'}`}
        style={{ background: dark ? 'rgba(20, 14, 3, 0.55)' : 'var(--inputBg)', border: dark ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--border)' }}
      >
        <Star size={13} /> Be the first to rate
      </button>
    );
  }
  const stars = Math.round(summary.avgStars);
  return (
    <button
      onClick={onPress}
      className="mt-2 flex items-center gap-2 rounded-xl px-3 py-1.5"
      style={{ background: 'rgba(20, 14, 3, 0.55)', border: GOLD_BORDER, backdropFilter: 'blur(2px)' }}
    >
      {summary.starsCount > 0 && (
        <>
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Star key={i} size={9} color="#F7D98A" fill={i < stars ? '#F7D98A' : 'transparent'} />
            ))}
          </span>
          <span className="text-[11px] font-extrabold text-white">
            {summary.avgStars.toFixed(1)}/10 <span className="font-semibold text-white/70">({summary.starsCount})</span>
          </span>
        </>
      )}
      {summary.starsCount > 0 && summary.totalLikes > 0 && <span className="text-white/40">|</span>}
      {summary.totalLikes > 0 && (
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-white">
          <Heart size={11} color="#FB4E7A" fill="#FB4E7A" /> {summary.totalLikes} likes
        </span>
      )}
    </button>
  );
}

// Bottom-sheet for leaving a rating. Women get both sliders (stars + likes); everyone else
// only ever sees the likes slider — there's no UI path for a man to set stars at all.
export function RateSheet({
  targetName, raterGender, initial, onClose, onSubmit,
}: {
  targetName: string;
  raterGender: Profile['gender'] | undefined;
  initial: RatingDoc | null;
  onClose: () => void;
  onSubmit: (values: { likes: number; stars?: number }) => Promise<void>;
}) {
  const showStars = canGiveStars(raterGender);
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [likes, setLikes] = useState(initial?.likes ?? 0);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(showStars ? { likes, stars } : { likes });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col justify-end bg-black/60">
      <div className="animate-pop-in rounded-t-3xl bg-[var(--card)] p-5 pb-7">
        <div className="flex items-center justify-between">
          <p className="text-lg font-black text-[var(--text)]">Rate {targetName}</p>
          <button onClick={onClose} className="rounded-full bg-[var(--inputBg)] p-1.5">
            <X size={18} color="var(--muted)" />
          </button>
        </div>

        {showStars && (
          <div className="mt-5">
            <p className="text-[13px] font-bold text-[var(--muted)]">Trust rating — {stars}/10</p>
            <div className="mt-2 flex justify-between">
              {Array.from({ length: 11 }).map((_, i) => (
                <button key={i} onClick={() => setStars(i)} className="p-0.5">
                  <Star size={20} color="#D4A94A" fill={i <= stars ? '#D4A94A' : 'transparent'} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={showStars ? 'mt-5' : 'mt-5'}>
          <p className="text-[13px] font-bold text-[var(--muted)]">Likes — {likes}/10</p>
          <div className="mt-2 flex justify-between">
            {Array.from({ length: 11 }).map((_, i) => (
              <button key={i} onClick={() => setLikes(i)} className="p-0.5">
                <Heart size={18} color="#FB4E7A" fill={i <= likes ? '#FB4E7A' : 'transparent'} />
              </button>
            ))}
          </div>
        </div>

        {!showStars && (
          <p className="mt-4 text-[11px] font-semibold text-[var(--muted)]">
            Trust-star ratings can only be given by women.
          </p>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="grad-primary mt-6 flex h-12 w-full items-center justify-center rounded-full font-extrabold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Submit rating'}
        </button>
      </div>
    </div>
  );
}
