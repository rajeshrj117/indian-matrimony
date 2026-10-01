'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, SlidersHorizontal, X, Heart, User, Sparkles, MapPin, ShieldCheck, Users, MoonStar } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchSearchPool, getActiveSpotlights, listenActivityNotifications, listenInterestStates, listenShortlist, type InterestState,
} from '@/lib/firestore';
import {
  activeFilterCount, defaultFiltersFor, matchesFilters, MUTUAL_MATCH_MIN, mutualCompatibility, normalizeFilters,
  rankByCompatibility, rankProfiles, type SearchFilters,
} from '@/lib/matrimony';
import { horoscopeMatch } from '@/lib/horoscope';
import { useInterestActions } from '@/lib/useInterestActions';
import { APP_NAME } from '@/lib/brand';
import FilterSheet from '@/components/FilterSheet';
import { RateSheet } from '@/components/TrustRating';
import { GetVerifiedPrompt } from '@/components/VerifiedBadges';
import { useRatings } from '@/lib/useRatings';
import ProfileCard from '@/components/ProfileCard';
import Toast from '@/components/Toast';
import type { Profile } from '@/lib/types';

const PAGE_SIZE = 20;
const STORAGE_KEY = 'matrimony_search_filters_v1';
const NONE: InterestState = { state: 'none' };

const HORO_MIN = 60; // minimum horoscope score for the Horoscope chip

type Chip = 'all' | 'nearby' | 'verified' | 'horoscope';
const CHIPS: { id: Chip; label: string; Icon: typeof Users }[] = [
  { id: 'all', label: 'All', Icon: Users },

  { id: 'nearby', label: 'Nearby', Icon: MapPin },
  { id: 'verified', label: 'Verified', Icon: ShieldCheck },
  { id: 'horoscope', label: 'Horoscope', Icon: MoonStar },
];

