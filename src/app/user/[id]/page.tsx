'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Flag, MapPin, Briefcase, GraduationCap, Heart, Bookmark, MessageCircle, ShieldCheck, Ban, Check, Loader2, Expand } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  getProfile, blockUser, reportUser, isBlockedEitherWay,
  getRatingSummary, getMyRatingFor, submitRating,
  listenInterestStates, listenShortlist, recordProfileView, type InterestState,
} from '@/lib/firestore';
import { shareOrCopy } from '@/lib/share';
import { useInterestActions } from '@/lib/useInterestActions';
import { APP_NAME } from '@/lib/brand';
import { communityLine, factsLine } from '@/lib/matrimony';
import ProfileDetails from '@/components/ProfileDetails';
import Toast from '@/components/Toast';
import type { Profile, ReportReason, RatingDoc, RatingSummary } from '@/lib/types';
import PhotoLightbox from '@/components/PhotoLightbox';
import { VerifiedPill, PremiumPill, NameCheckmark, VerifiedTrustStrip } from '@/components/VerifiedBadges';
import Phase3Actions from '@/components/Phase3Actions';
import { TrustRatingStrip, RateSheet } from '@/components/TrustRating';

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'fake_profile', label: 'Fake profile' },
  { id: 'inappropriate', label: 'Inappropriate photos or bio' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'underage', label: 'Underage user' },
  { id: 'other', label: 'Something else' },
];

