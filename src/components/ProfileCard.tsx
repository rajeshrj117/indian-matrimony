'use client';

import {
  Bookmark, BadgeCheck, Loader2, MessageCircle, Heart, Check, X, Star, MapPin, GraduationCap, Users,
  Ruler, Quote, Sparkles, MoonStar, Lock,
} from 'lucide-react';
import { photoLock } from '@/lib/photoPrivacy';
import { horoscopeMatch, horoscopeName } from '@/lib/horoscope';
import { communityLine, formatHeightShort, mutualCompatibility } from '@/lib/matrimony';
import type { InterestState } from '@/lib/firestore';
import type { Profile, RatingDoc, RatingSummary } from '@/lib/types';

const FALLBACK_PHOTO = 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=400';
const GOLD = '#F5B324';

type Handlers = {
  onOpen: () => void;
  onSend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
  onMessage: () => void;
  onToggleShortlist: () => void;
  onDismiss?: () => void;     // the round X (discover only)
  onToggleLike?: () => void;  // heart on the photo
  onRate?: () => void;        // opens the rating sheet
};

// Main action pill(s) — changes with where the interest stands between me and this person.
function MainAction({ state, busy, h }: { state: InterestState; busy: boolean; h: Handlers }) {
  const pill = 'flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-extrabold text-white shadow-md disabled:opacity-60';
  const pillBg = { background: 'linear-gradient(90deg, #da3036, #da3036)' };

  if (state.state === 'connected') {
    return (
      <button onClick={h.onMessage} className={`${pill} flex-1`} style={pillBg}>
        <MessageCircle size={18} /> Message
      </button>
    );
  }
  if (state.state === 'received') {
    return (
      <>
        <button onClick={h.onAccept} disabled={busy} className={`${pill} flex-1`} style={pillBg}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Accept
        </button>
        <button onClick={h.onDecline} disabled={busy} className="flex h-12 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] text-[14px] font-extrabold text-[var(--text)] disabled:opacity-60">
          Decline
        </button>
      </>
    );
  }
  if (state.state === 'sent' && state.status === 'pending') {
    return (
      <>
        <span className="flex h-12 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] text-[14px] font-extrabold text-[var(--muted)]">
          Interest sent
        </span>
        <button onClick={h.onWithdraw} disabled={busy} className="px-2 text-[13px] font-bold text-[var(--muted)] disabled:opacity-60">
          Withdraw
        </button>
      </>
    );
  }
  return (
    <button onClick={h.onSend} disabled={busy} className={`${pill} flex-1`} style={pillBg}>
      {busy ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />} Send interest
    </button>
  );
}

