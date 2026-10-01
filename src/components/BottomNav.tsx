'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, MessageCircle, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useUnreadChatsCount, useUnreadActivityCount } from '@/lib/useRealTimeFeatures';

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
      style={{ background: 'var(--primary)' }}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();
  const unreadChats = useUnreadChatsCount(user?.uid);
  const unreadActivity = useUnreadActivityCount(user?.uid);

  const badgeFor: Record<string, number> = {
    '/interests': unreadActivity,
    '/chats': unreadChats,
  };

  const tabs = [
    { href: '/discover', label: t('discover'), Icon: Compass },
    { href: '/interests', label: t('interests'), Icon: Heart },
    { href: '/chats', label: t('chats'), Icon: MessageCircle },
    { href: '/profile', label: t('profile'), Icon: User },
  ];
  return (
    <nav
      className="z-30 flex h-[68px] shrink-0 items-center justify-around border-t bg-[var(--tabBg)] pb-2 pt-1.5"
      style={{ borderColor: 'var(--border)' }}
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5">
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: active ? '#FFE4EC' : 'transparent' }}
            >
              <Icon size={18} color={active ? 'var(--primary)' : 'var(--muted2)'} />
              <NavBadge count={badgeFor[href] ?? 0} />
            </span>
            <span className="text-[10px] font-bold" style={{ color: active ? 'var(--primary)' : 'var(--muted2)' }}>
              {label}
            </span>
            <span className="h-[3px] w-8 rounded-full" style={{ background: active ? 'var(--primary)' : 'transparent' }} />
          </Link>
        );
      })}
    </nav>
  );
}