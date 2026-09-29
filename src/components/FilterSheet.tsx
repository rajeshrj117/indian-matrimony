'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  DIETS, EDUCATION_LEVELS, HEIGHT_MAX_CM, HEIGHT_MIN_CM, INCOME_RANGES, INDIAN_STATES, MARITAL_STATUSES,
  MOTHER_TONGUES, NAKSHATRAS, NO_BAR, NRI_STATUSES, OCCUPATIONS, RELIGIONS, RELOCATION_OPTIONS,
  communityOptions, formatHeight, type SearchFilters,
} from '@/lib/matrimony';

// Manglik search options. "Don't know" is left out: it isn't something anyone searches for.
const MANGLIK_FILTER_OPTIONS = ['Yes', 'No', 'Partial (Anshik)'] as const;

type ListKey = {
  [K in keyof SearchFilters]: SearchFilters[K] extends string[] ? K : never;
}[keyof SearchFilters];

const HEIGHT_OPTIONS: number[] = [];
for (let inch = 53; inch <= 83; inch++) {
  const cm = Math.round(inch * 2.54);
  if (cm >= HEIGHT_MIN_CM && cm <= HEIGHT_MAX_CM) HEIGHT_OPTIONS.push(cm);
}
if (HEIGHT_OPTIONS[0] !== HEIGHT_MIN_CM) HEIGHT_OPTIONS.unshift(HEIGHT_MIN_CM);
if (HEIGHT_OPTIONS[HEIGHT_OPTIONS.length - 1] !== HEIGHT_MAX_CM) HEIGHT_OPTIONS.push(HEIGHT_MAX_CM);

const AGES = Array.from({ length: 53 }, (_, i) => i + 18); // 18..70

const selectCls =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-[14px] font-semibold text-[var(--text)] outline-none';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--border)] py-4 last:border-none">
      <h4 className="mb-2.5 text-[14px] font-extrabold text-[var(--text)]">{title}</h4>
      {children}
    </section>
  );
}

