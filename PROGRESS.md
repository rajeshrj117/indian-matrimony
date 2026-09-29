# Matrimony conversion: progress snapshot

## Done
- Profile model: all matrimony fields (types.ts), community lists for all religions (communities.ts),
  horoscope option lists, public/private split (profile-fields.ts), firestore.rules allowlist.
- Sign-up wizard rewritten (8 steps + done): basics, religion, career, location, family, horoscope,
  about, partner preferences. Edit screen at /settings/matrimony (tabs), shared form components in
  src/components/profile-form/.
- Other member's profile page shows every matrimony section + "matches X of Y of your preferences".
- Removed: swipe/likes/super-like code, Tic-Tac-Toe, gifts, floating hearts, AI icebreaker and
  smart-reply routes, compatibility scoring, stale firestore.pre-overwrite.ts.
- Chat moderation rewritten for matrimony (romantic talk allowed; sexual / casual-relationship /
  dowry / scam flagged). Search now targets the opposite gender.

- Own Profile tab rebuilt: completeness bar (with tappable missing-field chips), photos, bio editor
  with AI enhance, full ProfileDetails view (incl. private birth time/place), link to
  /settings/matrimony for editing. Old dating detail/location editors removed.

- Search filters extended (FilterSheet + SearchFilters in matrimony.ts): occupation, annual income,
  residency status, manglik, star, willing to relocate, and community as a searchable multi-select
  with "No bar" (No bar switches the community filter off; picking a community clears it).
  Saved searches from the old string-based `community` are migrated by normalizeFilters().

## Still to do
- Rename remaining "Flirty" branding to APP_NAME: landing page, auth, legal pages, help, premium,
  i18n, manifest, layout metadata, service worker title. Premium copy still mentions super likes.
- firestore.rules: remove /likes rules; delete scripts/data.ts mock dating data if unused.
- Deploy: `firebase deploy --only firestore:rules` is required for the new fields to save.
- Known: `npm run lint` reports pre-existing react-hooks errors; tsc reports only the pre-existing
  LayoutProps error (Next generates that type at build time).

## Mutual compatibility (added)
- `src/lib/matrimony.ts`: `preferenceCriteria()` (per-criterion met/not met), `mutualCompatibility()`
  (both directions: does *they* fit *your* preferences, and do *you* fit *theirs*), `rankByCompatibility()`,
  `MUTUAL_MATCH_MIN` (60). Score = geometric mean of the two fit ratios, so a lopsided pair scores low;
  if only one side has set preferences the score uses that side alone and `twoWay` is false.
  `preferenceMatch()` is kept as a thin wrapper.
- `src/components/Compatibility.tsx`: `CompatibilityBadge` (pill on result cards, e.g. "86% mutual match")
  and `CompatibilityPanel` (profile page: overall %, two bars, met/unmet criterion chips).
- Search: default sort "Best match first" (tap to switch to Recommended); new "Mutual matches only (60%+)"
  filter. Profiles with nothing to compare stay visible. Saved searches migrate via `normalizeFilters()`.
- Cards on Search and Interests show the badge; `ProfileDetails` shows the panel instead of the old one-way bar.
- No Firestore rule/index changes: partner preferences were already public.
