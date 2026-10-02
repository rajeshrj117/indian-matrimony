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
          className="absolute inset-0 rounded-full border-4 border-[var(--border)] border-t-[#E0245E] animate-spin"
          aria-hidden
        />
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label="Indian Matrimony"
          className="absolute left-1/2 top-1/2 h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'pulse 1.6s ease-in-out infinite' }}
        >
          <path
            fill="#E0245E"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </div>
      <p className="text-[13px] font-bold text-[var(--muted)]">{label ?? 'Loading…'}</p>
    </div>
  );
}