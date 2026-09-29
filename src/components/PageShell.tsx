'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// Shared chrome (back button + scrolling body) for static/informational pages.
export default function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">{title}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[14px] leading-[21px] text-[var(--text)]">{children}</div>
    </div>
  );
}

export const H = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 mt-5 text-[15px] font-extrabold text-[var(--text)]">{children}</p>
);
export const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[var(--muted)]">{children}</p>
);
export const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mb-2 list-disc space-y-1 pl-5 text-[var(--muted)]">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
);
