'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { listenMatches, getProfile, isBlockedEitherWay } from '@/lib/firestore';
import type { MatchDoc } from '@/lib/types';
import type { Profile } from '@/lib/types';

type ChatRow = { match: MatchDoc; other: Profile };

const FILTERS = ['All', 'Online'] as const;

export default function ChatsScreen() {
  const router = useRouter();
  const { user, profile: myProfile } = useAuth();
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
  const [search, setSearch] = useState('');
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    const unsub = listenMatches(user.uid, setMatches);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || matches.length === 0) return;
    const missing = Array.from(
      new Set(matches.map((m) => m.users.find((u) => u !== user.uid)!).filter((uid) => !profileCache[uid]))
    );
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(missing.map((uid) => getProfile(uid)));
      if (cancelled) return;
      setProfileCache((prev) => {
        const next = { ...prev };
        fetched.forEach((p, i) => { if (p) next[missing[i]] = p; });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [matches, profileCache, user]);

  const rows: ChatRow[] = user
    ? matches
        .map((m) => {
          const otherUid = m.users.find((u) => u !== user.uid)!;
          const other = profileCache[otherUid];
          if (!other) return null;
          // Chat vanishes for both people the moment either side has blocked the other —
          // the match doc and message history stay in Firestore untouched, they're just
          // hidden from this list until an unblock.
          if (isBlockedEitherWay(myProfile, other)) return null;
          return { match: m, other };
        })
        .filter((r): r is ChatRow => Boolean(r))
    : [];

  const filtered = rows.filter(
    (r) =>
      r.other.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'All' || (filter === 'Online' && r.other.online))
  );

  const timeAgo = (ts: number) => {
    const mins = Math.floor((now - ts) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-black text-[var(--text)]">Messages</h1>
        <div className="flex gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]"><Search size={16} color="var(--text)" /></button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]"><MoreHorizontal size={16} color="var(--text)" /></button>
        </div>
      </div>

      <div className="px-4">
        <div className="flex h-11 items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3">
          <Search size={16} color="var(--muted)" />
          <input
            placeholder="Search matches"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 flex-1 bg-transparent font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
          />
        </div>
        <div className="mt-3 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="h-8 rounded-full border px-4 text-[13px] font-bold"
              style={{ background: filter === f ? 'var(--text)' : 'var(--card)', color: filter === f ? 'var(--card)' : 'var(--text)', borderColor: 'var(--border)' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-3.5 flex gap-3.5 overflow-x-auto px-4 pb-1">
          {rows.slice(0, 8).map(({ other }) => (
            <div key={other.uid} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="relative rounded-full border-2 p-0.5" style={{ borderColor: other.online ? 'var(--primary)' : 'var(--border)' }}>
                <img src={other.images[0] || 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=200'} className="h-14 w-14 rounded-full object-cover" alt="" />
                {other.online && <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[var(--card)] bg-emerald-500" />}
              </div>
              <span className="text-[11px] font-bold text-[var(--text)]">{other.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5 p-4 pb-24">
        {filtered.length === 0 && (
          <div className="mt-10 flex flex-col items-center">
            <MessageCircle size={40} color="var(--muted2)" />
            <p className="mt-2 text-[var(--muted)]">{rows.length === 0 ? 'No matches yet — keep swiping!' : 'No chats found'}</p>
          </div>
        )}
        {filtered.map(({ match, other }) => (
          <button
            key={match.id}
            onClick={() => router.push(`/chat/${match.id}`)}
            className="flex gap-3 rounded-2xl px-2 py-3 text-left"
          >
            <div className="relative shrink-0">
              <img src={other.images[0] || 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=200'} className="h-14 w-14 rounded-full object-cover" alt="" />
              {other.online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg)] bg-emerald-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between">
                <span className="font-extrabold text-[var(--text)]">{other.name}</span>
                <span className="text-xs font-semibold text-[var(--muted)]">{timeAgo(match.lastMessageAt)}</span>
              </div>
              <p className="mt-1 truncate text-[13px] text-[var(--muted)]">{match.lastMessage}</p>
              <div className="mt-1 flex gap-1.5 text-[11px] text-[var(--muted2)]">
                <span>{other.online ? 'Active now' : 'Offline'}</span>
                <span>•</span>
                <span>{other.location}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
