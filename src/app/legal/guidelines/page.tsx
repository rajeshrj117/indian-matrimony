'use client';

import PageShell, { H, P, UL } from '@/components/PageShell';

export default function GuidelinesPage() {
  return (
    <PageShell title="Community Guidelines">
      <P>Flirty is for adults (18+) looking for genuine connections. These rules keep it safe and respectful. Breaking them can lead to a warning, a restriction, or a permanent ban.</P>

      <H>1. Be real</H>
      <UL items={[
        'Use your own, recent photos of yourself. No stolen, AI-generated, celebrity or heavily edited photos.',
        'Be honest about your name, age and basics. One account per person.',
        'Don\u2019t impersonate anyone.',
      ]} />

      <H>2. Be respectful</H>
      <UL items={[
        'No harassment, hate speech, threats, stalking, or repeated messaging after someone stops replying.',
        'No unsolicited sexual messages or images. Consent matters — “no” or silence means stop.',
        'No discrimination based on religion, caste, race, gender, sexuality, disability or region.',
      ]} />

      <H>3. Keep it safe</H>
      <UL items={[
        'No nudity or sexually explicit photos. No sexual services, escorting or paid meet-ups.',
        'No violence, gore, weapons pointed at people, or hate symbols.',
        'No minors — anyone under 18 is removed immediately.',
        'Don\u2019t share other people\u2019s private information or photos without their permission.',
      ]} />

      <H>4. No scams or spam</H>
      <UL items={[
        'Never ask for money, gift cards, crypto, loans, OTPs or bank details.',
        'No promotion of products, investment schemes, apps, or other services.',
        'No links or phone numbers in your public bio.',
      ]} />

      <H>5. Reporting &amp; enforcement</H>
      <P>
        Use <b>Report</b> on any profile or chat. Reports are confidential — the person you report is never told who reported them.
        Serious reports (for example a suspected minor) restrict the account immediately while our team reviews it.
        Depending on severity we may warn, restrict, suspend or permanently ban an account, and we may block the phone number/email
        from re-registering. If you think we got it wrong, write to <b>support@YOUR-DOMAIN.com</b>.
      </P>

      <H>6. Grievance Officer</H>
      <P>
        In line with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, complaints can be sent to our
        Grievance Officer: <b>[Name], grievance@YOUR-DOMAIN.com, [postal address]</b>. We acknowledge complaints within 24 hours and aim to resolve them within 15 days.
      </P>
      <P>Emergency? Call <a href="tel:112" className="font-bold text-[var(--primary)]">112</a>. More help in the Safety Center.</P>
    </PageShell>
  );
}
