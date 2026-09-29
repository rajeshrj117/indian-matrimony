'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, UserX, Download, Trash2, Flag, Loader2, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getBlockedProfiles, unblockUser, exportMyData, deleteMyProfileData, updateLastSeenVisibility, updateOnlyVerifiedCanMessage, updateWomenSafetyMode } from '@/lib/firestore';
import type { Profile } from '@/lib/types';

export default function PrivacyPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, logout } = useAuth();
  const [blocked, setBlocked] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hideLastSeen, setHideLastSeen] = useState(Boolean(profile?.hideLastSeen));
  const [savingLastSeen, setSavingLastSeen] = useState(false);
  const [onlyVerifiedCanMessage, setOnlyVerifiedCanMessage] = useState(Boolean(profile?.onlyVerifiedCanMessage));
  const [savingOnlyVerified, setSavingOnlyVerified] = useState(false);
  const [womenSafetyMode, setWomenSafetyMode] = useState(Boolean(profile?.womenSafetyMode));
  const [savingWomenSafety, setSavingWomenSafety] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local toggle once the profile doc loads
    setOnlyVerifiedCanMessage(Boolean(profile?.onlyVerifiedCanMessage));
  }, [profile?.onlyVerifiedCanMessage]);

  const toggleOnlyVerified = async () => {
    if (!user) return;
    const next = !onlyVerifiedCanMessage;
    setOnlyVerifiedCanMessage(next);
    setSavingOnlyVerified(true);
    try {
      await updateOnlyVerifiedCanMessage(user.uid, next);
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setOnlyVerifiedCanMessage(!next);
    } finally {
      setSavingOnlyVerified(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local toggle once the profile doc loads
    setWomenSafetyMode(Boolean(profile?.womenSafetyMode));
  }, [profile?.womenSafetyMode]);

  const toggleWomenSafety = async () => {
    if (!user) return;
    const next = !womenSafetyMode;
    setWomenSafetyMode(next);
    if (next) setOnlyVerifiedCanMessage(true); // mirrors the force-enable on the server
    setSavingWomenSafety(true);
    try {
      await updateWomenSafetyMode(user.uid, next);
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setWomenSafetyMode(!next);
    } finally {
      setSavingWomenSafety(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local toggle once the profile doc loads
    setHideLastSeen(Boolean(profile?.hideLastSeen));
  }, [profile?.hideLastSeen]);

  const toggleLastSeen = async () => {
    if (!user) return;
    const next = !hideLastSeen;
    setHideLastSeen(next);
    setSavingLastSeen(true);
    try {
      await updateLastSeenVisibility(user.uid, next);
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setHideLastSeen(!next);
    } finally {
      setSavingLastSeen(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const list = await getBlockedProfiles(user.uid);
      if (!cancelled) { setBlocked(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const doUnblock = async (targetUid: string) => {
    if (!user) return;
    setBlocked((prev) => prev.filter((p) => p.uid !== targetUid));
    try {
      await unblockUser(user.uid, targetUid);
      await refreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const downloadData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await exportMyData(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flirty-data-${user.uid}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Could not export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);

    // Deletion now happens entirely on the server (/api/account/delete): profile + private docs,
    // photos and selfies in Storage, likes, matches and every message, notifications, photo
    // hashes, phone/email claims — and finally the Auth user. Firebase requires a recent sign-in;
    // if it's too old the server answers 'reauth-required' and nothing has been touched.
    try {
      await deleteMyProfileData(user.uid);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'reauth-required') {
        alert('For your security, please sign out and sign back in, then try deleting your account again.');
      } else {
        alert('Could not delete your account. Please try again.');
      }
      setDeleting(false);
      return;
    }

    await logout();
    router.replace('/');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Privacy &amp; Safety</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <p className="mb-2 px-1 font-extrabold text-[var(--text)]">Activity status</p>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
            <EyeOff size={16} color="var(--text)" />
          </span>
          <span className="flex-1">
            <p className="font-bold text-[var(--text)]">Hide my last seen</p>
            <p className="text-xs text-[var(--muted)]">Others won&apos;t see when you were last active. You won&apos;t see theirs either.</p>
          </span>
          <button
            onClick={toggleLastSeen}
            disabled={savingLastSeen}
            className="h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-60"
            style={{ background: hideLastSeen ? 'var(--primary)' : 'var(--border)' }}
          >
            <div
              className="h-5 w-5 rounded-full bg-white transition-transform"
              style={{ transform: hideLastSeen ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <p className="mb-2 mt-5 px-1 font-extrabold text-[var(--text)]">Safety</p>

        {profile?.gender === 'Female' && (
          <div className="mb-2.5 rounded-2xl border border-pink-200 bg-pink-50 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                <ShieldAlert size={16} color="#DB2777" />
              </span>
              <span className="flex-1">
                <p className="font-bold text-[var(--text)]">Women Safety Mode</p>
                <p className="text-xs text-[var(--muted)]">Extra filtering built for women, on top of Flirty&apos;s defaults.</p>
              </span>
              <button
                onClick={toggleWomenSafety}
                disabled={savingWomenSafety}
                className="h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-60"
                style={{ background: womenSafetyMode ? '#DB2777' : 'var(--border)' }}
              >
                <div
                  className="h-5 w-5 rounded-full bg-white transition-transform"
                  style={{ transform: womenSafetyMode ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 pl-1 text-xs font-semibold text-[var(--muted)]">
              <li>• Only face-verified people appear in your feed</li>
              <li>• Only verified members can message you (turns on automatically)</li>
              <li>• Thin, low-signal profiles are filtered out more aggressively</li>
            </ul>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
            <ShieldCheck size={16} color="var(--text)" />
          </span>
          <span className="flex-1">
            <p className="font-bold text-[var(--text)]">Only verified users can message me</p>
            <p className="text-xs text-[var(--muted)]">
              {womenSafetyMode
                ? 'On automatically while Women Safety Mode is on.'
                : 'Normally only men need to verify before messaging \u2014 turn this on to require verification from everyone who messages you.'}
            </p>
          </span>
          <button
            onClick={toggleOnlyVerified}
            disabled={savingOnlyVerified || womenSafetyMode}
            className="h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-60"
            style={{ background: onlyVerifiedCanMessage ? 'var(--primary)' : 'var(--border)' }}
          >
            <div
              className="h-5 w-5 rounded-full bg-white transition-transform"
              style={{ transform: onlyVerifiedCanMessage ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <p className="mb-2 mt-5 px-1 font-extrabold text-[var(--text)]">Blocked accounts</p>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {loading ? (
            <p className="p-4 text-sm text-[var(--muted)]">Loading…</p>
          ) : blocked.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <UserX size={24} color="var(--muted2)" />
              <p className="text-sm text-[var(--muted)]">You haven&apos;t blocked anyone.</p>
            </div>
          ) : (
            blocked.map((p, i) => (
              <div
                key={p.uid}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < blocked.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <img src={p.images[0] || 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=200'} className="h-10 w-10 rounded-full object-cover" alt="" />
                <div className="flex-1">
                  <p className="font-bold text-[var(--text)]">{p.name}</p>
                  <p className="text-xs text-[var(--muted)]">{p.location}</p>
                </div>
                <button
                  onClick={() => doUnblock(p.uid)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>

        <p className="mb-2 mt-5 px-1 text-xs text-[var(--muted)]">
          <Flag size={12} className="mb-0.5 mr-1 inline" />
          To report or block someone, open their profile or chat and use the menu (⋮) there.
        </p>

        <p className="mb-2 mt-5 px-1 font-extrabold text-[var(--text)]">Data controls</p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={downloadData}
            disabled={exporting}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 text-left disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
              {exporting ? <Loader2 size={16} className="animate-spin" color="var(--text)" /> : <Download size={16} color="var(--text)" />}
            </span>
            <span>
              <p className="font-bold text-[var(--text)]">Download my data</p>
              <p className="text-xs text-[var(--muted)]">Export your profile, matches &amp; likes as JSON</p>
            </span>
          </button>

          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Trash2 size={16} color="#EF4444" /></span>
            <span>
              <p className="font-bold text-red-700">Delete my account</p>
              <p className="text-xs text-red-600">Permanently removes your profile data</p>
            </span>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-center justify-center bg-black/50 p-6" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="w-full rounded-3xl bg-[var(--card)] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black text-[var(--text)]">Delete your account?</p>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              This removes your profile permanently. This can&apos;t be undone.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl border border-[var(--border)] font-bold text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl bg-red-500 font-bold text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
