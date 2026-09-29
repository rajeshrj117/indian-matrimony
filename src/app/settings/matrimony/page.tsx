'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useAuth } from '@/lib/auth-context';
import { saveProfile, ContentPolicyError } from '@/lib/firestore';
import { formFromProfile, profileDataFromForm, validateStep, type ProfileForm, type StepId } from '@/lib/profile-form';
import {
  AboutSection, BackgroundSection, BasicsSection, CareerSection, FamilySection, HoroscopeSection,
  LocationSection, PartnerSection,
} from '@/components/profile-form/sections';

const TABS: { id: StepId; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'background', label: 'Religion' },
  { id: 'career', label: 'Career' },
  { id: 'location', label: 'Location' },
  { id: 'family', label: 'Family' },
  { id: 'horoscope', label: 'Horoscope' },
  { id: 'about', label: 'About' },
  { id: 'partner', label: 'Partner' },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<StepId>('basics');
  const [form, setForm] = useState<ProfileForm | null>(() => (profile ? formFromProfile(profile) : null));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!user || !profile || !form) return null;

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };
  const setPref = <K extends keyof ProfileForm['prefs']>(key: K, value: ProfileForm['prefs'][K]) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, prefs: { ...f.prefs, [key]: value } } : f));
  };

  const save = async () => {
    setError('');
    for (const t of TABS) {
      const problem = validateStep(t.id, { ...form, name: form.name || profile.name, dob: form.dob || 'x', gender: form.gender || profile.gender });
      // Identity fields (name / date of birth / gender) are fixed after sign-up, so skip that tab's check for them.
      if (problem && t.id !== 'basics') { setTab(t.id); setError(problem); return; }
    }
    if (!form.createdBy) { setTab('basics'); setError('Tell us who is creating this profile'); return; }
    setSaving(true);
    try {
      await saveProfile(user.uid, profileDataFromForm(form, { clearBlanks: true }));
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof ContentPolicyError ? err.message : 'Could not save your details. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Edit profile">
      <div className="-mx-4 -mt-4 mb-4 flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--card)] px-4 py-2.5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold"
            style={{
              background: tab === t.id ? 'var(--text)' : 'var(--card)',
              color: tab === t.id ? 'var(--card)' : 'var(--text)',
              borderColor: tab === t.id ? 'var(--text)' : 'var(--border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pb-28">
        {tab === 'basics' && <BasicsSection form={form} set={set} hideIdentity />}
        {tab === 'background' && <BackgroundSection form={form} set={set} />}
        {tab === 'career' && <CareerSection form={form} set={set} />}
        {tab === 'location' && <LocationSection form={form} set={set} />}
        {tab === 'family' && <FamilySection form={form} set={set} />}
        {tab === 'horoscope' && <HoroscopeSection form={form} set={set} />}
        {tab === 'about' && <AboutSection form={form} set={set} />}
        {tab === 'partner' && <PartnerSection prefs={form.prefs} setPref={setPref} />}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--border)] bg-[var(--bg)] p-4">
        {error && <p role="alert" className="mb-2 text-center text-[13px] font-semibold text-red-600">{error}</p>}
        {saved && !error && (
          <p className="mb-2 flex items-center justify-center gap-1.5 text-[13px] font-bold text-[var(--success)]"><Check size={14} /> Saved</p>
        )}
        <div className="flex gap-2.5">
          <button
            onClick={save}
            disabled={saving}
            className="grad-primary flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl font-extrabold text-white disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" />} Save changes
          </button>
          {saved && (
            <button onClick={() => router.push('/profile')} className="h-[52px] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 font-extrabold text-[var(--text)]">
              Done
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
