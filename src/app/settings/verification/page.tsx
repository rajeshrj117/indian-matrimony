'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Camera, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { submitVerificationSelfie, verifyFaceSelfie, VerificationError } from '@/lib/firestore';

export default function VerificationPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasProfilePhoto = Boolean(profile?.images?.[0]);
  const status = profile?.verificationStatus ?? (profile?.verified ? 'verified' : 'none');

  const onPickSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPreview(URL.createObjectURL(file));
    setError('');
    setBusy(true);
    try {
      setBusyLabel('Uploading selfie…');
      const selfieUrl = await submitVerificationSelfie(user.uid, file);
      await refreshProfile();

      setBusyLabel('Checking it\u2019s really you…');
      const idToken = await user.getIdToken();
      const result = await verifyFaceSelfie(idToken, selfieUrl);
      await refreshProfile();
      if (!result.verified) {
        setError(result.reason || 'That selfie didn\u2019t match your profile photo. Try again with better lighting and a clear, front-on view.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof VerificationError ? err.message : 'Could not submit your selfie. Please check your connection and try again.');
    } finally {
      setBusy(false);
      setBusyLabel('');
      // Let them retake immediately either way — the file input's onChange only
      // fires again for the same file if we clear its value first.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Verification</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="flex flex-col items-center rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck size={30} color="#2563EB" />
          </div>
          <p className="mt-3 text-lg font-black text-[var(--text)]">Get the blue checkmark</p>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
            {profile?.gender === 'Male'
              ? "You can keep swiping either way, but you'll need to verify before you can message a match. Take a quick selfie and we'll check it against your profile photo."
              : "Verification isn't required to message on Flirty, but a blue check builds trust and helps matches feel more confident it's really you. Take a quick selfie and we'll check it against your profile photo."}
          </p>
        </div>

        {!hasProfilePhoto && status !== 'verified' && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Add at least one profile photo first — your selfie gets compared against it.{' '}
            <button onClick={() => router.push('/profile-setup')} className="underline">Add a photo</button>
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPickSelfie}
              className="hidden"
              disabled={!hasProfilePhoto}
            />
            <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--inputBg)]">
              {preview || profile?.verificationSelfieUrl ? (
                <img src={preview ?? profile?.verificationSelfieUrl} className="h-full w-full object-cover" alt="" />
              ) : (
                <Camera size={28} color="var(--muted2)" />
              )}
              {busy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 px-2 text-center">
                  <Loader2 size={22} color="#fff" className="animate-spin" />
                  <span className="text-[11px] font-bold text-white">{busyLabel}</span>
                </div>
              )}
            </div>

            {status === 'verified' ? (
              <div className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-emerald-700">
                <CheckCircle2 size={16} /> <span className="text-sm font-extrabold">You&apos;re verified</span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mt-4 flex items-start gap-1.5 rounded-2xl bg-red-50 px-3.5 py-2.5 text-left text-red-700">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="text-sm font-semibold leading-5">{error}</span>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy || !hasProfilePhoto}
                  className="mt-4 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {error ? 'Try again' : 'Take a selfie'}
                </button>
              </>
            )}
          </div>

          <ul className="mt-5 flex flex-col gap-2.5 text-sm text-[var(--muted)]">
            <li>• Make sure your face is clearly visible and well lit</li>
            <li>• No sunglasses, masks, or filters</li>
            <li>• Match the pose shown on your profile photo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
