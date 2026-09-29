'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight, BrainCircuit, Camera, Crown, Eye, Gem, Search, Sparkles, Users } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useAuth } from '@/lib/auth-context';
const TOOLS = [
  ['/daily-matches', 'Daily curated matches', 'A fresh set of compatibility-ranked profiles every day.', Sparkles],
  ['/advanced-filters', 'Advanced search', 'Premium-only search controls for detailed matrimonial preferences.', Search],
  ['/who-viewed-me', 'Who viewed you', 'See recent profile visitors with Premium.', Eye],
  ['/private-photos', 'Hidden photos', 'Manage your private gallery and approve access requests.', Camera],
  ['/family-account', 'Parent / family account', 'Invite a parent, sibling or relative to help manage your profile.', Users],
  ['/premium-inbox', 'Premium messaging', 'Review premium introductions and accept or decline them.', Gem],
  ['/contact-requests', 'Contact requests', 'Approve or decline phone and WhatsApp sharing requests.', Users],
] as const;
export default function MatrimonyToolsPage() {
  const router = useRouter(); const { profile } = useAuth();
  return <PageShell title="Matrimony tools">
    <div className="rounded-2xl bg-[var(--text)] p-5 text-[var(--card)]"><p className="flex items-center gap-2 text-xl font-black"><Crown size={20} /> Phase 3</p><p className="mt-1 text-sm opacity-80">Trust-first tools for serious matrimonial discovery.</p>{!profile?.premium && <button onClick={() => router.push('/premium')} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-white">Unlock Premium features</button>}</div>
    <div className="mt-4 grid gap-3">{TOOLS.map(([href,title,desc,Icon]) => <button key={href} onClick={() => router.push(href)} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--inputBg)]"><Icon size={19} color="var(--primary)" /></span><span className="min-w-0 flex-1"><span className="block font-extrabold">{title}</span><span className="mt-0.5 block text-xs leading-4 text-[var(--muted)]">{desc}</span></span><ArrowRight size={17} color="var(--muted)" /></button>)}</div>
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><p className="flex items-center gap-2 font-extrabold"><BrainCircuit size={17} color="var(--primary)" /> Compatibility is explainable</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Scores use profile preferences and available matrimonial fields. Horoscope matching is shown separately so families can choose how much weight to give it.</p></div>
  </PageShell>;
}
