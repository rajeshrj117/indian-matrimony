'use client';

import { useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export type RuleNotice = {
  title: string;
  body: string;
  /** bumps on every violation so the auto-dismiss timer restarts */
  id: number;
};

// Instant, non-blocking alert shown at the top of the chat when a message is refused for
// breaking the texting rules (flirty / romantic / sexual / abusive). Replaces window.alert().
export default function RuleNoticeBanner({ notice, onClose, duration = 8000 }: {
  notice: RuleNotice | null;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [notice, duration, onClose]);

  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-3">
      <div
        role="alert"
        aria-live="assertive"
        className="animate-slide-up pointer-events-auto flex w-full max-w-[440px] items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 shadow-xl"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600">
          <ShieldAlert size={16} color="#fff" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-red-700">{notice.title}</p>
          <p className="mt-0.5 text-xs font-semibold leading-[17px] text-red-900">{notice.body}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100"
        >
          <X size={13} color="#B91C1C" />
        </button>
      </div>
    </div>
  );
}
