'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';
import { LANGUAGES, useI18n } from '@/lib/i18n';

export default function LanguagePage() {
  const router = useRouter();
  const { lang, setLang } = useI18n();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Language</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <p className="mb-3 px-1 text-sm text-[var(--muted)]">Choose the language for menus and screens.</p>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {LANGUAGES.map((l, i) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              style={{ borderBottom: i < LANGUAGES.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="flex-1">
                <p className="font-bold text-[var(--text)]">{l.native}</p>
                <p className="text-xs text-[var(--muted)]">{l.label}</p>
              </div>
              {lang === l.code && <Check size={18} color="var(--primary)" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
