'use client';

import { useState } from 'react';
import { AlertCircle, Check, Loader2, Locate, Sparkles } from 'lucide-react';
import { authedFetch } from '@/lib/api-client';
import { getCurrentLocation, GeoError } from '@/lib/geo';
import {
  AGE_CHOICES, CREATED_BY, DIETS, EDUCATION_LEVELS, FAMILY_STATUSES, FAMILY_TYPES, FAMILY_VALUES,
  HABITS, HEIGHT_CHOICES_CM, HOBBIES, INCOME_RANGES, INDIAN_STATES, MARITAL_STATUSES, MOTHER_TONGUES,
  NAKSHATRAS, NO_BAR, NRI_STATUSES, OCCUPATIONS, RASHIS, RELIGIONS, RELOCATION_OPTIONS,
  MANGLIK_PREFERENCES, MANGLIK_STATUSES, communityOptions, formatHeight,
} from '@/lib/matrimony';
import type { PartnerPrefsForm, ProfileForm } from '@/lib/profile-form';
import { Chips, Field, MultiChips, MultiSelect, NumberSelect, RangeSelect, SectionTitle, Select, inputCls } from './kit';

export type SectionProps = {
  form: ProfileForm;
  set: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void;
};

const MAX_DOB = new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
export const MAX_BIO = 500;

export function calcAge(dob: string): number {
  if (!dob) return 18;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 18;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return Math.max(18, age);
}

// ---------- Basics ----------

export function BasicsSection({ form, set, hideIdentity = false }: SectionProps & { hideIdentity?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Basic details" sub="Start with who is creating this profile and who it is for." />
      <Field label="Profile created by">
        <Chips options={CREATED_BY} value={form.createdBy} onChange={(v) => set('createdBy', v)} required />
      </Field>
      {form.createdBy && form.createdBy !== 'Self' && (
        <p className="-mt-2 rounded-xl bg-[var(--inputBg)] px-3.5 py-2.5 text-[13px] leading-[18px] text-[var(--muted)]">
          Fill in the details of the person who is getting married. You can add your own note in the About section.
        </p>
      )}
      {!hideIdentity && (
        <>
          <Field label={form.createdBy && form.createdBy !== 'Self' ? 'Name of the bride / groom' : 'Full name'}>
            <input className={inputCls} placeholder="e.g. Aryan Sharma" value={form.name} maxLength={60}
              onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Date of birth" hint="Only the age is shown to others. Your date of birth stays private.">
            <input type="date" className={inputCls} value={form.dob} max={MAX_DOB} onChange={(e) => set('dob', e.target.value)} />
            {form.dob && <p className="mt-1.5 text-[11px] text-[var(--muted2)]">Age {calcAge(form.dob)}</p>}
          </Field>
          <Field label="Gender">
            <Chips options={['Male', 'Female', 'Other']} value={form.gender} onChange={(v) => set('gender', v)} required />
          </Field>
        </>
      )}
    </div>
  );
}

// ---------- Religion, community & background ----------

export function BackgroundSection({ form, set }: SectionProps) {
  const listId = 'community-options';
  const options = communityOptions(form.religion);
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Religion & community" sub="These are what most families search by." />
      <Field label="Marital status">
        <Chips options={MARITAL_STATUSES} value={form.maritalStatus} onChange={(v) => set('maritalStatus', v)} />
      </Field>
      <Field label="Height">
        <Select value={form.heightCm} onChange={(v) => set('heightCm', v)} options={HEIGHT_CHOICES_CM.map(String)} ariaLabel="Height" />
        {form.heightCm && <p className="mt-1.5 text-[12px] font-semibold text-[var(--muted)]">{formatHeight(Number(form.heightCm))}</p>}
      </Field>
      <Field label="Religion">
        <Select value={form.religion}
          onChange={(v) => { set('religion', v); if (v !== form.religion) set('community', ''); }}
          options={RELIGIONS} />
      </Field>
      <Field label="Community / caste" hint="Pick from the list or type your own. Choose No bar if it doesn't matter.">
        <input
          className={inputCls}
          list={listId}
          value={form.community}
          maxLength={40}
          placeholder={form.religion ? `Search ${form.religion} communities` : 'Select a religion first, or type'}
          onChange={(e) => set('community', e.target.value)}
        />
        <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
        <button
          type="button"
          onClick={() => set('community', form.community === NO_BAR ? '' : NO_BAR)}
          aria-pressed={form.community === NO_BAR}
          className="mt-2.5 rounded-full border px-3.5 py-1.5 text-[13px] font-bold"
          style={{
            background: form.community === NO_BAR ? 'var(--primary)' : 'var(--card)',
            borderColor: form.community === NO_BAR ? 'var(--primary)' : 'var(--border)',
            color: form.community === NO_BAR ? '#fff' : 'var(--text)',
          }}
        >
          {NO_BAR}
        </button>
      </Field>
      <Field label="Mother tongue">
        <Select value={form.motherTongue} onChange={(v) => set('motherTongue', v)} options={MOTHER_TONGUES} />
      </Field>
    </div>
  );
}