function Chips({ options, selected, onToggle }: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            aria-pressed={on}
            className="rounded-full border px-3.5 py-2 text-[13px] font-bold"
            style={{
              background: on ? 'var(--primary)' : 'var(--card)',
              borderColor: on ? 'var(--primary)' : 'var(--border)',
              color: on ? '#fff' : 'var(--text)',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// For long option lists (states, languages): pick from a dropdown, selected values become removable chips.
function MultiPick({ label, options, selected, onChange, searchable = false }: {
  label: string; options: readonly string[]; selected: string[]; onChange: (v: string[]) => void; searchable?: boolean;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const remaining = options.filter((o) => !selected.includes(o) && (!q || o.toLowerCase().includes(q)));
  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((v) => (
            <button
              key={v}
              onClick={() => onChange(selected.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-[13px] font-bold text-white"
            >
              {v} <X size={13} />
            </button>
          ))}
        </div>
      )}
      {searchable && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-label={`Search ${label.toLowerCase()}`}
          className={`${selectCls} mb-2`}
        />
      )}
      <select
        className={selectCls}
        value=""
        aria-label={label}
        onChange={(e) => { if (e.target.value) { onChange([...selected, e.target.value]); setQuery(''); } }}
      >
        <option value="">
          {q && remaining.length === 0 ? 'No matches' : selected.length ? 'Add another…' : `Any ${label.toLowerCase()}`}
        </option>
        {remaining.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between py-1.5 text-left"
    >
      <span className="text-[14px] font-semibold text-[var(--text)]">{label}</span>
      <span className="relative h-6 w-11 rounded-full transition-colors" style={{ background: on ? 'var(--primary)' : 'var(--border)' }}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
      </span>
    </button>
  );
}

export default function FilterSheet({
  value, onChange, onClose, onReset, resultCount,
}: {
  value: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onClose: () => void;
  onReset: () => void;
  resultCount: number;
}) {
  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => onChange({ ...value, [k]: v });
  const toggle = (k: ListKey) => (v: string) =>
    set(k, value[k].includes(v) ? value[k].filter((x) => x !== v) : [...value[k], v]);

  // Community suggestions follow the religions picked above (all of them if none), with "No bar" first.
  const communityChoices = Array.from(
    new Set(value.religion.length ? value.religion.flatMap((r) => communityOptions(r)) : communityOptions()),
  );
  const noBar = value.community.includes(NO_BAR);
  // "No bar" means the community doesn't matter, so it replaces any specific picks and vice versa.
  const setCommunity = (next: string[]) => {
    const added = next.find((c) => !value.community.includes(c));
    if (added === NO_BAR) set('community', [NO_BAR]);
    else set('community', next.filter((c) => c !== NO_BAR));
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Search filters"
        className="flex max-h-[88vh] w-full animate-slide-up flex-col rounded-t-[28px] bg-[var(--card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
          <div className="flex items-center justify-between">
            <h3 className="text-[20px] font-black text-[var(--text)]">Filters</h3>
            <div className="flex items-center gap-3">
              <button onClick={onReset} className="text-[13px] font-extrabold text-[var(--primary)]">Reset</button>
              <button onClick={onClose} aria-label="Close filters" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--inputBg)]">
                <X size={16} color="var(--text)" />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <Section title="Age">
            <div className="flex items-center gap-3">
              <select className={selectCls} aria-label="Minimum age" value={value.ageMin}
                onChange={(e) => { const v = Number(e.target.value); onChange({ ...value, ageMin: v, ageMax: Math.max(value.ageMax, v) }); }}>
                {AGES.map((a) => <option key={a} value={a}>{a} years</option>)}
              </select>
              <span className="text-[var(--muted)]">to</span>
              <select className={selectCls} aria-label="Maximum age" value={value.ageMax}
                onChange={(e) => { const v = Number(e.target.value); onChange({ ...value, ageMax: v, ageMin: Math.min(value.ageMin, v) }); }}>
                {AGES.map((a) => <option key={a} value={a}>{a} years</option>)}
              </select>
            </div>
          </Section>

          <Section title="Height">
            <div className="flex items-center gap-3">
              <select className={selectCls} aria-label="Minimum height" value={value.heightMin}
                onChange={(e) => { const v = Number(e.target.value); onChange({ ...value, heightMin: v, heightMax: Math.max(value.heightMax, v) }); }}>
                {HEIGHT_OPTIONS.map((h) => <option key={h} value={h}>{formatHeight(h)}</option>)}
              </select>
              <span className="text-[var(--muted)]">to</span>
              <select className={selectCls} aria-label="Maximum height" value={value.heightMax}
                onChange={(e) => { const v = Number(e.target.value); onChange({ ...value, heightMax: v, heightMin: Math.min(value.heightMin, v) }); }}>
                {HEIGHT_OPTIONS.map((h) => <option key={h} value={h}>{formatHeight(h)}</option>)}
              </select>
            </div>
          </Section>

          <Section title="Marital status">
            <Chips options={MARITAL_STATUSES} selected={value.maritalStatus} onToggle={toggle('maritalStatus')} />
          </Section>

          <Section title="Religion">
            <MultiPick label="Religion" options={RELIGIONS} selected={value.religion} onChange={(v) => set('religion', v)} />
          </Section>

          <Section title="Community / caste">
            <MultiPick label="Community" options={communityChoices} selected={value.community} onChange={setCommunity} searchable />
            {noBar && (
              <p className="mt-2 text-[12px] font-semibold text-[var(--muted)]">
                No bar: profiles from any community will be shown. Pick a community to narrow it down.
              </p>
            )}
          </Section>

          <Section title="Mother tongue">
            <MultiPick label="Mother tongue" options={MOTHER_TONGUES} selected={value.motherTongue} onChange={(v) => set('motherTongue', v)} />
          </Section>

          <Section title="Lives in (state)">
            <MultiPick label="State" options={INDIAN_STATES} selected={value.state} onChange={(v) => set('state', v)} />
          </Section>

          <Section title="Education">
            <MultiPick label="Education" options={EDUCATION_LEVELS} selected={value.education} onChange={(v) => set('education', v)} />
          </Section>

          <Section title="Occupation">
            <MultiPick label="Occupation" options={OCCUPATIONS} selected={value.occupation} onChange={(v) => set('occupation', v)} />
          </Section>

          <Section title="Annual income">
            <Chips options={INCOME_RANGES} selected={value.annualIncome} onToggle={toggle('annualIncome')} />
          </Section>

          <Section title="Diet">
            <Chips options={DIETS} selected={value.diet} onToggle={toggle('diet')} />
          </Section>

          <Section title="Residency status">
            <Chips options={NRI_STATUSES} selected={value.nriStatus} onToggle={toggle('nriStatus')} />
          </Section>

          <Section title="Willing to relocate">
            <Chips options={RELOCATION_OPTIONS} selected={value.willingToRelocate} onToggle={toggle('willingToRelocate')} />
          </Section>

          <Section title="Manglik">
            <Chips options={MANGLIK_FILTER_OPTIONS} selected={value.manglik} onToggle={toggle('manglik')} />
          </Section>

          <Section title="Star (nakshatra)">
            <MultiPick label="Star" options={NAKSHATRAS} selected={value.star} onChange={(v) => set('star', v)} />
          </Section>

          <Section title="Compatibility">
            <Toggle label="Mutual matches only (60%+)" on={value.mutualOnly} onChange={(v) => set('mutualOnly', v)} />
          </Section>

          <Section title="Profile quality">
            <Toggle label="Verified profiles only" on={value.verifiedOnly} onChange={(v) => set('verifiedOnly', v)} />
            <Toggle label="With photo only" on={value.withPhotoOnly} onChange={(v) => set('withPhotoOnly', v)} />
          </Section>
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <button onClick={onClose} className="h-[52px] w-full rounded-2xl bg-[var(--text)] font-extrabold text-[var(--card)]">
            Show {resultCount} {resultCount === 1 ? 'profile' : 'profiles'}
          </button>
        </div>
      </div>
    </div>
  );
}