function loadSaved(): SearchFilters | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeFilters(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const actions = useInterestActions();

  const base = useMemo(() => defaultFiltersFor(profile), [profile]);
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pool, setPool] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [states, setStates] = useState<Record<string, InterestState>>({});
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [hasUnread, setHasUnread] = useState(false);
  const [spotlights, setSpotlights] = useState<Set<string>>(new Set());
  const [chip, setChip] = useState<Chip>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [rateTarget, setRateTarget] = useState<Profile | null>(null);

  // Filters: restore what the member last used, otherwise start from an age window that fits them.
  useEffect(() => {
    if (!profile || filters) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init from localStorage + profile
    setFilters(loadSaved() ?? base);
  }, [profile, base, filters]);

  useEffect(() => {
    if (!filters) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filters)); } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset paging when filters change
    setVisible(PAGE_SIZE);
  }, [filters]);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    setLoading(true);
    Promise.all([fetchSearchPool(profile), getActiveSpotlights()])
      .then(([list, boosts]) => { if (!cancelled) { setPool(list); setSpotlights(new Set(boosts.map(b => b.uid))); setLoadError(false); } })
      .catch((err) => { console.error(err); if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Only reload the pool when the account or who they're looking for changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.interestedIn]);

  useEffect(() => {
    if (!user) return;
    const u1 = listenInterestStates(user.uid, setStates);
    const u2 = listenShortlist(user.uid, (items) => setShortlist(new Set(items.map((i) => i.target))));
    const u3 = listenActivityNotifications(user.uid, (items) => setHasUnread(items.some((n) => !n.read)));
    return () => { u1(); u2(); u3(); };
  }, [user]);

  const results = useMemo(() => {
    if (!filters) return [];
    const matching = pool.filter((p) => {
      const st = states[p.uid];
      // Once either side has declined, that profile stays out of each other's results.
      if (st && ((st.state === 'sent' && st.status === 'declined') || st.state === 'declined-by-me')) return false;
      if (dismissed.has(p.uid)) return false;
      if (chip === 'male' && p.gender !== 'Male') return false;
      if (chip === 'female' && p.gender !== 'Female') return false;
      if (chip === 'verified' && !p.verified) return false;
      if (chip === 'nearby' && !(profile?.state && p.state === profile.state)) return false;
      if (chip === 'horoscope') {
        const h = horoscopeMatch(profile, p).overall;
        if (h === null || h < HORO_MIN) return false;
      }
      if (!matchesFilters(p, filters)) return false;
      if (filters.mutualOnly) {
        // Profiles with nothing to compare yet (no score) stay visible, same as blank fields elsewhere.
        const score = mutualCompatibility(profile, p).score;
        if (score !== null && score < MUTUAL_MATCH_MIN) return false;
      }
      return true;
    });
    const ranked = filters.sortBy === 'compatibility' ? rankByCompatibility(matching, profile) : rankProfiles(matching);
    if (chip === 'horoscope') {
      return ranked.sort((a, b) => (horoscopeMatch(profile, b).overall ?? 0) - (horoscopeMatch(profile, a).overall ?? 0));
    }
    return ranked.sort((a, b) => Number(spotlights.has(b.uid)) - Number(spotlights.has(a.uid)));
  }, [pool, filters, states, profile, spotlights, chip, dismissed]);

  const ratings = useRatings(user?.uid, profile?.gender, results.slice(0, visible).filter((p) => p.gender === 'Male').map((p) => p.uid));

  if (!user || !profile || !filters) return null;

  const filterCount = activeFilterCount(filters, base);
  const shown = results.slice(0, visible);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toast message={actions.toast} />

      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <div className="flex items-center gap-2.5">
          <Heart size={38} color="#C026D3" fill="#EC4899" strokeWidth={2.2} />
          <div className="leading-tight">
            <h1 className="text-[26px] font-black tracking-tight text-[#2A1F6B] dark:text-white">{APP_NAME}</h1>
            <p className="text-[12px] font-medium text-[var(--muted)]">Real People. Real Connections.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/notifications')}
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#F1ECFF]"
          >
            <Bell size={20} color="#2A1F6B" />
            {hasUnread && <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#F0148C]" />}
          </button>
          <button
            onClick={() => router.push('/profile')}
            aria-label="My profile"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]"
          >
            <User size={20} color="#5B3FD1" />
          </button>
        </div>
      </header>

      <div
        className="mx-4 mb-3 flex items-center justify-between rounded-3xl px-5 py-4 text-white shadow-md"
        style={{ background: 'linear-gradient(100deg, #F0508C 0%, #B565D6 55%, #8A7CF5 100%)' }}
      >
        <div>
          <p className="flex items-center gap-2 text-[22px] font-black"><Sparkles size={22} fill="#fff" /> Find Your Spark</p>
          <p className="mt-0.5 text-[14px] font-medium text-white/90">Meet amazing people, one swipe at a time.</p>
        </div>
        <Heart size={44} color="#fff" className="shrink-0 opacity-30" />
      </div>

      <div className="flex items-center gap-2 px-4 pb-2">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 shadow-sm">
          <Search size={16} color="var(--muted)" />
          <input
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            placeholder="Search by name, city or profession"
            aria-label="Search profiles"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
          />
          {filters.keyword && (
            <button onClick={() => setFilters({ ...filters, keyword: '' })} aria-label="Clear search">
              <X size={15} color="var(--muted)" />
            </button>
          )}
        </label>
        <button
          onClick={() => profile?.premium ? setShowFilters(true) : router.push('/advanced-filters')}
          aria-label="Open filters"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <SlidersHorizontal size={18} color="var(--text)" />
          {filterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-extrabold text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {!profile.verified && <GetVerifiedPrompt onPress={() => router.push('/settings/verification')} />}

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {CHIPS.map(({ id, label, Icon }) => {
          const on = chip === id;
          return (
            <button
              key={id}
              onClick={() => setChip(id)}
              aria-pressed={on}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold shadow-sm ${on ? 'text-white' : 'border border-[var(--border)] bg-[var(--card)] text-[#2A1F6B] dark:text-white'}`}
              style={on ? { background: '#F0148C' } : undefined}
            >
              <Icon size={15} color={on ? '#fff' : '#E11D9C'} /> {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-4 pb-2 text-[12px]">
        <span className="font-bold text-[var(--muted)]">
          {loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'profile' : 'profiles'} · ages ${filters.ageMin}–${filters.ageMax}`}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilters({ ...filters, sortBy: filters.sortBy === 'compatibility' ? 'recommended' : 'compatibility' })}
            aria-label="Change sort order"
            className="font-extrabold text-[var(--text)]"
          >
            {filters.sortBy === 'compatibility' ? 'Best match first' : 'Recommended'}
          </button>
          {filterCount > 0 && (
            <button onClick={() => setFilters({ ...base, keyword: filters.keyword, sortBy: filters.sortBy })} className="font-extrabold text-[var(--primary)]">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {(!profile.religion || !profile.heightCm) && (
        <button
          onClick={() => router.push('/settings/matrimony')}
          className="mx-4 mb-2 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] px-3.5 py-2.5 text-left"
        >
          <span className="block text-[13px] font-extrabold text-[var(--text)]">Complete your marriage profile</span>
          <span className="block text-[12px] text-[var(--muted)]">Add height, religion and community so the right people can find you.</span>
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="mt-16 text-center text-[var(--muted)]">Finding profiles for you…</p>
        ) : loadError ? (
          <div className="mt-16 text-center">
            <p className="font-extrabold text-[var(--text)]">Couldn&apos;t load profiles</p>
            <p className="mt-1 text-[var(--muted)]">Check your connection and reopen this tab.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-extrabold text-[var(--text)]">No profiles match these filters</p>
            <p className="mt-1 text-[var(--muted)]">
              {chip === 'horoscope' && !(profile.star || profile.rashi || profile.manglik)
                ? 'Add your star, rashi and manglik details to see horoscope matches.'
                : 'Widen the age range or remove a filter to see more.'}
            </p>
            {chip === 'horoscope' && !(profile.star || profile.rashi || profile.manglik) && (
              <button onClick={() => router.push('/settings/matrimony')} className="mt-4 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-extrabold text-white">
                Add horoscope details
              </button>
            )}
            {filterCount > 0 && (
              <button onClick={() => setFilters(base)} className="mt-4 rounded-full bg-[var(--text)] px-6 py-2.5 text-sm font-extrabold text-[var(--card)]">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map((p) => (
              <ProfileCard
                key={p.uid}
                profile={p}
                viewer={profile}
                state={states[p.uid] ?? NONE}
                shortlisted={shortlist.has(p.uid)}
                busy={actions.busyUid === p.uid}
                rating={ratings.data[p.uid]?.summary ?? null}
                myRating={ratings.data[p.uid]?.mine ?? null}
                handlers={{
                  onDismiss: () => setDismissed((d) => new Set(d).add(p.uid)),
                  onToggleLike: () => { ratings.toggleLike(p.uid).catch(() => actions.flash('Could not save like')); },
                  onRate: () => setRateTarget(p),
                  onOpen: () => router.push(`/user/${p.uid}`),
                  onSend: () => actions.send(p),
                  onAccept: () => actions.accept(p),
                  onDecline: () => actions.decline(p),
                  onWithdraw: () => actions.withdraw(p),
                  onMessage: () => actions.openChat(p.uid),
                  onToggleShortlist: () => actions.toggleShortlist(p, shortlist.has(p.uid)),
                }}
              />
            ))}
            {results.length > shown.length && (
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="mx-auto mt-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-2.5 text-sm font-extrabold text-[var(--text)]"
              >
                Show more ({results.length - shown.length} left)
              </button>
            )}
          </div>
        )}
      </div>

      {rateTarget && (
        <RateSheet
          targetName={rateTarget.name}
          raterGender={profile.gender}
          initial={ratings.data[rateTarget.uid]?.mine ?? null}
          onClose={() => setRateTarget(null)}
          onSubmit={(values) => ratings.save(rateTarget.uid, values)}
        />
      )}

      {showFilters && (
        <FilterSheet
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
          onReset={() => setFilters({ ...base, keyword: filters.keyword, sortBy: filters.sortBy })}
          resultCount={results.length}
        />
      )}
    </div>
  );
}