// ---------- Education & career ----------

export function CareerSection({ form, set }: SectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Education & career" />
      <Field label="Highest education">
        <Select value={form.education} onChange={(v) => set('education', v)} options={EDUCATION_LEVELS} />
      </Field>
      <Field label="Occupation">
        <Select value={form.occupation} onChange={(v) => set('occupation', v)} options={OCCUPATIONS} />
      </Field>
      <Field label="Job title / employer" hint="Optional, e.g. Product Designer at Swiggy">
        <input className={inputCls} value={form.job} maxLength={60} onChange={(e) => set('job', e.target.value)} placeholder="Job title" />
      </Field>
      <Field label="Annual income">
        <Select value={form.annualIncome} onChange={(v) => set('annualIncome', v)} options={INCOME_RANGES} />
      </Field>
      <Field label="Diet">
        <Chips options={DIETS} value={form.diet} onChange={(v) => set('diet', v)} />
      </Field>
      <Field label="Drinking">
        <Chips options={HABITS} value={form.drinking} onChange={(v) => set('drinking', v)} />
      </Field>
      <Field label="Smoking">
        <Chips options={HABITS} value={form.smoking} onChange={(v) => set('smoking', v)} />
      </Field>
    </div>
  );
}

// ---------- Location ----------

export function LocationSection({ form, set }: SectionProps) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const useMyLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const { location, latitude, longitude } = await getCurrentLocation();
      set('location', location);
      set('latitude', latitude);
      set('longitude', longitude);
    } catch (err) {
      setError(
        err instanceof GeoError
          ? err.code === 'denied' ? 'Location access denied. Enter your city manually instead.' : err.message
          : 'Could not get your location. Please enter it manually.',
      );
    } finally {
      setLocating(false);
    }
  };

  const outside = form.nriStatus && form.nriStatus !== 'Resident Indian';

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Where do you live?" sub="Your exact location is never shown, only the city and state." />
      <Field label="City">
        <input className={inputCls} value={form.location} maxLength={60} placeholder="e.g. Chennai"
          onChange={(e) => { set('location', e.target.value); set('latitude', undefined); set('longitude', undefined); }} />
        <button type="button" onClick={useMyLocation} disabled={locating}
          className="mt-2.5 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[13px] font-bold text-[var(--text)] disabled:opacity-60">
          {locating ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />} Use my current location
        </button>
        {form.latitude !== undefined && !error && (
          <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--success)]"><Check size={13} /> Location captured</p>
        )}
        {error && (
          <div className="mt-2.5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AlertCircle size={16} color="#DC2626" className="mt-0.5 shrink-0" />
            <p className="flex-1 text-xs font-semibold leading-[17px] text-red-700">{error}</p>
          </div>
        )}
      </Field>
      <Field label="State">
        <Select value={form.state} onChange={(v) => set('state', v)} options={INDIAN_STATES} />
      </Field>
      <Field label="Native place" hint="Hometown or where the family originally comes from.">
        <input className={inputCls} value={form.nativePlace} maxLength={60} placeholder="e.g. Madurai"
          onChange={(e) => set('nativePlace', e.target.value)} />
      </Field>
      <Field label="Residency status">
        <Chips options={NRI_STATUSES} value={form.nriStatus} onChange={(v) => set('nriStatus', v)} />
      </Field>
      {outside && (
        <Field label="Country of residence">
          <input className={inputCls} value={form.countryOfResidence} maxLength={60} placeholder="e.g. United States"
            onChange={(e) => set('countryOfResidence', e.target.value)} />
        </Field>
      )}
      <Field label="Willing to relocate after marriage?">
        <Chips options={RELOCATION_OPTIONS} value={form.willingToRelocate} onChange={(v) => set('willingToRelocate', v)} />
      </Field>
    </div>
  );
}

