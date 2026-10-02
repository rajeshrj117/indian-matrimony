'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  RecaptchaVerifier, signInWithPhoneNumber, signInWithRedirect, signInWithPopup, getRedirectResult, GoogleAuthProvider,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getProfile } from '@/lib/firestore';

export default function AuthScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const afterAuth = async (uid: string) => {
    const profile = await getProfile(uid);
    router.replace(profile?.profileComplete ? '/discover' : '/profile-setup');
  };

  useEffect(() => {
    if (!showOtp) return;
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [showOtp, timer]);

  // Handle the result after the user comes back from the Google redirect
  useEffect(() => {
    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user) {
          afterAuth(cred.user.uid);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Google sign-in failed. Please try again.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRecaptcha = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    return recaptchaRef.current;
  };

  const handleSendOtp = async () => {
    setError('');
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setSending(true);
    try {
      const verifier = getRecaptcha();
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
      confirmationRef.current = result;
      setShowOtp(true);
      setTimer(30);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not send OTP. Please try again.');
      // Reset recaptcha so the next attempt gets a fresh widget
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    const code = otp.join('');
    if (code.length < 6 || !confirmationRef.current) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setVerifying(true);
    try {
      const cred = await confirmationRef.current.confirm(code);
      await afterAuth(cred.user.uid);
    } catch (err) {
      console.error(err);
      setError('Invalid OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const continueWithGoogle = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      // Popup avoids the cross-domain redirect-storage hang between the app
      // domain and the firebaseapp.com auth handler (blocked by 3rd-party
      // storage partitioning in Chrome). Fall back to redirect only if the
      // popup itself is blocked by the browser.
      const cred = await signInWithPopup(auth, provider);
      await afterAuth(cred.user.uid);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return;
        } catch (redirectErr) {
          console.error(redirectErr);
          setError('Google sign-in failed. Please try again.');
          return;
        }
      }
      console.error(err);
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]"
        >
          <ArrowLeft size={20} color="var(--text)" />
        </button>

        <div className=" flex flex-col items-center -mt-[50px]">
        <img src="/logo.png" alt="Indian Shaadi Matrimony" width="260" />
        </div>

        <div className="mt-4">
          <h2 className="text-2xl font-extrabold text-[var(--text)]">Welcome back</h2>
          <p className="mt-1.5 text-[15px] text-[var(--muted)]">Sign in to continue finding real connections</p>

          <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
            <label className="text-[13px] font-bold tracking-wide text-[var(--text)]">MOBILE NUMBER</label>
            <div className="mt-2.5 flex h-[54px] items-center rounded-2xl border border-[var(--border)] bg-[var(--inputBg)] px-3.5">
              <span className="font-bold text-[var(--text)]">🇮🇳 +91</span>
              <span className="mx-3 h-6 w-px bg-[var(--border)]" />
              <input
                placeholder="Enter mobile number"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 bg-transparent text-base font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
              />
              {phone.length === 10 && <CheckCircle2 size={20} color="var(--success)" />}
            </div>
            <button
              onClick={handleSendOtp}
              disabled={sending}
              className="bg-[var(--primary)] mt-3.5 flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send OTP'}
            </button>
            {error && <p className="mt-2 text-center text-[12px] font-semibold text-red-500">{error}</p>}
            <p className="mt-2 text-center text-[11px] text-[var(--muted2)]">
              OTP sent via SMS by Firebase. While testing, use a Firebase test phone number so no real SMS is sent.
            </p>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs font-bold text-[var(--muted2)]">OR CONTINUE WITH</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            onClick={continueWithGoogle}
            className="flex h-[54px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] font-bold text-[var(--text)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white font-black text-[#EA4335]">G</span>
            Continue with Google
          </button>

          <div className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] p-3">
            <ShieldCheck size={16} color="var(--success)" />
            <span className="text-xs font-semibold text-[var(--muted)]">Your number is never shown on your profile</span>
          </div>
          <p className="mt-3 text-center text-[11px] text-[var(--muted2)]">
            By continuing you agree to our{' '}
            <a href="/legal/guidelines" className="font-bold underline">Community Guidelines</a> and{' '}
            <a href="/legal/privacy" className="font-bold underline">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {showOtp && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/45" onClick={() => setShowOtp(false)}>
          <div
            className="animate-slide-up w-full rounded-t-[28px] bg-[var(--card)] p-6 pb-9"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)]" />
            <h3 className="text-[22px] font-extrabold text-[var(--text)]">Enter OTP</h3>
            <p className="mt-1.5 text-[var(--muted)]">Sent to +91 {phone}</p>

            <div className="mt-5 flex justify-center gap-2">
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  value={v}
                  onChange={(e) => {
                    const t = e.target.value.replace(/\D/g, '').slice(-1);
                    const n = [...otp];
                    n[i] = t;
                    setOtp(n);
                    if (t && i < otp.length - 1) otpRefs.current[i + 1]?.focus();
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  className="h-14 w-11 rounded-2xl border-2 bg-[var(--inputBg)] text-center text-2xl font-extrabold text-[var(--text)] outline-none"
                  style={{ borderColor: v ? 'var(--primary)' : 'var(--border)' }}
                />
              ))}
            </div>

            {error && <p className="mt-3 text-center text-[12px] font-semibold text-red-500">{error}</p>}

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[var(--muted)]">{timer > 0 ? `Resend in ${timer}s` : "Didn't receive?"}</span>
              <button
                disabled={timer > 0}
                onClick={handleSendOtp}
                className="font-bold"
                style={{ color: timer > 0 ? 'var(--muted2)' : 'var(--primary)' }}
              >
                Resend OTP
              </button>
            </div>

            <button
              onClick={verifyOtp}
              disabled={verifying}
              className="grad-primary mt-5 flex h-14 w-full items-center justify-center rounded-2xl text-base font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <button onClick={() => setShowOtp(false)} className="mt-3.5 w-full text-center font-semibold text-[var(--muted)]">
              Change number
            </button>
          </div>
        </div>
      )}
    </div>
  );
}