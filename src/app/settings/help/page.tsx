'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, MessageCircle, Mail, ShieldAlert } from 'lucide-react';

const FAQS = [
  { q: 'How do matches work?', a: 'When you and another person both like each other, it\'s a match — you can then message each other from the Chats tab.' },
  { q: 'How do I get verified?', a: 'Go to Profile → Verification and take a quick selfie. Verified profiles get a blue checkmark and show up higher in Discover.' },
  { q: 'How do I block or report someone?', a: 'Open their profile or chat, tap the menu icon, and choose Block or Report. You can manage your blocked list from Profile → Privacy & Safety.' },
  { q: 'Can I change my photos later?', a: 'Yes — tap the camera icon on your profile photo anytime to upload a new one.' },
  { q: 'How do I cancel Flirty Premium?', a: 'Go to Profile → Flirty Premium → Manage plan, and turn off auto-renew. You\'ll keep premium features until the period ends.' },
  { q: 'Is my data safe?', a: 'Your data is stored securely and only shared with matches you choose to talk to. You can download or delete your data anytime from Privacy & Safety.' },
];

export default function HelpPage() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <p className="text-lg font-black text-[var(--text)]">Help &amp; Support</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="flex gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3.5">
          <ShieldAlert size={20} color="#2563EB" className="shrink-0" />
          <p className="flex-1 text-xs font-semibold leading-[17px] text-blue-900">
            Safety first: video call before meeting, meet in public places, and tell a friend where you&apos;re going.
          </p>
        </div>

        <p className="mb-2 mt-5 px-1 font-extrabold text-[var(--text)]">Frequently asked questions</p>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {FAQS.map((f, i) => (
            <div key={f.q} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="font-bold text-[var(--text)]">{f.q}</span>
                <ChevronDown
                  size={16}
                  color="var(--muted2)"
                  style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </button>
              {open === i && <p className="px-4 pb-4 text-sm leading-5 text-[var(--muted)]">{f.a}</p>}
            </div>
          ))}
        </div>

        <p className="mb-2 mt-5 px-1 font-extrabold text-[var(--text)]">Contact us</p>
        <div className="flex flex-col gap-2.5">
          <a
            href="mailto:support@flirty.app?subject=Flirty%20support%20request"
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]"><Mail size={16} color="var(--text)" /></span>
            <span>
              <p className="font-bold text-[var(--text)]">Email support</p>
              <p className="text-xs text-[var(--muted)]">support@flirty.app • replies within 48 hours</p>
            </span>
          </a>
          <a
            href="https://wa.me/910000000000?text=Hi%20Flirty%20team%2C%20I%20need%20help%20with..."
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"><MessageCircle size={16} color="#10B981" /></span>
            <span>
              <p className="font-bold text-[var(--text)]">WhatsApp us</p>
              <p className="text-xs text-[var(--muted)]">Fastest way to reach the team</p>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
