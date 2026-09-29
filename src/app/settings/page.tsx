'use client';

import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Moon, HeartHandshake, ShieldCheck, ShieldAlert, Lock, Bell, Globe, HelpCircle, LogOut, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { useI18n, LANGUAGES } from '@/lib/i18n';

export default function SettingsHubScreen() {
  const router = useRouter();
  const { isDark, toggle } = useTheme();
  const { t, lang } = useI18n();
  const { profile, logout } = useAuth();

  const languageLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? 'English';

  const ITEMS = [
    { key: 'matrimony', icon: HeartHandshake, label: 'Marriage profile', sub: 'Height, religion, community, education, family', href: '/settings/matrimony' },
    {
      key: 'verification',
      icon: ShieldCheck,
      label: t('verification'),
      sub: profile?.verificationStatus === 'verified' || profile?.verified
        ? 'Verified'
        : profile?.verificationStatus === 'pending'
          ? 'Under review…'
          : t('verificationSub'),
      href: '/settings/verification',
      badge: profile?.verificationStatus === 'verified' || profile?.verified,
    },
    { key: 'safety', icon: ShieldAlert, label: 'Safety Center', sub: 'Tips, helplines & how verification works', href: '/settings/safety' },
    { key: 'privacy', icon: Lock, label: t('privacy'), sub: t('privacySub'), href: '/settings/privacy' },
    { key: 'notifications', icon: Bell, label: t('notifications'), sub: t('notificationsSub'), href: '/settings/notifications' },
    { key: 'language', icon: Globe, label: t('language'), sub: languageLabel, href: '/settings/language' },
    { key: 'help', icon: HelpCircle, label: t('help'), sub: t('helpSub'), href: '/settings/help' },
  ];

  const doLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Settings</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
              <Moon size={16} color="var(--text)" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[var(--text)]">{t('darkMode')}</p>
            </div>
            <button
              onClick={toggle}
              className="h-6 w-11 rounded-full p-0.5 transition-colors"
              style={{ background: isDark ? 'var(--primary)' : 'var(--border)' }}
            >
              <div className="h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: isDark ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {ITEMS.map((item, i) => (
            <div
              key={item.key}
              onClick={() => router.push(item.href)}
              className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i < ITEMS.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
                <item.icon size={16} color="var(--text)" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-[var(--text)]">{item.label}</p>
                  {item.badge && <CheckCircle2 size={14} color="#3B82F6" />}
                </div>
                {item.sub && <p className="text-xs text-[var(--muted)]">{item.sub}</p>}
              </div>
              <ChevronRight size={16} color="var(--muted2)" />
            </div>
          ))}
        </div>

        <button
          onClick={doLogout}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-[var(--card)] font-bold text-red-500"
        >
          <LogOut size={18} /> {t('logout')}
        </button>

        <p className="mt-4 text-center text-[11px] text-[var(--muted2)]">{t('madeWithLove')}</p>
      </div>
    </div>
  );
}
