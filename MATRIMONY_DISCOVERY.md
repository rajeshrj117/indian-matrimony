# Discovery rebuild: swipe -> search, interests, shortlist, viewed-you

## What changed
- `/discover` is now **Search**: keyword box, filter sheet (age, height, marital status, religion,
  community, mother tongue, state, education, diet, verified-only, with-photo-only), result cards.
  Filters are remembered on the device. Default age window comes from the member's own age/gender.
- `/interests` (old `/explore` redirects here): **Received, Sent, Accepted, Shortlist, Viewed you**.
- Send interest -> recipient Accepts or Declines. Accepting creates the `matches/{pair}` doc, which is
  what unlocks chat. Declined is final (the sender cannot re-send). Sender can withdraw a pending interest.
  If A sends interest to B while B's interest to A is pending, it is auto-accepted.
- Shortlist is private; the other person is never told.
- "Viewed you" is recorded when someone opens your profile (once per 30 min per pair).
- New `Marriage profile` page (`/settings/matrimony`) collects the fields the filters use.
  New sign-ups land there right after profile setup; existing members see a banner on Search.
- Profile page: Send interest / Accept / Decline / Message / Shortlist replace Like / Super like / Pass.
- Daily interest cap: 10 free, 40 premium (client-side guard, stored in the old swipe counters).

## Files
New: `src/lib/matrimony.ts`, `src/lib/brand.ts`, `src/lib/useInterestActions.ts`,
`src/components/{ProfileCard,FilterSheet,Toast}.tsx`, `src/app/(main)/interests/page.tsx`,
`src/app/settings/matrimony/page.tsx`
Rewritten: `src/app/(main)/discover/page.tsx`, `src/app/(main)/explore/page.tsx` (redirect)
Edited: `firestore.rules`, `src/lib/{firestore,types,profile-fields,i18n}.ts(x)`, `src/lib/server/notify-auth.ts`,
`src/components/BottomNav.tsx`, `src/app/user/[id]/page.tsx`, notifications page, settings page,
profile-setup redirect, account-delete route (now also removes interests, shortlists, views).

## Deploy checklist
1. Copy your own `.env.local` back in (it was left out of this zip on purpose).
2. `firebase deploy --only firestore:rules` — required; without it Search still loads but
   interests/shortlist/views are rejected and new profile fields cannot be saved.
3. No new Firestore indexes are needed.

## Known follow-ups
- Old swipe code (`recordSwipe`, `getCandidates`, `likes` collection, super likes) is unused but still in
  `firestore.ts`; remove it once existing data no longer matters.
- Search loads up to 400 profiles and filters on the device. Move to Typesense/Algolia/Meilisearch
  before the member base grows past a few thousand.
- Premium page and landing/onboarding copy still say "Flirty". Brand name lives in `src/lib/brand.ts`
  ("Jodi" is a placeholder).
- "Viewed you" has no opt-out yet; consider a hide-my-views setting.
