'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getProfileByProfileId } from '@/lib/firestore';
import { normalizeProfileId } from '@/lib/profile-id';

export default function ProfileIdSearchPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    setError('');
    const id = normalizeProfileId(value);
    if (!id) { setError('Enter a valid profile ID, like ISM1234567'); return; }
    if (!user) { router.replace('/auth'); return; }
    setBusy(true);
    try {
      const found = await getProfileByProfileId(id);
      const blocked = (profile?.blockedUsers ?? []).includes(found?.uid ?? '');
      if (!found || blocked) { setError('No profile found with that ID.'); return; }
      router.push(found.uid === user.uid ? '/profile' : `/user/${found.uid}`);
    } catch {
      setError('Could not search right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
      <button onClick={() => router.back()} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
        <ChevronLeft size={18} color="var(--text)" />
      </button>
      <h1 className="mt-4 text-[26px] font-black text-[var(--text)]">Search by Profile ID</h1>
      <p className="mt-1 text-[14px] text-[var(--muted)]">Every profile has an ID like ISM1234567. Enter it to open that profile directly.</p>
      <label className="mt-5 flex h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5">
        <Search size={16} color="var(--muted)" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void search(); }}
          placeholder="ISM1234567"
          aria-label="Profile ID"
          autoCapitalize="characters"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold uppercase text-[var(--text)] outline-none placeholder:normal-case placeholder:text-[var(--muted2)]"
        />
      </label>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-red-600">{error}</p>}
      <button onClick={search} disabled={busy} className="grad-primary mt-4 flex h-12 w-full items-center justify-center rounded-full text-[16px] font-extrabold text-white disabled:opacity-60">
        {busy ? 'Searching…' : 'Find profile'}
      </button>
    </div>
  );
}
