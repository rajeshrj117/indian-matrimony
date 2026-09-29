'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { mutualCompatibility, TIER_LABEL, type Compatibility, type Criterion, type MatchTier } from '@/lib/matrimony';
import type { Profile } from '@/lib/types';

const TIER_STYLE: Record<MatchTier, { bg: string; fg: string }> = {
  great: { bg: '#DCFCE7', fg: '#166534' },
  good: { bg: '#FEF3C7', fg: '#92400E' },
  partial: { bg: 'var(--inputBg)', fg: 'var(--muted)' },
};

// Small pill for result cards: "86% mutual match". Renders nothing when there is nothing to compare.
export function CompatibilityBadge({ viewer, profile }: { viewer?: Profile | null; profile: Profile }) {
  if (!viewer || viewer.uid === profile.uid) return null;
  const c = mutualCompatibility(viewer, profile);
  if (c.score === null || !c.tier) return null;
  const st = TIER_STYLE[c.tier];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold"
      style={{ background: st.bg, color: st.fg }}
      title={c.twoWay ? 'How well you both fit each other’s preferences' : 'Based on one side’s preferences only'}
    >
      <Sparkles size={11} />
      {c.score}% {c.twoWay ? 'mutual match' : 'match'}
    </span>
  );
}

function Bar({ title, criteria }: { title: string; criteria: Criterion[] }) {
  const met = criteria.filter((c) => c.ok).length;
  const pct = criteria.length ? (met / criteria.length) * 100 : 0;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-bold text-[var(--text)]">{title}</p>
        <p className="shrink-0 text-[12px] font-extrabold text-[var(--muted)]">
          {criteria.length ? `${met} of ${criteria.length}` : 'No preferences set'}
        </p>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--inputBg)]"
        role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={criteria.length} aria-valuenow={met}
      >
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
      </div>
      {criteria.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {criteria.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-bold"
              style={{
                borderColor: c.ok ? '#86EFAC' : 'var(--border)',
                background: c.ok ? '#F0FDF4' : 'var(--inputBg)',
                color: c.ok ? '#166534' : 'var(--muted)',
              }}
            >
              {c.ok ? <Check size={11} /> : <X size={11} />}
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Full two-way breakdown for the profile page.
export function CompatibilityPanel({ viewer, profile }: { viewer?: Profile | null; profile: Profile }) {
  if (!viewer || viewer.uid === profile.uid) return null;
  const c: Compatibility = mutualCompatibility(viewer, profile);
  if (c.score === null || !c.tier) return null;
  const st = TIER_STYLE[c.tier];
  const first = profile.name.split(' ')[0] || 'They';

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-extrabold text-[var(--text)]">{c.twoWay ? 'Mutual compatibility' : 'Compatibility'}</p>
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold"
            style={{ background: st.bg, color: st.fg }}
          >
            {TIER_LABEL[c.tier]}
          </span>
        </div>
        <p className="text-[32px] font-black leading-none text-[var(--text)]">{c.score}%</p>
      </div>

      <Bar title={`${first} matches what you want`} criteria={c.theyFitYou} />
      <Bar title={`You match what ${first} wants`} criteria={c.youFitThem} />

      {!c.twoWay && (
        <p className="mt-3 text-[12px] leading-4 text-[var(--muted)]">
          {c.theyFitYou.length === 0
            ? `Add your partner preferences to see how well ${first} fits what you’re looking for.`
            : `${first} hasn’t shared partner preferences yet, so this score only reflects what you’re looking for.`}
        </p>
      )}
    </section>
  );
}
