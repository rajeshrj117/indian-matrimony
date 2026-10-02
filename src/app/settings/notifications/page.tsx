'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, MessageCircle, Star, BellRing } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { updateNotificationPrefs } from '@/lib/firestore';
import { registerPushToken } from '@/lib/push';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/lib/types';

const ROWS: { key: keyof NotificationPrefs; label: string; sub: string; icon: typeof Heart }[] = [
  { key: 'matches', label: 'New matches', sub: 'When someone matches with you', icon: Heart },
  { key: 'messages', label: 'Messages', sub: 'When you get a new chat message', icon: MessageCircle },
  { key: 'likes', label: 'Likes', sub: 'When someone likes your profile', icon: Star },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(profile?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local toggle state once the profile document loads
    if (profile?.notificationPrefs) setPrefs(profile.notificationPrefs);
  }, [profile?.notificationPrefs]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser API, not derived from props/state
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, []);

  const toggle = async (key: keyof NotificationPrefs) => {
    if (!user) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      await updateNotificationPrefs(user.uid, next);
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const askPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !user) return;
    // registerPushToken() requests permission itself, registers the service worker, and saves
    // the FCM token to this profile — after this, the server can push even when the tab is closed.
    const token = await registerPushToken(user.uid);
    setPermission(Notification.permission);
    if (!token && Notification.permission === 'granted') {
      console.warn('Notification permission granted but no push token was issued — check NEXT_PUBLIC_FIREBASE_VAPID_KEY.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Notifications</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {permission !== 'granted' && permission !== 'unsupported' && (
          <button
            onClick={askPermission}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left"
          >
            <BellRing size={20} color="#2563EB" className="shrink-0" />
            <span>
              <p className="text-sm font-extrabold text-blue-900">Enable browser notifications</p>
              <p className="text-xs text-blue-800">So Indian Shaadi Matrimony can alert you while this tab is open</p>
            </span>
          </button>
        )}

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {ROWS.map((row, i) => (
            <div
              key={row.key}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i < ROWS.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
                <row.icon size={16} color="var(--text)" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[var(--text)]">{row.label}</p>
                <p className="text-xs text-[var(--muted)]">{row.sub}</p>
              </div>
              <button
                onClick={() => toggle(row.key)}
                disabled={saving}
                className="h-6 w-11 rounded-full p-0.5 transition-colors disabled:opacity-60"
                style={{ background: prefs[row.key] ? 'var(--primary)' : 'var(--border)' }}
              >
                <div
                  className="h-5 w-5 rounded-full bg-white transition-transform"
                  style={{ transform: prefs[row.key] ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-3 px-1 text-xs text-[var(--muted)]">
          These control what you get alerted about. Turning one off stops those alerts immediately — you can turn it back on anytime.
        </p>
      </div>
    </div>
  );
}