// ---------- Family ----------

export function FamilySection({ form, set }: SectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Family details" sub="Families often look at this first. Everything here is optional." />
      <Field label="Family type"><Chips options={FAMILY_TYPES} value={form.familyType} onChange={(v) => set('familyType', v)} /></Field>
      <Field label="Family status"><Chips options={FAMILY_STATUSES} value={form.familyStatus} onChange={(v) => set('familyStatus', v)} /></Field>
      <Field label="Family values"><Chips options={FAMILY_VALUES} value={form.familyValues} onChange={(v) => set('familyValues', v)} /></Field>
      <Field label="Father's occupation">
        <input className={inputCls} value={form.fatherOccupation} maxLength={60} placeholder="e.g. Retired bank manager"
          onChange={(e) => set('fatherOccupation', e.target.value)} />
      </Field>
      <Field label="Mother's occupation">
        <input className={inputCls} value={form.motherOccupation} maxLength={60} placeholder="e.g. Homemaker"
          onChange={(e) => set('motherOccupation', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brothers"><NumberSelect value={form.brothers} onChange={(v) => set('brothers', v)} ariaLabel="Number of brothers" /></Field>
        <Field label="Married"><NumberSelect value={form.brothersMarried} onChange={(v) => set('brothersMarried', v)} max={Number(form.brothers) || 0} ariaLabel="Brothers married" /></Field>
        <Field label="Sisters"><NumberSelect value={form.sisters} onChange={(v) => set('sisters', v)} ariaLabel="Number of sisters" /></Field>
        <Field label="Married"><NumberSelect value={form.sistersMarried} onChange={(v) => set('sistersMarried', v)} max={Number(form.sisters) || 0} ariaLabel="Sisters married" /></Field>
      </div>
      <Field label={`About the family • ${form.familyAbout.length}/300`}>
        <textarea
          className="h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-[15px] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
          value={form.familyAbout}
          maxLength={300}
          placeholder="A line or two about your family"
          onChange={(e) => set('familyAbout', e.target.value.slice(0, 300))}
        />
      </Field>
    </div>
  );
}

// ---------- Horoscope ----------

export function HoroscopeSection({ form, set }: SectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Horoscope" sub="Optional. Star, rashi and manglik status are visible on your profile. Birth time and place stay private to you." />
      <Field label="Manglik / Chevvai dosham">
        <Chips options={MANGLIK_STATUSES} value={form.manglik} onChange={(v) => set('manglik', v)} />
      </Field>
      <Field label="Star (nakshatra)">
        <Select value={form.star} onChange={(v) => set('star', v)} options={NAKSHATRAS} />
      </Field>
      <Field label="Rashi (moon sign)">
        <Select value={form.rashi} onChange={(v) => set('rashi', v)} options={RASHIS} />
      </Field>
      <Field label="Time of birth" hint="Private. Only you can see this.">
        <input type="time" className={inputCls} value={form.birthTime} onChange={(e) => set('birthTime', e.target.value)} />
      </Field>
      <Field label="Place of birth" hint="Private. Only you can see this.">
        <input className={inputCls} value={form.birthPlace} maxLength={60} placeholder="e.g. Coimbatore"
          onChange={(e) => set('birthPlace', e.target.value)} />
      </Field>
    </div>
  );
}

// ---------- About ----------

