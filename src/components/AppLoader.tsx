'use client';

// Full-screen branded loader. Uses the sharp /icons/icon-512.png (no stretching),
// a soft pulse and a thin spinner ring so it never looks like a frozen blurry logo.
export default function AppLoader({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-5 bg-[var(--bg)]"
    >
      <div className="relative h-28 w-28">
        <span
          className="absolute inset-0 rounded-full border-4 border-[var(--border)] border-t-[#da3036] animate-spin"
          aria-hidden
        />
        <img
          src="/icons/icon-512.png"
          alt="Indian Shaadi Matrimony"
          width={96}
          height={96}
          decoding="async"
          className="absolute left-1/2 top-1/2 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full object-contain"
          style={{ animation: 'pulse 1.6s ease-in-out infinite' }}
        />
      </div>
      <p className="text-[13px] font-bold text-[var(--muted)]">{label ?? 'Loading…'}</p>
    </div>
  );
}
