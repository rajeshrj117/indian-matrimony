'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Star, MessageCircle, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { listenActivityNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/firestore';
import type { ActivityNotification } from '@/lib/types';

const ICONS: Record<ActivityNotification['type'], typeof Heart> = {
  like: Heart,
  superlike: Star,
  match: Sparkles,
  message: MessageCircle,
  interest: Heart,
  accepted: UserCheck,
};

const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function describe(n: ActivityNotification): string {
  switch (n.type) {
    case 'like': return `${n.fromUser} liked your profile`;
    case 'superlike': return `${n.fromUser} super liked you!`;
    case 'match': return `You matched with ${n.fromUser} 🎉`;
    case 'message': return `${n.fromUser} sent you a message`;
    case 'interest': return `${n.fromUser} sent you an interest`;
    case 'accepted': return `${n.fromUser} accepted your interest`;
  }
}

function destinationFor(n: ActivityNotification): string {
  if ((n.type === 'match' || n.type === 'message' || n.type === 'accepted') && n.matchId) return `/chat/${n.matchId}`;
  if (n.type === 'like' || n.type === 'superlike' || n.type === 'interest') return '/interests';
  return '/chats';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenActivityNotifications(user.uid, setItems);
    return unsub;
  }, [user]);

  // Clear the bell badge once the person has actually looked at this list.
  useEffect(() => {
    if (!user || items.length === 0) return;
    if (items.every((n) => n.read)) return;
    const t = setTimeout(() => markAllNotificationsAsRead(user.uid).catch(console.error), 1200);
    return () => clearTimeout(t);
  }, [user, items]);

  const openNotification = async (n: ActivityNotification) => {
    if (!n.read && n.id) markNotificationAsRead(n.id).catch(console.error);
    router.push(destinationFor(n));
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
        {items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Sparkles size={28} color="var(--muted2)" />
            <p className="mt-3 font-bold text-[var(--text)]">No notifications yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Likes, matches, and messages will show up here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className="flex items-center gap-3 rounded-2xl border p-3 text-left"
                  style={{
                    borderColor: 'var(--border)',
                    background: n.read ? 'var(--card)' : 'var(--inputBg)',
                  }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--card)]">
                    <Icon size={18} color="var(--primary)" fill={n.type === 'match' ? 'var(--primary)' : 'none'} />
                  </span>
                  <span className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text)]">{describe(n)}</p>
                    <p className="text-xs text-[var(--muted)]">{formatTime(n.createdAt)}</p>
                  </span>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
