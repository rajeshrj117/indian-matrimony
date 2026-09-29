'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getProfilesByUids, listenInterestsReceived, listenInterestsSent, listenShortlist, listenViewedMe,
  type InterestState,
} from '@/lib/firestore';
import { daysAgo } from '@/lib/matrimony';
import { useInterestActions } from '@/lib/useInterestActions';
import ProfileCard from '@/components/ProfileCard';
import Toast from '@/components/Toast';
import type { InterestDoc, Profile, ProfileViewDoc, ShortlistDoc } from '@/lib/types';

type TabKey = 'received' | 'sent' | 'accepted' | 'shortlist' | 'viewed';

const TAB_LABEL: Record<TabKey, string> = {
  received: 'Received',
  sent: 'Sent',
  accepted: 'Accepted',
  shortlist: 'Shortlist',
  viewed: 'Viewed you',
};

const EMPTY: Record<TabKey, { title: string; body: string }> = {
  received: { title: 'No new interests', body: 'When someone sends you an interest, it shows up here for you to accept or decline.' },
  sent: { title: 'You haven\u2019t sent any interests', body: 'Find profiles in Search and tap Send interest.' },
  accepted: { title: 'No accepted interests yet', body: 'Once an interest is accepted, you can chat with that person from here.' },
  shortlist: { title: 'Your shortlist is empty', body: 'Tap the bookmark on any profile to save it for later. Only you can see your shortlist.' },
  viewed: { title: 'No profile views yet', body: 'A complete profile with a clear photo gets seen more often.' },
};

