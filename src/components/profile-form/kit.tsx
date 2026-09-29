'use client';

import { X } from 'lucide-react';

export const inputCls =
  'h-[50px] w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-[15px] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted2)]';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{label}</label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted2)]">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[24px] font-black leading-7 text-[var(--text)]">{title}</h2>
      {sub && <p className="mt-1.5 text-[14px] leading-5 text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

// Single choice as tappable pills. Tapping the active one clears it unless `required`.
export function Chips({
  options, value, onChange, required = false,
}: { options: readonly string[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on && !required ? '' : o)}
            className="rounded-full border px-4 py-2.5 text-[14px] font-bold transition-colors"
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

// Single choice from a long list.
export function Select({
  value, onChange, options, placeholder = 'Select', ariaLabel,
}: { value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; ariaLabel?: string }) {
  return (
    <select className={inputCls} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Multiple choice from a long list: chosen values become removable chips above the dropdown.
export function MultiSelect({
  options, selected, onChange, placeholder = 'Any', ariaLabel,
}: { options: readonly string[]; selected: string[]; onChange: (v: string[]) => void; placeholder?: string; ariaLabel?: string }) {
  const remaining = options.filter((o) => !selected.includes(o));
  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(selected.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-[13px] font-bold text-white"
            >
              {v} <X size={13} />
            </button>
          ))}
        </div>
      )}
      <select
        className={inputCls}
        value=""
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => { if (e.target.value) onChange([...selected, e.target.value]); }}
      >
        <option value="">{selected.length ? 'Add another…' : placeholder}</option>
        {remaining.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// Multiple choice from a short list, shown as pills.
export function MultiChips({
  options, selected, onChange,
}: { options: readonly string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
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

// Two side-by-side selects for a range (age, height).
export function RangeSelect({
  from, to, onFrom, onTo, options, format, anyLabel = 'Any', ariaLabel,
}: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void;
  options: number[]; format: (n: number) => string; anyLabel?: string; ariaLabel: string;
}) {
  const cls = `${inputCls} !h-[46px] !text-[14px]`;
  return (
    <div className="flex items-center gap-2.5">
      <select className={cls} aria-label={`${ariaLabel} from`} value={from} onChange={(e) => onFrom(e.target.value)}>
        <option value="">{anyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
      <span className="text-[var(--muted)]">to</span>
      <select className={cls} aria-label={`${ariaLabel} to`} value={to} onChange={(e) => onTo(e.target.value)}>
        <option value="">{anyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </div>
  );
}

export function NumberSelect({
  value, onChange, max = 10, ariaLabel,
}: { value: string; onChange: (v: string) => void; max?: number; ariaLabel: string }) {
  return (
    <select className={inputCls} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select</option>
      {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'None' : i}</option>)}
    </select>
  );
}
