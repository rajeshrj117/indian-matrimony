'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useMessageDelivery } from '@/lib/useRealTimeFeatures';
import { listenForegroundPush, type ForegroundPush } from '@/lib/push';

// Mounted once near the root (inside AuthProvider) so these effects run app-wide, on every
// screen — not just while a particular chat is open.
export default function AppRealtime() {
  const { user } = useAuth();
  const router = useRouter();
  const [toast, setToast] = useState<ForegroundPush | null>(null);

  // Marks incoming messages "delivered" the instant this device sees them, regardless of screen.
  useMessageDelivery(user?.uid);

  // Shows an in-app banner for pushes that arrive while the tab is focused (FCM doesn't surface
  // a system notification in that case — background/closed-tab pushes are handled by the
  // service worker instead, see /firebase-messaging-sw.js).
  useEffect(() => {
    if (!user) return;
    let unsub = () => {};
    listenForegroundPush((payload) => setToast(payload)).then((fn) => { unsub = fn; });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="fixed left-1/2 top-3 z-[100] w-[92%] max-w-[440px] -translate-x-1/2 cursor-pointer rounded-2xl border p-3 shadow-lg"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      onClick={() => {
        if (toast.url) router.push(toast.url);
        setToast(null);
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-sm font-extrabold text-[var(--text)]">{toast.title}</p>
          <p className="text-xs text-[var(--muted)]">{toast.body}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setToast(null); }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--inputBg)]"
        >
          <X size={12} color="var(--muted)" />
        </button>
      </div>
    </div>
  );
}
