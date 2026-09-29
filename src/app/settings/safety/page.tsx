'use client';

import Link from 'next/link';
import { BadgeCheck, Ban, Flag, Phone, ShieldAlert, ShieldCheck, Users, Lock, FileText } from 'lucide-react';
import PageShell, { H, P, UL } from '@/components/PageShell';
import { useAuth } from '@/lib/auth-context';

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">{children}</div>
);

const HELPLINES = [
  { label: 'Emergency (police, fire, ambulance)', number: '112' },
  { label: 'Police', number: '100' },
  { label: 'Women Helpline', number: '181' },
  { label: 'Cyber Crime Helpline', number: '1930' },
];

export default function SafetyCenterPage() {
  const { profile } = useAuth();
  const verified = profile?.verified || profile?.verificationStatus === 'verified';

  return (
    <PageShell title="Safety Center">
      <div className="mb-4 flex gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5">
        <ShieldAlert size={20} color="#DC2626" className="shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-extrabold text-red-900">In danger right now?</p>
          <p className="mt-0.5 text-xs font-semibold text-red-900">Call the emergency number first — then come back to block or report.</p>
          <a href="tel:112" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white">
            <Phone size={14} /> Call 112
          </a>
        </div>
      </div>

      <Card>
        <div className="mb-1 flex items-center gap-2"><BadgeCheck size={18} color="var(--primary)" /><p className="font-extrabold">What the blue check means</p></div>
        <P>
          A blue check means the person took a live selfie that our system matched to their profile photo. It helps
          confirm that <b>the person in the photos is the person you&apos;re talking to</b>.
        </P>
        <UL items={[
          'It does NOT verify their name, age, job, marital status or background.',
          'It does NOT mean we have run a background check.',
          'You can still be scammed by a verified profile — keep the safety tips below in mind.',
        ]} />
        <P>{verified ? 'You\u2019re verified. \uD83C\uDF89' : profile?.gender === 'Male' ? 'Not verified yet? Verify in Settings \u2192 Verification to start chatting.' : 'Not verified yet? It\u2019s optional for you, but verifying builds extra trust with matches.'}</P>
        {!verified && <Link href="/settings/verification" className="font-extrabold text-[var(--primary)]">Get verified →</Link>}
      </Card>

      <Card>
        <div className="mb-1 flex items-center gap-2"><Lock size={18} color="var(--primary)" /><p className="font-extrabold">Verification requirement</p></div>
        <P>
          On Flirty, <b>men must pass face verification before they can send a message</b>. Women and other accounts can message as
          soon as their profile is complete, without waiting on verification. Your phone number, email, date of birth and exact
          location are never shown to other members.
        </P>
      </Card>

      {(profile?.gender === 'Female') && (
        <Card>
          <div className="mb-1 flex items-center gap-2"><ShieldAlert size={18} color="#DB2777" /><p className="font-extrabold">Women Safety Mode</p></div>
          <P>
            Turn this on in <b>Settings → Privacy &amp; Safety</b> to only see verified people in your feed, require verification
            from anyone who messages you, and filter out thin or low-signal profiles more aggressively.
          </P>
          <Link href="/settings/privacy" className="font-extrabold text-[var(--primary)]">Turn on Women Safety Mode →</Link>
        </Card>
      )}

      <Card>
        <p className="mb-2 font-extrabold">Quick actions</p>
        <div className="grid grid-cols-1 gap-2">
          <Link href="/settings/privacy" className="flex items-center gap-2.5 rounded-xl bg-[var(--inputBg)] px-3 py-2.5 font-bold"><Ban size={16} /> Manage blocked people</Link>
          <div className="flex items-start gap-2.5 rounded-xl bg-[var(--inputBg)] px-3 py-2.5"><Flag size={16} className="mt-0.5 shrink-0" /><span className="text-[13px] font-semibold">To report someone, open their profile or chat, tap the <b>⋯ menu</b> and choose <b>Report</b>. Reporting also blocks them for you right away.</span></div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2"><Phone size={18} color="var(--primary)" /><p className="font-extrabold">Helplines (India)</p></div>
        <div className="divide-y divide-[var(--border)]">
          {HELPLINES.map((h) => (
            <a key={h.number} href={`tel:${h.number}`} className="flex items-center justify-between py-2.5">
              <span className="text-[13px] font-semibold text-[var(--muted)]">{h.label}</span>
              <span className="font-extrabold text-[var(--primary)]">{h.number}</span>
            </a>
          ))}
        </div>
        <P>
          Online harassment, blackmail or money scams: report at{' '}
          <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--primary)] underline">cybercrime.gov.in</a>.
        </P>
      </Card>

      <Card>
        <div className="mb-1 flex items-center gap-2"><Users size={18} color="var(--primary)" /><p className="font-extrabold">First-date safety tips</p></div>
        <UL items={[
          'Do a video call first — it\u2019s the easiest way to confirm they look and sound like their photos.',
          'Meet in a busy public place, and arrange your own transport there and back.',
          'Tell a friend or family member who you\u2019re meeting, where, and when. Share your live location with them.',
          'Keep your first meetings short and daytime if you can. Don\u2019t leave drinks unattended.',
          'Don\u2019t share your home or work address, or your daily routine, early on.',
          'Trust your gut. If something feels off, leave — you don\u2019t owe anyone an explanation.',
        ]} />
      </Card>

      <Card>
        <div className="mb-1 flex items-center gap-2"><ShieldCheck size={18} color="var(--primary)" /><p className="font-extrabold">Common scam warning signs</p></div>
        <UL items={[
          'Asks for money, gift cards, crypto, an “emergency” loan or a UPI payment — never send money to someone you haven\u2019t met.',
          'Pushes you to move to WhatsApp/Telegram immediately, or sends links to “verify” or “invest”.',
          'Asks for your OTP, bank details, or intimate photos. We will never ask for your OTP.',
          'Their story doesn\u2019t add up, or they refuse to video call.',
        ]} />
      </Card>

      <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[var(--primary)]">
        <Link href="/legal/guidelines" className="inline-flex items-center gap-1.5"><FileText size={14} /> Community Guidelines</Link>
        <Link href="/legal/privacy" className="inline-flex items-center gap-1.5"><FileText size={14} /> Privacy Policy</Link>
      </div>
    </PageShell>
  );
}
