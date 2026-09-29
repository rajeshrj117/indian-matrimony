'use client';

import { Bookmark, BadgeCheck, Loader2, MessageCircle, Heart, Check } from 'lucide-react';
import { communityLine, factsLine } from '@/lib/matrimony';
import type { InterestState } from '@/lib/firestore';
import { CompatibilityBadge } from '@/components/Compatibility';
import type { Profile } from '@/lib/types';

const FALLBACK_PHOTO = 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=400';

type Handlers = {
  onOpen: () => void;
  onSend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
  onMessage: () => void;
  onToggleShortlist: () => void;
};

// Action row that changes with where the interest stands between me and this person.
function InterestActions({ state, busy, h }: { state: InterestState; busy: boolean; h: Handlers }) {
  const base = 'flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-extrabold disabled:opacity-60';

  if (state.state === 'connected') {
    return (
      <button onClick={h.onMessage} className={`${base} grad-primary flex-1 text-white`}>
        <MessageCircle size={15} /> Message
      </button>
    );
  }
  if (state.state === 'received') {
    return (
      <>
        <button onClick={h.onAccept} disabled={busy} className={`${base} grad-primary flex-1 text-white`}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Accept
        </button>
        <button onClick={h.onDecline} disabled={busy} className={`${base} flex-1 border border-[var(--border)] bg-[var(--inputBg)] text-[var(--text)]`}>
          Decline
        </button>
      </>
    );
  }
  if (state.state === 'sent' && state.status === 'pending') {
    return (
      <>
        <span className={`${base} flex-1 border border-[var(--border)] bg-[var(--inputBg)] text-[var(--muted)]`}>
          Interest sent
        </span>
        <button onClick={h.onWithdraw} disabled={busy} className={`${base} px-3 text-[var(--muted)]`}>
          Withdraw
        </button>
      </>
    );
  }
  return (
    <button onClick={h.onSend} disabled={busy} className={`${base} grad-primary flex-1 text-white`}>
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} />} Send interest
    </button>
  );
}

export default function ProfileCard({
  profile, viewer, state, shortlisted, busy, note, footerNote, handlers,
}: {
  profile: Profile;
  viewer?: Profile | null; // when given, the card shows mutual compatibility with this person
  state: InterestState;
  shortlisted: boolean;
  busy: boolean;
  note?: string;        // e.g. the message that came with an interest
  footerNote?: string;  // e.g. "Viewed you 2h ago"
  handlers: Handlers;
}) {
  const community = communityLine(profile);
  const study = [profile.education, profile.job].filter(Boolean).join(' · ');
  const photo = profile.images?.[0] || FALLBACK_PHOTO;

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex gap-3 p-3">
        <button onClick={handlers.onOpen} className="relative h-[136px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-[var(--inputBg)]" aria-label={`Open ${profile.name}'s profile`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-full w-full object-cover" />
          {profile.online && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">Online</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button onClick={handlers.onOpen} className="min-w-0 text-left">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[17px] font-black text-[var(--text)]">{profile.name}, {profile.age}</span>
                {profile.verified && <BadgeCheck size={17} color="#2563EB" className="shrink-0" aria-label="Verified" />}
              </span>
            </button>
            <button
              onClick={handlers.onToggleShortlist}
              disabled={busy}
              aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              aria-pressed={shortlisted}
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
            >
              <Bookmark size={19} color={shortlisted ? 'var(--primary)' : 'var(--muted)'} fill={shortlisted ? 'var(--primary)' : 'none'} />
            </button>
          </div>

          <button onClick={handlers.onOpen} className="mt-0.5 block w-full text-left">
            {factsLine(profile) && <p className="truncate text-[13px] font-semibold text-[var(--text)]">{factsLine(profile)}</p>}
            {community && <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{community}</p>}
            {study && <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{study}</p>}
            {profile.state && <p className="mt-0.5 truncate text-[12px] text-[var(--muted2)]">{profile.state}</p>}
          </button>
          <div className="mt-1.5"><CompatibilityBadge viewer={viewer} profile={profile} /></div>
        </div>
      </div>

      {note && (
        <p className="mx-3 mb-2 rounded-xl bg-[var(--inputBg)] px-3 py-2 text-[13px] italic text-[var(--text)]">&ldquo;{note}&rdquo;</p>
      )}
      {footerNote && <p className="px-3 pb-2 text-[12px] font-semibold text-[var(--muted)]">{footerNote}</p>}

      <div className="flex gap-2 border-t border-[var(--border)] p-3">
        <InterestActions state={state} busy={busy} h={handlers} />
      </div>
    </article>
  );
}
