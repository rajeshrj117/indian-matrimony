'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, CheckCircle2, Edit3, Eye, Moon, ShieldCheck, Lock, Bell, Globe, HelpCircle, ChevronRight, HeartHandshake, Camera, AlertCircle, Settings, Sparkles, Plus, Trash2, Loader2, UserPen,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { useI18n, LANGUAGES } from '@/lib/i18n';
import { saveProfile, uploadProfilePhoto, PhotoPolicyError, ContentPolicyError } from '@/lib/firestore';
import { authedFetch } from '@/lib/api-client';
import { profileCompleteness } from '@/lib/matrimony';
import PhotoLightbox from '@/components/PhotoLightbox';
import ProfileDetails from '@/components/ProfileDetails';

const MAX_PHOTOS = 6;

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, toggle } = useTheme();
  const { t, lang } = useI18n();
  const { user, profile, refreshProfile, logout } = useAuth();

  const languageLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? 'English';

  const SETTINGS = [
    { key: 'dark', icon: Moon, label: t('darkMode'), type: 'switch' as const },
    {
      key: 'verification',
      icon: ShieldCheck,
      label: t('verification'),
      sub: profile?.verificationStatus === 'verified' || profile?.verified
        ? 'Verified'
        : profile?.verificationStatus === 'pending'
          ? 'Under review…'
          : t('verificationSub'),
      type: 'arrow' as const,
      href: '/settings/verification',
    },
    { key: 'privacy', icon: Lock, label: t('privacy'), sub: t('privacySub'), type: 'arrow' as const, href: '/settings/privacy' },
    { key: 'notifications', icon: Bell, label: t('notifications'), sub: t('notificationsSub'), type: 'arrow' as const, href: '/settings/notifications' },
    { key: 'language', icon: Globe, label: t('language'), sub: languageLabel, type: 'arrow' as const, href: '/settings/language' },
    { key: 'help', icon: HelpCircle, label: t('help'), sub: t('helpSub'), type: 'arrow' as const, href: '/settings/help' },
  ];
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const doLogout = async () => {
    await logout();
    router.replace('/');
  };

  const startEditing = () => {
    setBioDraft(profile?.bio ?? '');
    setEnhanceError('');
    setEditing(true);
  };

  const enhanceBio = async () => {
    if (!bioDraft.trim()) return;
    setEnhancing(true);
    setEnhanceError('');
    try {
      const res = await authedFetch('/api/groq/bio', { bio: bioDraft, interests: profile?.interests ?? [], job: profile?.job ?? '' });
      const data = await res.json();
      if (data.bio) {
        setBioDraft(data.bio);
      } else {
        setEnhanceError(data.error || 'AI enhancement failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setEnhanceError('AI enhancement failed. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const saveBio = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, { bio: bioDraft });
      await refreshProfile();
      setEditing(false);
    } catch (err) {
      console.error(err);
      if (err instanceof ContentPolicyError) alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSaving(true);
    try {
      const url = await uploadProfilePhoto(user.uid, file, profile?.gender);
      await saveProfile(user.uid, { images: [url, ...(profile?.images.filter((i) => i !== url) ?? [])] });
      await refreshProfile();
    } catch (err) {
      console.error(err);
      if (err instanceof PhotoPolicyError) alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Adds an extra photo to the grid (slot 2-6). Unlike onPickPhoto above, this appends
  // instead of replacing the primary photo.
  const onAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    const current = profile?.images ?? [];
    if (current.length >= MAX_PHOTOS) return;
    setSaving(true);
    try {
      const url = await uploadProfilePhoto(user.uid, file, profile?.gender);
      await saveProfile(user.uid, { images: [...current.filter((i) => i !== url), url] });
      await refreshProfile();
    } catch (err) {
      console.error(err);
      if (err instanceof PhotoPolicyError) alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDeletePhoto = async (index: number) => {
    if (!user || !profile) return;
    if (profile.images.length <= 1) {
      alert('You need at least one photo on your profile.');
      return;
    }
    setDeletingIndex(index);
    try {
      await saveProfile(user.uid, { images: profile.images.filter((_, i) => i !== index) });
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingIndex(null);
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[var(--muted)]">Loading profile…</p>
      </div>
    );
  }

  const completeness = profileCompleteness(profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-2.5">
        <h1 className="text-[22px] font-black text-[var(--text)]">{t('profile')}</h1>
        <div className="flex gap-2.5">
          <button onClick={() => router.push('/settings')} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
            <Settings size={18} color="var(--text)" />
          </button>
          <button onClick={doLogout} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
            <LogOut size={18} color="var(--text)" />
          </button>
        </div>
      </div>

      <div className="pb-24">
        <div className="flex flex-col items-center px-4 pt-2.5">
          <div className="relative">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
            <img
              src={profile.images[0] || 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=400'}
              className="h-[110px] w-[110px] rounded-full border-[3px] border-[var(--card)] object-cover"
              alt=""
              onClick={() => profile.images[0] && setLightboxIndex(0)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg)] bg-[var(--primary)]"
            >
              <Camera size={14} color="#fff" />
            </button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[22px] font-black text-[var(--text)]">
            {profile.name} • {profile.age} {profile.verified && <CheckCircle2 size={18} color="#3B82F6" />}
          </p>
          <p className="text-[13px] text-[var(--muted)]">
            {[profile.location, profile.occupation || profile.job].filter(Boolean).join(' • ') || 'Add your details'} • {profile.verified ? 'Verified' : 'Not verified'}
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => router.push('/settings/matrimony')} className="grad-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold text-white">
              <UserPen size={14} /> Edit profile
            </button>
            <button onClick={() => router.push('/matrimony-tools')} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[13px] font-extrabold text-[var(--text)]"><Sparkles size={14} /> Matrimony tools</button>
            <button onClick={() => router.push(`/user/${profile.uid}`)} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[13px] font-extrabold text-[var(--text)]">
              <Eye size={14} /> {t('preview')}
            </button>
          </div>
        </div>

        <div className="mt-5 px-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-[var(--text)]">Profile completeness</p>
              <span className="text-sm font-black" style={{ color: completeness.percent === 100 ? 'var(--success)' : 'var(--primary)' }}>{completeness.percent}%</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--inputBg)]"
              role="progressbar"
              aria-label="Profile completeness"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${completeness.percent}%` }} />
            </div>
            {completeness.missing.length > 0 ? (
              <>
                <p className="mt-2.5 text-xs text-[var(--muted)]">Complete profiles get more responses. Still missing:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {completeness.missing.map((m) => (
                    <button
                      key={m}
                      onClick={() => router.push(m === 'Verification' ? '/settings/verification' : m === 'Photo' ? '/profile' : '/settings/matrimony')}
                      className="rounded-full border border-dashed border-[var(--border)] bg-[var(--inputBg)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]"
                    >
                      + {m}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2.5 text-xs font-semibold text-[var(--success)]">Your profile is complete.</p>
            )}
          </div>
        </div>

        <div className="mt-5 px-4">
          <input ref={addPhotoInputRef} type="file" accept="image/*" onChange={onAddPhoto} className="hidden" />
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-extrabold text-[var(--text)]">Photos</p>
            <span className="text-xs font-bold text-[var(--muted)]">{profile.images.length}/{MAX_PHOTOS}</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {profile.images.map((img, i) => (
              <div key={img + i} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]">
                <img
                  src={img}
                  className="h-full w-full object-cover"
                  alt=""
                  onClick={() => setLightboxIndex(i)}
                />
                <button
                  onClick={() => onDeletePhoto(i)}
                  disabled={deletingIndex !== null}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 disabled:opacity-60"
                >
                  {deletingIndex === i ? <Loader2 size={12} color="#fff" className="animate-spin" /> : <Trash2 size={12} color="#fff" />}
                </button>
              </div>
            ))}
            {profile.images.length < MAX_PHOTOS && (
              <button
                onClick={() => addPhotoInputRef.current?.click()}
                disabled={saving}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border)] bg-[var(--inputBg)] disabled:opacity-60"
              >
                {saving ? <Loader2 size={18} color="var(--muted)" className="animate-spin" /> : <Plus size={18} color="var(--muted)" />}
                <span className="text-[11px] font-bold text-[var(--muted)]">Add</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 px-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-[var(--text)]">{t('aboutMe')}</p>
              {!editing && (
                <button onClick={startEditing} className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--primary)]">
                  <Edit3 size={13} /> {t('editBio')}
                </button>
              )}
            </div>
            {editing ? (
              <div className="mt-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--muted2)]">{bioDraft.length}/150</span>
                  <button
                    onClick={enhanceBio}
                    disabled={!bioDraft.trim() || enhancing}
                    className="flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {enhancing ? 'Enhancing…' : 'AI Enhance'}
                  </button>
                </div>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value.slice(0, 150))}
                  className="mt-1.5 h-24 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--inputBg)] p-2.5 text-sm text-[var(--text)] outline-none"
                />
                {enhanceError && (
                  <div className="mt-2 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
                    <AlertCircle size={14} color="#DC2626" className="mt-0.5 shrink-0" />
                    <p className="flex-1 text-xs font-semibold leading-[16px] text-red-700">{enhanceError}</p>
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button onClick={saveBio} disabled={saving} className="h-9 flex-1 rounded-xl bg-[var(--primary)] text-sm font-bold text-white disabled:opacity-60">
                    {saving ? 'Saving…' : t('save')}
                  </button>
                  <button onClick={() => setEditing(false)} className="h-9 flex-1 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)]">
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">{profile.bio || 'Write a few lines about yourself and your family so the right people get to know you.'}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(profile.interests ?? []).map((i) => (
                <span key={i} className="rounded-full border border-[var(--border)] bg-[var(--inputBg)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">{i}</span>
              ))}
            </div>
          </div>

          <ProfileDetails profile={profile} showPrivate />

          <button
            onClick={() => router.push('/settings/matrimony')}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-sm font-extrabold text-[var(--primary)]"
          >
            <Edit3 size={15} /> Edit details &amp; partner preferences
          </button>

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {SETTINGS.map((item, i) => (
              <div
                key={item.key}
                onClick={item.type === 'arrow' ? () => router.push(item.href) : undefined}
                className={`flex items-center gap-3 px-4 py-3.5 ${item.type === 'arrow' ? 'cursor-pointer' : ''}`}
                style={{ borderBottom: i < SETTINGS.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
                  <item.icon size={16} color="var(--text)" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-[var(--text)]">{item.label}</p>
                    {item.key === 'verification' && (profile.verificationStatus === 'verified' || profile.verified) && (
                      <CheckCircle2 size={14} color="#3B82F6" />
                    )}
                  </div>
                  {'sub' in item && item.sub && <p className="text-xs text-[var(--muted)]">{item.sub}</p>}
                </div>
                {item.type === 'switch' ? (
                  <button
                    onClick={toggle}
                    className="h-6 w-11 rounded-full p-0.5 transition-colors"
                    style={{ background: isDark ? 'var(--primary)' : 'var(--border)' }}
                  >
                    <div className="h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: isDark ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                ) : (
                  <ChevronRight size={16} color="var(--muted2)" />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/premium')}
            className="flex gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-left"
          >
            <HeartHandshake size={24} color="var(--primary)" className="shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-extrabold text-rose-800">{t('premiumTitle')}</p>
              {profile.premium ? (
                <p className="mt-0.5 text-xs leading-4 text-rose-800">
                  You&apos;re a premium member{profile.premiumExpiresAt ? ` until ${new Date(profile.premiumExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}. Tap to manage.
                </p>
              ) : (
                <>
                  <p className="mt-0.5 text-xs leading-4 text-rose-800">{t('premiumSub')}</p>
                  <span className="mt-2 inline-block rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-xs font-extrabold text-white">{t('upgrade')} • ₹299/mo</span>
                </>
              )}
            </div>
          </button>

          <button
            onClick={doLogout}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-[var(--card)] font-bold text-red-500"
          >
            <LogOut size={18} /> {t('logout')}
          </button>

          <p className="mt-1 text-center text-[11px] text-[var(--muted2)]">{t('madeWithLove')}</p>
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox images={profile.images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