export default function InterestsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const actions = useInterestActions();

  const [tab, setTab] = useState<TabKey>('received');
  const [received, setReceived] = useState<InterestDoc[]>([]);
  const [sent, setSent] = useState<InterestDoc[]>([]);
  const [shortlist, setShortlist] = useState<ShortlistDoc[]>([]);
  const [viewers, setViewers] = useState<ProfileViewDoc[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      listenInterestsReceived(user.uid, setReceived),
      listenInterestsSent(user.uid, setSent),
      listenShortlist(user.uid, setShortlist),
      listenViewedMe(user.uid, setViewers),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  const pendingReceived = useMemo(() => received.filter((i) => i.status === 'pending'), [received]);
  const pendingSent = useMemo(() => sent.filter((i) => i.status === 'pending'), [sent]);
  const accepted = useMemo(() => {
    const byUid = new Map<string, number>();
    for (const i of received) if (i.status === 'accepted') byUid.set(i.from, i.updatedAt);
    for (const i of sent) if (i.status === 'accepted') byUid.set(i.to, i.updatedAt);
    return Array.from(byUid, ([uid, at]) => ({ uid, at })).sort((a, b) => b.at - a.at);
  }, [received, sent]);

  const sentStatus = useMemo(() => new Map(sent.map((i) => [i.to, i.status])), [sent]);
  const receivedByFrom = useMemo(() => new Map(received.map((i) => [i.from, i])), [received]);

  // State for a person, from my point of view.
  const stateFor = (uid: string): InterestState => {
    const mineOut = sentStatus.get(uid);
    const theirs = receivedByFrom.get(uid);
    if (mineOut === 'accepted' || theirs?.status === 'accepted') return { state: 'connected' };
    if (theirs?.status === 'pending') return { state: 'received' };
    if (mineOut === 'pending') return { state: 'sent', status: 'pending' };
    if (mineOut === 'declined') return { state: 'sent', status: 'declined' };
    if (theirs?.status === 'declined') return { state: 'declined-by-me' };
    return { state: 'none' };
  };

  const counts: Record<TabKey, number> = {
    received: pendingReceived.length,
    sent: pendingSent.length,
    accepted: accepted.length,
    shortlist: shortlist.length,
    viewed: viewers.length,
  };

  const visibleUids: string[] = useMemo(() => {
    switch (tab) {
      case 'received': return pendingReceived.map((i) => i.from);
      case 'sent': return pendingSent.map((i) => i.to);
      case 'accepted': return accepted.map((a) => a.uid);
      case 'shortlist': return shortlist.map((s) => s.target);
      case 'viewed': return viewers.map((v) => v.viewer);
    }
  }, [tab, pendingReceived, pendingSent, accepted, shortlist, viewers]);

  // Load profiles only for the tab on screen, and only the ones we don't have yet.
  const missingKey = visibleUids.filter((u) => !profiles[u]).join(',');
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    getProfilesByUids(missingKey.split(',')).then((list) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of list) next[p.uid] = p;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [missingKey]);

  if (!user) return null;

  const shortlistSet = new Set(shortlist.map((s) => s.target));
  const items = visibleUids.map((uid) => profiles[uid]).filter((p): p is Profile => Boolean(p));
  const loadingProfiles = visibleUids.length > 0 && items.length === 0 && Boolean(missingKey);

  const noteFor = (uid: string) => (tab === 'received' ? receivedByFrom.get(uid)?.message : undefined);
  const footerFor = (uid: string) => {
    if (tab === 'viewed') {
      const v = viewers.find((x) => x.viewer === uid);
      return v ? `Viewed your profile ${daysAgo(v.viewedAt)}${v.count > 1 ? ` · ${v.count} times` : ''}` : undefined;
    }
    if (tab === 'received') {
      const i = receivedByFrom.get(uid);
      return i ? `Sent ${daysAgo(i.createdAt)}` : undefined;
    }
    if (tab === 'sent') {
      const i = sent.find((x) => x.to === uid);
      return i ? `Sent ${daysAgo(i.createdAt)} · waiting for a reply` : undefined;
    }
    if (tab === 'accepted') {
      const a = accepted.find((x) => x.uid === uid);
      return a ? `Accepted ${daysAgo(a.at)}` : undefined;
    }
    return undefined;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toast message={actions.toast} />

      <header className="px-4 pb-2 pt-3">
        <h1 className="text-[22px] font-black tracking-tight text-[var(--text)]">Interests</h1>
      </header>

      <div role="tablist" className="flex gap-2 overflow-x-auto px-4 pb-3">
        {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => {
          const on = tab === k;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(k)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-extrabold"
              style={{
                background: on ? 'var(--text)' : 'var(--card)',
                color: on ? 'var(--card)' : 'var(--text)',
                borderColor: on ? 'var(--text)' : 'var(--border)',
              }}
            >
              {TAB_LABEL[k]}
              {counts[k] > 0 && (
                <span
                  className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold"
                  style={{
                    background: k === 'received' && !on ? 'var(--primary)' : on ? 'var(--card)' : 'var(--inputBg)',
                    color: k === 'received' && !on ? '#fff' : on ? 'var(--text)' : 'var(--muted)',
                  }}
                >
                  {counts[k] > 99 ? '99+' : counts[k]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {visibleUids.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-extrabold text-[var(--text)]">{EMPTY[tab].title}</p>
            <p className="mx-auto mt-1 max-w-[300px] text-[var(--muted)]">{EMPTY[tab].body}</p>
            {tab === 'sent' || tab === 'shortlist' ? (
              <button onClick={() => router.push('/discover')} className="mt-4 rounded-full bg-[var(--text)] px-6 py-2.5 text-sm font-extrabold text-[var(--card)]">
                Go to Search
              </button>
            ) : null}
          </div>
        ) : loadingProfiles ? (
          <p className="mt-16 text-center text-[var(--muted)]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((p) => (
              <ProfileCard
                key={p.uid}
                profile={p}
                viewer={profile}
                state={stateFor(p.uid)}
                shortlisted={shortlistSet.has(p.uid)}
                busy={actions.busyUid === p.uid}
                note={noteFor(p.uid)}
                footerNote={footerFor(p.uid)}
                handlers={{
                  onOpen: () => router.push(`/user/${p.uid}`),
                  onSend: () => actions.send(p),
                  onAccept: () => actions.accept(p),
                  onDecline: () => actions.decline(p),
                  onWithdraw: () => actions.withdraw(p),
                  onMessage: () => actions.openChat(p.uid),
                  onToggleShortlist: () => actions.toggleShortlist(p, shortlistSet.has(p.uid)),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
