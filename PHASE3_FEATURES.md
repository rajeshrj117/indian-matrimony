# Phase 3 Matrimony Features

Implemented in this build:

- Contact-number request with explicit owner approval
- WhatsApp request with explicit owner approval and WhatsApp hand-off after consent
- Premium Messaging: Premium members can send an intro before a match; recipient can accept/decline
- Spotlight: Premium one-hour profile boost, surfaced at the top of Discover results
- Advanced Search: Premium-gated entry to detailed matrimonial filters
- Who Viewed You: Premium-gated and backed by the existing profileViews collection
- Hidden / Private Photos: owner-only private gallery plus access requests and approval
- Horoscope Compatibility: star, rashi and Manglik compatibility signal
- Parent / Family Account: invite parent, sibling or relative with profile/matches permissions
- AI Compatibility Explanation: server-side Groq endpoint with a deterministic fallback when no GROQ_API_KEY is configured
- Daily Curated Matches: daily deterministic shortlist ranked from compatibility and profile signals
- Matrimony Tools hub: `/matrimony-tools`
- Contact Requests screen: `/contact-requests`
- Premium inbox: `/premium-inbox`
- Family account: `/family-account`
- Daily matches: `/daily-matches`
- Horoscope compatibility: `/horoscope/[id]`

## Firebase deployment notes

Deploy the updated rules as part of the Firebase release:

- `firestore.rules`
- `storage.rules`

For AI explanations, configure `GROQ_API_KEY` in the server/Vercel environment. The feature still returns a local fallback explanation if the key is absent or the AI request fails.

For production, connect family invitations to your email/SMS provider and keep the explicit consent flow for phone/WhatsApp sharing.