export default function UserDetailScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const actions = useInterestActions();
  const [interest, setInterest] = useState<InterestState>({ state: 'none' });
  const [shortlisted, setShortlisted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [myRating, setMyRating] = useState<RatingDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile(id).then((p) => { if (!cancelled) setProfile(p); });
    getRatingSummary(id).then((s) => { if (!cancelled) setRatingSummary(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Tell the other person you looked at their profile (shows up in their "Viewed you" tab).
  useEffect(() => {
    if (!user || user.uid === id) return;
    recordProfileView(user.uid, id).catch(() => {});
  }, [user, id]);

  useEffect(() => {
    if (!user || user.uid === id) return;
    const u1 = listenInterestStates(user.uid, (map) => setInterest(map[id] ?? { state: 'none' }));
    const u2 = listenShortlist(user.uid, (items) => setShortlisted(items.some((i) => i.target === id)));
    return () => { u1(); u2(); };
  }, [user, id]);

  const openRateSheet = async () => {
    if (!user) return;
    const existing = await getMyRatingFor(user.uid, id).catch(() => null);
    setMyRating(existing);
    setShowRateSheet(true);
  };

  const isSelf = user?.uid === id;
  // Persisted block state (either direction) — distinct from the transient `blocked`
  // flag above, which only tracks "I just blocked them from this screen" for the
  // confirmation toast. This one gates the actions on every render, including on a
  // fresh page load / direct link, not just right after clicking Block.
  const isBlocked = isBlockedEitherWay(myProfile, profile);

  const share = async () => {
    if (!profile || sharing) return;
    setSharing(true);
    try {
      const url = `${window.location.origin}/user/${profile.uid}`;
      const result = await shareOrCopy({
        title: `${profile.name} on ${APP_NAME}`,
        text: `Check out ${profile.name}'s profile on ${APP_NAME}`,
        url,
      });
      let message = '';
      if (result === 'copied') {
        message = 'Profile link copied to clipboard';
      } else if (result === 'failed') {
        message = "Couldn't share — try copying the link from your browser's address bar.";
      }
      // 'shared' and 'cancelled' need no message — the native sheet already gave feedback.
      if (message) {
        setShareToast(message);
        setTimeout(() => setShareToast(''), 2500);
      }
    } finally {
      setSharing(false);
    }
  };

  const doBlock = async () => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      await blockUser(user.uid, profile.uid);
      setBlocked(true);
      await refreshProfile();
      setTimeout(() => router.back(), 900);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const chooseReportReason = (reason: ReportReason) => {
    setReportReason(reason);
    setReportError('');
  };

  const submitReport = async () => {
    if (!user || !profile || !reportReason) return;
    setBusy(true);
    setReportError('');
    try {
      await reportUser(user.uid, profile.uid, reportReason, reportDetails.trim());
      setReportSent(true);
      setTimeout(() => {
        setShowReport(false);
        setShowMenu(false);
        setReportSent(false);
        setReportReason(null);
        setReportDetails('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setReportError('Could not submit your report. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[var(--muted)]">Loading profile…</p>
      </div>
    );
  }

  const photos = profile.images.length > 0
    ? profile.images
    : ['https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=400'];
  const photo = photos[Math.min(photoIndex, photos.length - 1)];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {shareToast && (
        <div className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-[440px] items-center justify-center rounded-xl bg-neutral-900/90 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg">
          {shareToast}
        </div>
      )}
      <Toast message={actions.toast} />
      <div className="flex-1 min-h-0 overflow-y-auto pb-24">
        <div className="relative h-[58vh] min-h-[340px]">
          <img src={photo} className="h-full w-full object-cover" alt="" onClick={() => setShowLightbox(true)} />
          <div className="absolute inset-x-0 bottom-0 h-[200px]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />

          {photos.length > 1 && (
            <>
              <div className="absolute inset-x-3 top-2 flex gap-1.5">
                {photos.map((p, i) => (
                  <span key={p + i} className="h-1 flex-1 rounded-full" style={{ background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.35)' }} />
                ))}
              </div>
              <button
                aria-label="Previous photo"
                onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute inset-y-0 left-0 w-1/3"
              />
              <button
                aria-label="Next photo"
                onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                className="absolute inset-y-0 right-0 w-1/3"
              />
            </>
          )}

          <div className={`absolute inset-x-4 flex justify-between ${photos.length > 1 ? 'top-7' : 'top-3'}`}>
            <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40">
              <ArrowLeft size={18} color="#fff" />
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowLightbox(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40">
                <Expand size={16} color="#fff" />
              </button>
              <button onClick={share} disabled={sharing} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 disabled:opacity-60">
                {sharing ? <Loader2 size={16} color="#fff" className="animate-spin" /> : <Share2 size={16} color="#fff" />}
              </button>
              {!isSelf && (
                <button onClick={() => setShowMenu(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40"><Flag size={16} color="#fff" /></button>
              )}
            </div>
          </div>

          {(profile.verified || profile.premium) && (
            <div className={`absolute inset-x-4 flex justify-between ${photos.length > 1 ? 'top-[4.25rem]' : 'top-14'}`}>
              <div>{profile.verified && <VerifiedPill />}</div>
              <div>{profile.premium && <PremiumPill />}</div>
            </div>
          )}

          <div className="absolute inset-x-4 bottom-4">
            <div className="flex items-center gap-2">
              <span className="text-[28px] font-black text-white">{profile.name} • {profile.age}</span>
              {profile.verified && <NameCheckmark size={24} />}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-white/30 bg-white/18 px-2.5 py-1.5 text-xs font-bold text-white">
                <MapPin size={12} /> {profile.location}
              </span>
              <span className="rounded-full px-2.5 py-1.5 text-xs font-bold text-white" style={{ background: profile.online ? 'var(--success)' : 'rgba(255,255,255,0.2)' }}>
                {profile.online ? '● Online' : 'Offline'}
              </span>
            </div>
            {(factsLine(profile) || communityLine(profile)) && (
              <p className="mt-2 text-[13px] font-semibold leading-[18px] text-white/95">
                {[factsLine(profile), communityLine(profile)].filter(Boolean).join(' · ')}
              </p>
            )}
            {profile.verified && <VerifiedTrustStrip />}
            {!isSelf && <TrustRatingStrip summary={ratingSummary} onPress={openRateSheet} />}
          </div>
        </div>


        <div className="-mt-5 flex flex-col gap-4 rounded-t-3xl bg-[var(--bg)] p-4">
          <div className="flex gap-3">
            <div className="flex min-h-0 flex-1 flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5">
              <Briefcase size={18} color="var(--primary)" />
              <span className="mt-1 text-[11px] font-bold text-[var(--muted)]">WORK</span>
              <span className="mt-0.5 text-center font-extrabold text-[var(--text)]">{profile.job || profile.occupation || 'Not specified'}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5">
              <GraduationCap size={18} color="var(--primary)" />
              <span className="mt-1 text-[11px] font-bold text-[var(--muted)]">EDUCATION</span>
              <span className="mt-0.5 text-center font-extrabold text-[var(--text)]">{profile.education || 'Not specified'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="font-extrabold text-[var(--text)]">About {profile.name}</p>
            <p className="mt-2 whitespace-pre-line leading-5 text-[var(--muted)]">{profile.bio || 'No details added yet.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <span key={i} className="rounded-full border border-[var(--border)] bg-[var(--inputBg)] px-3 py-1.5 text-[13px] font-bold text-[var(--text)]">{i}</span>
              ))}
            </div>
          </div>

          <ProfileDetails profile={profile} viewer={myProfile} showPrivate={isSelf} />

          <Phase3Actions profile={profile} />

          <div className="flex gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3.5">
            <ShieldCheck size={20} color="#2563EB" className="shrink-0" />
            <p className="flex-1 text-xs font-semibold leading-[17px] text-blue-900">
              Safety tip: Never send money or share OTPs. Verify details with a video call, involve family before meeting, and meet in a public place. Report anything suspicious.
            </p>
          </div>
        </div>
      </div>

      {!isSelf && isBlocked && (
        <div className="fixed bottom-0 left-1/2 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--card)] p-4">
          <Ban size={18} color="var(--muted)" />
          <span className="font-bold text-[var(--muted)]">Unavailable — this profile is blocked</span>
        </div>
      )}

      {!isSelf && !isBlocked && (
        <div className="fixed bottom-0 left-1/2 flex w-full max-w-[480px] -translate-x-1/2 gap-3 border-t border-[var(--border)] bg-[var(--card)] p-4">
          <button
            onClick={() => actions.toggleShortlist(profile, shortlisted)}
            disabled={actions.busyUid === profile.uid}
            aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            aria-pressed={shortlisted}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] disabled:opacity-50"
          >
            <Bookmark size={22} color={shortlisted ? 'var(--primary)' : 'var(--muted)'} fill={shortlisted ? 'var(--primary)' : 'none'} />
          </button>

          {interest.state === 'connected' ? (
            <button onClick={() => actions.openChat(profile.uid)} className="grad-primary flex h-14 flex-1 items-center justify-center gap-2 rounded-full font-extrabold text-white">
              <MessageCircle size={20} /> Message {profile.name}
            </button>
          ) : interest.state === 'received' ? (
            <>
              <button onClick={() => actions.accept(profile)} disabled={actions.busyUid === profile.uid} className="grad-primary flex h-14 flex-1 items-center justify-center gap-2 rounded-full font-extrabold text-white disabled:opacity-50">
                <Check size={20} /> Accept interest
              </button>
              <button onClick={() => actions.decline(profile)} disabled={actions.busyUid === profile.uid} className="flex h-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] px-5 font-extrabold text-[var(--text)] disabled:opacity-50">
                Decline
              </button>
            </>
          ) : interest.state === 'sent' && interest.status === 'pending' ? (
            <>
              <span className="flex h-14 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] font-extrabold text-[var(--muted)]">
                Interest sent
              </span>
              <button onClick={() => actions.withdraw(profile)} disabled={actions.busyUid === profile.uid} className="flex h-14 items-center justify-center rounded-full px-4 font-bold text-[var(--muted)] disabled:opacity-50">
                Withdraw
              </button>
            </>
          ) : interest.state === 'sent' || interest.state === 'declined-by-me' ? (
            <span className="flex h-14 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] font-bold text-[var(--muted)]">
              {interest.state === 'declined-by-me' ? 'You declined this interest' : 'Not available'}
            </span>
          ) : (
            <button onClick={() => actions.send(profile)} disabled={actions.busyUid === profile.uid} className="grad-primary flex h-14 flex-1 items-center justify-center gap-2 rounded-full font-extrabold text-white disabled:opacity-50">
              {actions.busyUid === profile.uid ? <Loader2 size={20} className="animate-spin" /> : <Heart size={20} />} Send interest
            </button>
          )}
        </div>
      )}

      {showRateSheet && user && profile && (
        <RateSheet
          targetName={profile.name}
          raterGender={myProfile?.gender}
          initial={myRating}
          onClose={() => setShowRateSheet(false)}
          onSubmit={async (values) => {
            await submitRating(user.uid, profile.uid, myProfile?.gender ?? 'Other', values);
            const summary = await getRatingSummary(profile.uid).catch(() => null);
            setRatingSummary(summary);
          }}
        />
      )}

      {showMenu && !showReport && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40" onClick={() => setShowMenu(false)}>
          <div className="flex w-full animate-slide-up flex-col gap-3 rounded-t-3xl bg-[var(--card)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-[var(--border)]" />
            {blocked ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Check size={22} color="var(--success)" />
                <p className="font-bold text-[var(--text)]">Blocked {profile.name}</p>
              </div>
            ) : (
              <>
                <button onClick={doBlock} disabled={busy} className="flex items-center gap-3 py-2.5 text-left disabled:opacity-60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50"><Ban size={18} color="#EF4444" /></span>
                  <span>
                    <p className="font-bold text-[var(--text)]">Block {profile.name}</p>
                    <p className="text-xs text-[var(--muted)]">They won&apos;t be able to see you</p>
                  </span>
                </button>
                <button onClick={() => setShowReport(true)} className="flex items-center gap-3 py-2.5 text-left">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50"><Flag size={18} color="#D97706" /></span>
                  <span>
                    <p className="font-bold text-[var(--text)]">Report profile</p>
                    <p className="text-xs text-[var(--muted)]">Fake, spam or inappropriate</p>
                  </span>
                </button>
                <button onClick={() => setShowMenu(false)} className="mt-2 h-12 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] font-bold text-[var(--text)]">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40" onClick={() => { if (!busy) { setShowReport(false); setReportReason(null); setReportError(''); } }}>
          <div className="flex w-full animate-slide-up flex-col gap-1 rounded-t-3xl bg-[var(--card)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--border)]" />
            {reportSent ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Check size={22} color="var(--success)" />
                <p className="font-bold text-[var(--text)]">Report submitted</p>
                <p className="text-xs text-[var(--muted)]">Thanks — our team will take a look.</p>
              </div>
            ) : reportReason ? (
              <>
                <p className="mb-1 font-extrabold text-[var(--text)]">Anything else we should know?</p>
                <p className="mb-2 text-xs text-[var(--muted)]">Optional — add details to help our team review faster.</p>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value.slice(0, 300))}
                  placeholder="Describe what happened…"
                  className="h-24 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--inputBg)] p-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
                />
                {reportError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{reportError}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={submitReport} disabled={busy} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white disabled:opacity-60">
                    {busy ? 'Submitting…' : 'Submit report'}
                  </button>
                  <button onClick={() => setReportReason(null)} disabled={busy} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] disabled:opacity-60">
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-1 font-extrabold text-[var(--text)]">Why are you reporting {profile.name}?</p>
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => chooseReportReason(r.id)}
                    disabled={busy}
                    className="rounded-xl px-2 py-3 text-left font-semibold text-[var(--text)] disabled:opacity-60"
                  >
                    {r.label}
                  </button>
                ))}
                <button onClick={() => { setShowReport(false); setReportReason(null); setReportError(''); }} className="mt-2 h-12 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] font-bold text-[var(--text)]">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showLightbox && (
        <PhotoLightbox images={photos} startIndex={photoIndex} onClose={() => setShowLightbox(false)} />
      )}
    </div>
  );
}