export function AboutSection({ form, set }: SectionProps) {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState('');

  const enhance = async () => {
    if (!form.bio.trim()) return;
    setEnhancing(true);
    setError('');
    try {
      const res = await authedFetch('/api/groq/bio', { bio: form.bio, interests: form.interests, job: form.job });
      const data = await res.json();
      if (data.bio) set('bio', String(data.bio).slice(0, MAX_BIO));
      else setError(data.error || 'AI enhancement failed. Please try again.');
    } catch {
      setError('AI enhancement failed. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="About" sub="A few honest lines about personality, values and what you are looking for in married life." />
      <Field label={`About • ${form.bio.length}/${MAX_BIO}`} hint="Please don't include phone numbers, social handles or links.">
        <textarea
          className="h-36 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-[15px] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
          value={form.bio}
          placeholder="I am a family-oriented person who enjoys cooking and long walks. I value honesty and respect…"
          onChange={(e) => set('bio', e.target.value.slice(0, MAX_BIO))}
        />
     
        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      </Field>
      <Field label={`Hobbies & interests • ${form.interests.length}/8`}>
        <MultiChips options={HOBBIES} selected={form.interests} onChange={(v) => v.length <= 8 && set('interests', v)} />
      </Field>
    </div>
  );
}

// ---------- Partner preferences ----------

export type PrefsProps = {
  prefs: PartnerPrefsForm;
  setPref: <K extends keyof PartnerPrefsForm>(key: K, value: PartnerPrefsForm[K]) => void;
};

export function PartnerSection({ prefs, setPref }: PrefsProps) {
  const religions = prefs.religion;
  // Community suggestions for whichever religions were chosen; all of them if none.
  const communities = religions.length
    ? Array.from(new Set(religions.flatMap((r) => communityOptions(r))))
    : communityOptions();

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle title="Partner preferences" sub="Who would you like to meet? Leave anything blank if it doesn't matter." />
      <Field label="Age">
        <RangeSelect ariaLabel="Age" from={prefs.ageMin} to={prefs.ageMax} onFrom={(v) => setPref('ageMin', v)} onTo={(v) => setPref('ageMax', v)}
          options={AGE_CHOICES} format={(n) => `${n} yrs`} />
      </Field>
      <Field label="Height">
        <RangeSelect ariaLabel="Height" from={prefs.heightMinCm} to={prefs.heightMaxCm} onFrom={(v) => setPref('heightMinCm', v)}
          onTo={(v) => setPref('heightMaxCm', v)} options={HEIGHT_CHOICES_CM} format={formatHeight} />
      </Field>
      <Field label="Marital status">
        <MultiChips options={MARITAL_STATUSES} selected={prefs.maritalStatus} onChange={(v) => setPref('maritalStatus', v)} />
      </Field>
      <Field label="Religion">
        <MultiSelect options={RELIGIONS} selected={prefs.religion} onChange={(v) => setPref('religion', v)} placeholder="Any religion" />
      </Field>
      <Field label="Community / caste" hint="Choose No bar to be open to all communities.">
        <MultiSelect options={communities} selected={prefs.community} onChange={(v) => setPref('community', v)} placeholder="Any community" />
      </Field>
      <Field label="Mother tongue">
        <MultiSelect options={MOTHER_TONGUES} selected={prefs.motherTongue} onChange={(v) => setPref('motherTongue', v)} placeholder="Any language" />
      </Field>
      <Field label="Education">
        <MultiSelect options={EDUCATION_LEVELS} selected={prefs.education} onChange={(v) => setPref('education', v)} placeholder="Any education" />
      </Field>
      <Field label="Occupation">
        <MultiSelect options={OCCUPATIONS} selected={prefs.occupation} onChange={(v) => setPref('occupation', v)} placeholder="Any occupation" />
      </Field>
      <Field label="Annual income">
        <MultiSelect options={INCOME_RANGES} selected={prefs.annualIncome} onChange={(v) => setPref('annualIncome', v)} placeholder="Any income" />
      </Field>
      <Field label="Diet">
        <MultiChips options={DIETS} selected={prefs.diet} onChange={(v) => setPref('diet', v)} />
      </Field>
      <Field label="Lives in (state)">
        <MultiSelect options={INDIAN_STATES} selected={prefs.states} onChange={(v) => setPref('states', v)} placeholder="Any state" />
      </Field>
      <Field label="Residency status">
        <MultiChips options={NRI_STATUSES} selected={prefs.nriStatus} onChange={(v) => setPref('nriStatus', v)} />
      </Field>
      <Field label="Manglik">
        <Chips options={MANGLIK_PREFERENCES} value={prefs.manglik} onChange={(v) => setPref('manglik', v)} />
      </Field>
      <Field label={`In your own words • ${prefs.about.length}/500`}>
        <textarea
          className="h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-[15px] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
          value={prefs.about}
          maxLength={500}
          placeholder="Anything else that matters to you or your family"
          onChange={(e) => setPref('about', e.target.value.slice(0, 500))}
        />
      </Field>
    </div>
  );
}
