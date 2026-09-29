'use client';

import { partnerPreferenceRows, profileDetailGroups } from '@/lib/matrimony';
import { CompatibilityPanel } from '@/components/Compatibility';
import type { Profile } from '@/lib/types';

function Card({ title, rows }: { title: string; rows: { k: string; v: string }[] }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="font-extrabold text-[var(--text)]">{title}</p>
      <dl className="mt-2">
        {rows.map((row) => (
          <div key={row.k} className="flex justify-between gap-4 border-b border-[var(--border)] py-2 last:border-none">
            <dt className="shrink-0 font-semibold text-[var(--muted)]">{row.k}</dt>
            <dd className="text-right font-bold text-[var(--text)]">{row.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Every matrimony section of a profile, plus the two-way compatibility breakdown with the viewer.
export default function ProfileDetails({
  profile, viewer, showPrivate = false,
}: { profile: Profile; viewer?: Profile | null; showPrivate?: boolean }) {
  const groups = profileDetailGroups(profile, { showPrivate });
  const prefRows = partnerPreferenceRows(profile.partnerPreferences);

  return (
    <>
      <CompatibilityPanel viewer={viewer} profile={profile} />
      {groups.map((g) => <Card key={g.title} title={g.title} rows={g.rows} />)}
      {prefRows.length > 0 && <Card title={`Looking for in a partner`} rows={prefRows} />}
    </>
  );
}
