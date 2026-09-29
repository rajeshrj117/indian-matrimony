'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Check, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  saveProfile, uploadProfilePhoto, claimIdentity, DuplicateAccountError, PhotoPolicyError, ContentPolicyError,
} from '@/lib/firestore';
import { APP_NAME } from '@/lib/brand';
import { communityLine, factsLine } from '@/lib/matrimony';
import {
  EMPTY_FORM, EMPTY_PREFS, profileDataFromForm, validateStep, type ProfileForm, type StepId,
} from '@/lib/profile-form';
import {
  AboutSection, BackgroundSection, BasicsSection, CareerSection, FamilySection, HoroscopeSection,
  LocationSection, PartnerSection, calcAge,
} from '@/components/profile-form/sections';
import type { Profile } from '@/lib/types';

const STEPS: StepId[] = ['basics', 'background', 'career', 'location', 'family', 'horoscope', 'about', 'partner'];
const TOTAL = STEPS.length + 1; // + the final "profile ready" screen
const OPTIONAL_STEPS = new Set<StepId>(['family', 'horoscope', 'partner']);

export default function ProfileWizardScreen() {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileForm>({ ...EMPTY_FORM, prefs: { ...EMPTY_PREFS } });

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setPref = <K extends keyof ProfileForm['prefs']>(key: K, value: ProfileForm['prefs'][K]) =>
    setForm((f) => ({ ...f, prefs: { ...f.prefs, [key]: value } }));

  const isFinal = step === STEPS.length;
  const progress = ((step + 1) / TOTAL) * 100;

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const finish = async () => {
    if (!user) { router.replace('/auth'); return; }
    setSaving(true);
    setError('');
    try {
      // Block sign-up if this phone/email is already tied to a different account,
      // before anything else gets written for this uid.
      try {
        await claimIdentity(user.uid, user.phoneNumber ?? null, user.email ?? null);
      } catch (err) {
        if (err instanceof DuplicateAccountError) {
          alert(`${err.message} Please sign in with that method instead.`);
          await logout();
          router.replace('/auth');
          return;
        }
        throw err;
      }

      let images: string[] = [];
      if (photoFile) {
        images = [await uploadProfilePhoto(user.uid, photoFile, form.gender as Profile['gender'])];
      }
      await saveProfile(user.uid, {
        ...profileDataFromForm(form),
        phone: user.phoneNumber ?? null,
        email: user.email ?? null,
        name: form.name.trim() || 'You',
        dob: form.dob,
        age: calcAge(form.dob),
        gender: form.gender as Profile['gender'],
        bio: form.bio.trim(),
        job: form.job.trim(),
        interests: form.interests,
        images,
        verified: false,
        online: true,
        profileComplete: true,
      });
      await refreshProfile();
      router.replace('/discover');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof PhotoPolicyError || err instanceof ContentPolicyError
          ? err.message
          : 'Could not save your profile. Please check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const goTo = (n: number) => {
    setError('');
    setStep(n);
    document.getElementById('wizard-scroll')?.scrollTo({ top: 0 });
  };

  const next = () => {
    if (isFinal) { void finish(); return; }
    const problem = validateStep(STEPS[step], form);
    if (problem) { setError(problem); return; }
    goTo(step + 1);
  };

  const back = () => (step > 0 ? goTo(step - 1) : router.back());

  const previewProfile = {
    name: form.name, age: calcAge(form.dob), location: form.location, state: form.state,
    religion: form.religion, community: form.community, motherTongue: form.motherTongue,
    heightCm: form.heightCm ? Number(form.heightCm) : undefined, maritalStatus: form.maritalStatus,
  } as Profile;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-5 pt-4">
        <button onClick={back} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
          <ChevronLeft size={18} color="var(--text)" />
        </button>
        <span className="font-extrabold text-[var(--text)]">Step {step + 1} of {TOTAL}</span>
        <span className="w-9" />
      </div>
      <div className="mx-5 mt-3 h-1 rounded-full bg-[var(--border)]">
        <div className="h-1 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div id="wizard-scroll" className="min-h-0 flex-1 overflow-y-auto px-5 pb-40 pt-5">
        {step === 0 && (
          <>
            <p className="mb-4 text-[15px] text-[var(--muted)]">Create a profile on {APP_NAME} in a few minutes.</p>
            <div className="mb-6 flex flex-col items-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add profile photo"
                className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--inputBg)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" alt="" /> : <Camera size={32} color="var(--muted2)" />}
              </button>
              <p className="mt-1.5 text-[11px] font-bold text-[var(--muted2)]">{photoPreview ? 'TAP TO CHANGE' : 'ADD A CLEAR PHOTO'}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                <ShieldCheck size={14} color="var(--success)" /> Verified profiles get far more responses
              </p>
            </div>
            <BasicsSection form={form} set={set} />
          </>
        )}
        {step === 1 && <BackgroundSection form={form} set={set} />}
        {step === 2 && <CareerSection form={form} set={set} />}
        {step === 3 && <LocationSection form={form} set={set} />}
        {step === 4 && <FamilySection form={form} set={set} />}
        {step === 5 && <HoroscopeSection form={form} set={set} />}
        {step === 6 && <AboutSection form={form} set={set} />}
        {step === 7 && <PartnerSection prefs={form.prefs} setPref={setPref} />}

        {isFinal && (
          <div className="flex flex-col items-center">
            <div className="grad-primary flex h-20 w-20 items-center justify-center rounded-full">
              <Check size={40} color="#fff" strokeWidth={3} />
            </div>
            <h2 className="mt-4 text-center text-[28px] font-black text-[var(--text)]">Your profile is ready</h2>
            <p className="mt-2 text-center leading-[22px] text-[var(--muted)]">
              Start searching for suitable profiles. You can add or change any detail later from the Profile tab.
            </p>
            <div className="mt-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--inputBg)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {photoPreview && <img src={photoPreview} className="h-full w-full object-cover" alt="" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-extrabold text-[var(--text)]">{previewProfile.name || 'You'}, {previewProfile.age}</p>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{factsLine(previewProfile)}</p>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{communityLine(previewProfile)}</p>
                </div>
              </div>
              {form.bio && <p className="mt-3 text-sm leading-[19px] text-[var(--muted)]">{form.bio}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--border)] bg-[var(--bg)] p-5">
        {error && <p role="alert" className="mb-2.5 text-center text-[13px] font-semibold text-red-600">{error}</p>}
        <button
          onClick={next}
          disabled={saving}
          className="grad-primary flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? 'Saving…' : isFinal ? 'Start searching' : 'Continue'}
          {!saving && <ArrowRight size={18} />}
        </button>
        {!isFinal && OPTIONAL_STEPS.has(STEPS[step]) && !saving && (
          <button onClick={() => goTo(step + 1)} className="mt-2 w-full text-center text-[13px] font-bold text-[var(--muted)]">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
