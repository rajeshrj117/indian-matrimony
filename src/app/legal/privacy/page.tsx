'use client';

import PageShell, { H, P, UL } from '@/components/PageShell';

export default function PrivacyPolicyPage() {
  return (
    <PageShell title="Privacy Policy">
      <P>Last updated: September 2026. This policy explains what Flirty collects, why, who can see it, and the choices you have. It is written to align with India&apos;s Digital Personal Data Protection Act, 2023.</P>

      <H>What other members can see</H>
      <UL items={[
        'Your name, age, photos, bio, interests, job, city-level location (about 10 km precision), verified badge and online status (you can hide last seen).',
        'They can never see your phone number, email, date of birth, exact location, blocked list, or who you have reported.',
      ]} />

      <H>What we collect and why</H>
      <UL items={[
        'Phone number / email: to sign you in and prevent duplicate accounts. Stored privately.',
        'Date of birth: to confirm you are 18+. Only your age is shown to others.',
        'Exact location (only if you allow it): to show nearby people. Others only see an approximate area and distance.',
        'Photos and verification selfie: to show your profile and confirm you are the person in your photos. Photos are checked automatically for safety (nudity, violence, minors, duplicates). Selfies are visible only to you and our verification system.',
        'Messages: delivered between you and your match. Messages are encrypted in transit and stored on our cloud provider; they are not end-to-end encrypted. Our systems screen messages for scams, threats and explicit content, and moderators may review reported conversations.',
        'Usage and device data (e.g. push notification tokens, IP address for abuse prevention).',
      ]} />

      <H>Who we share data with</H>
      <P>
        Service providers that run the app (Google Firebase for hosting, database, authentication, storage and push notifications; AI providers
        such as Groq and Google Gemini to power suggestions and safety checks; a payment provider for Premium). We do not sell your personal data.
        We may disclose data when required by law or to protect someone&apos;s safety.
      </P>

      <H>Safety and moderation</H>
      <P>
        We use automated tools and human moderators to detect fake profiles, explicit content, harassment and scams. Reports about you are confidential.
        Accounts may be restricted or banned; for banned accounts we keep the phone/email on a block list so they cannot re-register.
      </P>

      <H>Retention and deletion</H>
      <UL items={[
        'You can download your data and delete your account any time in Settings \u2192 Privacy & Safety.',
        'Deleting your account removes your profile, photos, selfies, likes, matches, messages, notifications and identity claims from our systems.',
        'We may retain limited records where needed for safety or legal reasons (for example reports filed against an account and the block-list entry of a banned account).',
      ]} />

      <H>Your rights</H>
      <P>You can access, correct, download and erase your data, withdraw consent, and nominate someone to exercise your rights. Write to the Grievance Officer below.</P>

      <H>Children</H>
      <P>Flirty is only for people aged 18 or over. If we learn an account belongs to a minor, we delete it.</P>

      <H>Contact / Grievance Officer</H>
      <P><b>[Name], privacy@YOUR-DOMAIN.com, [postal address]</b>. We acknowledge requests within 24 hours.</P>
      <P>This document is a template written for engineering purposes — have it reviewed by qualified legal counsel and fill in the bracketed details before launch.</P>
    </PageShell>
  );
}