// ★★★★☆ 8.2/10 (12) · ♥ 48 liked — avg trust stars (0-10) drawn on a 5-star scale.
function RatingRow({ summary, onRate }: { summary?: RatingSummary | null; onRate?: () => void }) {
  if (!summary && !onRate) return null;
  const has = summary && summary.starsCount > 0;
  const filled = has ? summary.avgStars / 2 : 0; // 0-10 -> 0-5
  const likes = summary?.totalLikes ?? 0;
  return (
    <button
      onClick={onRate}
      disabled={!onRate}
      className="mt-2.5 flex w-full items-center gap-2 rounded-2xl bg-[var(--inputBg)] px-3 py-2 text-left"
      aria-label="Rate this profile"
    >
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const f = Math.max(0, Math.min(1, filled - i));
          return (
            <span key={i} className="relative inline-block h-[15px] w-[15px]">
              <Star size={15} color={GOLD} fill="transparent" className="absolute inset-0" />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${f * 100}%` }}>
                <Star size={15} color={GOLD} fill={GOLD} />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-[13px] font-extrabold text-[var(--text)]">
        {has ? summary.avgStars.toFixed(1) : 'No ratings'}
        {has && <span className="font-semibold text-[var(--muted)]"> /10 ({summary.starsCount})</span>}
      </span>
      <span className="ml-auto flex items-center gap-1 text-[13px] font-extrabold text-[var(--text)]">
        <Heart size={13} color="#FB4E7A" fill="#FB4E7A" /> {likes} <span className="font-semibold text-[var(--muted)]">liked</span>
      </span>
    </button>
  );
}

export default function ProfileCard({
  profile, viewer, state, shortlisted, busy, note, footerNote, handlers, rating, myRating,
}: {
  profile: Profile;
  viewer?: Profile | null; // when given, the card shows mutual compatibility with this person
  state: InterestState;
  shortlisted: boolean;
  busy: boolean;
  note?: string;        // e.g. the message that came with an interest
  footerNote?: string;  // e.g. "Viewed you 2h ago"
  handlers: Handlers;
  rating?: RatingSummary | null;  // omit to hide the rating row
  myRating?: RatingDoc | null;    // my own rating of this person (drives the "liked" heart)
}) {
  const community = communityLine(profile);
  const study = [profile.education, profile.job].filter(Boolean).join(' · ');
  const lock = photoLock(profile, viewer?.uid, state);
  const photo = profile.images?.[0] || FALLBACK_PHOTO;
  const height = formatHeightShort(profile.heightCm);
  const place = [profile.location, profile.state].filter(Boolean).join(', ');
  const tags = (profile.interests ?? []).filter(Boolean);
  const quote = note || profile.maritalStatus;
  const compat = viewer && viewer.uid !== profile.uid ? mutualCompatibility(viewer, profile) : null;
  const horoName = horoscopeName(profile);
  const horo = viewer && viewer.uid !== profile.uid ? horoscopeMatch(viewer, profile) : null;
  const liked = (myRating?.likes ?? 0) > 0;
  const showRatings = profile.gender === 'Male'; // ratings/likes only apply to men's profiles

  return (
    <article className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[0_8px_30px_rgba(120,60,200,0.08)]">
      {/* Photo */}
      <div className="relative">
        <button onClick={handlers.onOpen} className="relative block w-full overflow-hidden rounded-2xl bg-[var(--inputBg)]" aria-label={`Open ${profile.name}'s profile`}>
          {lock === 'hidden' ? (
            <span className="block h-[260px] w-full" style={{ background: 'linear-gradient(135deg, #F1ECFF, #FFE4F1)' }} />
          ) : (
            <>
              {/* blurred backdrop fills the empty sides so the full photo can show uncropped */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className={`relative mx-auto block max-h-[460px] min-h-[200px] w-full object-contain ${lock === 'blur' ? 'scale-110 blur-2xl' : ''}`} />
            </>
          )}
          {lock && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/20 px-6 text-center text-white">
              <Lock size={26} />
              <span className="text-[13px] font-extrabold drop-shadow">Photos unlock when {profile.name} shows interest</span>
            </span>
          )}
        </button>
        {profile.verified && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[12px] font-extrabold text-white shadow">
            <Check size={13} strokeWidth={3} /> Verified
          </span>
        )}
        {profile.online && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-extrabold text-white">● Online</span>
        )}
        {showRatings && handlers.onToggleLike && (
          <button
            onClick={handlers.onToggleLike}
            aria-label={liked ? 'Remove like' : 'Like this profile'}
            aria-pressed={liked}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm"
          >
            <Heart size={20} color={liked ? '#FB4E7A' : '#fff'} fill={liked ? '#FB4E7A' : 'none'} />
          </button>
        )}
      </div>

      {/* Name row */}
      <div className="mt-3 flex items-start justify-between gap-2 px-1">
        <button onClick={handlers.onOpen} className="flex min-w-0 items-center gap-1.5 text-left">
          <span className="truncate text-[22px] font-black text-[var(--text)]">{profile.name}, {profile.age}</span>
          {profile.verified && <BadgeCheck size={20} color="#2563EB" className="shrink-0" aria-label="Verified" />}
        </button>
        <button
          onClick={handlers.onToggleShortlist}
          disabled={busy}
          aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-pressed={shortlisted}
          className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
        >
          <Bookmark size={22} color={shortlisted ? '#da3036' : 'var(--muted)'} fill={shortlisted ? '#da3036' : 'none'} />
        </button>
      </div>

      {/* Details */}
      <button onClick={handlers.onOpen} className="mt-1 flex w-full items-start gap-2 px-1 text-left">
        <span className="min-w-0 flex-1 space-y-1.5 text-[14px] text-[var(--muted)]">
          {place && <span className="flex items-center gap-2"><MapPin size={16}  className="shrink-0" /><span className="truncate">{place}</span></span>}
          {study && <span className="flex items-center gap-2"><GraduationCap size={16}  className="shrink-0" /><span className="truncate">{study}</span></span>}
          {community && <span className="flex items-center gap-2"><Users size={16}  className="shrink-0" /><span className="truncate">{community}</span></span>}
        </span>
        {height && (
          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[14px] font-semibold text-[var(--muted)]">
            <Ruler size={15} color="#5B3FD1" /> {height}
          </span>
        )}
      </button>

      {/* Interest tags */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 px-1 text-[#474c50]">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-[#fff1f3] px-3 py-1 text-[13px] font-bold ">{t}</span>
          ))}
          {tags.length > 3 && <span className="rounded-full bg-[#fff1f3] px-3 py-1 text-[13px] font-bold">+{tags.length - 3}</span>}
        </div>
      )}

      {/* Quote / status + Mutual match (single row) */}
      {(quote || (compat && compat.score !== null)) && (
        <div className="mx-1 mt-3 flex items-stretch gap-2">
          {quote && (
            <p className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--inputBg)] px-3 py-2.5 text-[14px] text-[var(--text)]">
              <Quote size={14} color="var(--muted)" fill="var(--muted)" className="shrink-0" />
              <span className="min-w-0 truncate">&ldquo;{quote}&rdquo;</span>
            </p>
          )}
          {compat && compat.score !== null && (
            <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#E8FAF0] px-3 py-2.5 text-[14px] font-extrabold text-[#166534]">
              <Sparkles size={16} className="shrink-0" /> {compat.score}% {compat.twoWay ? 'mutual match' : 'match'}
            </div>
          )}
        </div>
      )}

      {/* Horoscope */}
      {horoName && (
        <div className="mx-1 mt-2.5 flex items-center gap-2 rounded-xl bg-[#F1ECFF] px-3 py-2.5 text-[14px] font-extrabold text-[#5B3FD1]">
          <MoonStar size={16} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{horoName}</span>
          {horo && horo.overall !== null && (
            <span className="shrink-0 rounded-full bg-[#5B3FD1] px-2.5 py-0.5 text-[12px] font-extrabold text-white">{horo.overall}% match</span>
          )}
        </div>
      )}

      {/* Star rating + liked */}
      {showRatings && (
        <div className="mx-1">
          <RatingRow summary={rating} onRate={handlers.onRate} />
        </div>
      )}

      {footerNote && <p className="mt-2 px-2 text-[12px] font-semibold text-[var(--muted)]">{footerNote}</p>}

      {/* Actions */}
      <div className="mt-3.5 flex items-center gap-3 px-1">
        {handlers.onDismiss && (
          <button
            onClick={handlers.onDismiss}
            aria-label="Not interested"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm"
          >
            <X size={22} color="#5B6AA8" />
          </button>
        )}
        <MainAction state={state} busy={busy} h={handlers} />
        {showRatings && handlers.onRate && (
          <button
            onClick={handlers.onRate}
            aria-label="Rate"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #E11D9C, #8B3FE0)' }}
          >
            <Star size={22} fill="#fff" />
          </button>
        )}
      </div>
    </article>
  );
}