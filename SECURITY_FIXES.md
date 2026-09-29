# Security & safety fixes — what changed and how to deploy

## ⚠️ Do this first: rotate your secrets
The zip you shared contained `.env.local` with live credentials (Firebase Admin private key, Groq key, and any
Gemini key). Treat them as leaked: **revoke the Firebase service-account key and generate a new one, and regenerate the
Groq/Gemini keys**, then update them in Vercel/hosting. This delivery does not include `.env.local`; use `.env.example`.

## Deploy order
1. `npm install` (adds `sharp`, `server-only`)
2. Set env vars from `.env.example` (`GEMINI_API_KEY`, `ADMIN_UIDS` at minimum)
3. Run the data migration (moves phone/email/DOB/exact GPS/block lists/push tokens out of public docs):
   `FIREBASE_ADMIN_* ... npm run migrate:private -- --dry-run` then without `--dry-run`
4. `firebase deploy --only firestore:rules,firestore:indexes,storage` (indexes deploys the `rateLimits` TTL policy)
5. Deploy the app. Grant yourself moderator access: `npm run set-admin -- <your-uid>` → open `/admin`
6. (Recommended) Turn on App Check: set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, deploy, then `ENFORCE_APP_CHECK=true`

## P0
| # | Issue | Fix |
|---|---|---|
| 1 | lat/lng on public user docs | Profiles split: `users/{uid}` = public allowlist (rules enforce `hasOnly`), `userPrivate/{uid}` = owner-only. Others see only `approxLatitude/Longitude` (~11 km grid); distance shown as `~N km`. Raw-coordinate location-label fallback removed. |
| 2 | phone/email/DOB public | Moved to `userPrivate`. Also moved: block list (blocked users could see who blocked them), FCM tokens, premium, prefs. |
| 3 | `/api/push/send` | Bearer-token auth; caller must have a real like/match with the recipient; blocks & notification prefs honoured; title/body/url built server-side (no arbitrary push text); per-pair + per-user rate limits. |
| 4 | `/api/notifications/create` | Same authorization; `fromUser` derived from caller's profile (was spoofable); Firestore rules now forbid client-created notifications. |
| 5 | Groq/Gemini endpoints | All require a signed-in user, size caps, per-user + per-IP rate limits (Firestore-backed, shared across serverless instances). Photo routes no longer `fetch()` user-supplied URLs (SSRF) — images are read via Admin Storage and must be in the caller's own folder. `face-verify` no longer leaks provider error details and has a daily attempt cap. |
| 6 | False "End-to-end encrypted" claim | Removed from the login screen; privacy policy states messages are encrypted in transit but not E2E. |

## P1
- **Account deletion** – `/api/account/delete` removes profile+private docs, Storage photos/selfies, likes, matches with all messages/typing/games, notifications, photo hashes, phone/email claims, then the Auth user. Keeps reports and (for banned accounts) a blocked-identity record.
- **Image moderation for all users** – `/api/groq/photo-policy` runs for every upload (not only men). Fails open only into the human review queue.
- **Explicit-content detection** – photos: nudity/sexual/violence/hate/minor/no-face with score; text: `text-safety.ts` for bios + messages (explicit, threats, harassment, scam money, off-platform/contact sharing).
- **Duplicate/fake-profile detection** – perceptual hash (dHash + LSH bands) of every photo; matches to other accounts are queued, and photos already on a *verified* account are rejected.
- **Abuse/spam detection** – blocked/flagged texts create `abuseSignals`; admin tab shows repeat offenders. Rules cap message length/shape.
- **Admin moderation dashboard** – `/admin` (reports, review queue, abuse signals; actions: dismiss / warn / restrict / suspend / ban / reinstate, with audit log).
- **Report escalation** – `POST /api/reports`: dedupe, rate limit, priority (critical/high/normal), auto-block for the reporter, auto-restrict for *underage* or 3+ distinct reporters, restricted/suspended/banned users can't like/message (enforced in rules) and are hidden from discovery.
- **Suspicious account/device limiting** – per-user and per-IP limits on every API route; optional App Check device attestation; banned phone/email can't re-register (`blockedIdentities` checked in `phoneIndex`/`emailIndex` rules).

## P2
Safety Center (`/settings/safety`, linked from Settings and the chat menu), verification-badge explainer, "only verified can message you" (always on — everyone must verify before messaging), first-date tips, scam warning signs, Indian helplines + one-tap 112, block/report shortcuts in chat, Privacy Policy and Community Guidelines pages (fill in the bracketed grievance-officer details and have counsel review).

## Extra holes found and fixed while in there
- Anyone could create a `matches` doc with any user (no mutual like required) and then message them → rules now require a mutual like, and `users` can't be rewritten on update.
- Likes/messages/notifications/reports had no field allowlists or length caps → added.
- Storage rules: `write` made deletes impossible (`request.resource` is null) and allowed SVG → split create/delete and limited to JPEG/PNG/WebP/HEIC.

## Known limitations / not fixed (needs your decision)
- **Premium is client-writable** (`upgradeToPremium` sets `premium: true` from the browser with no payment verification). Verify Razorpay payments server-side (webhook or `/api/payments/verify`) and make `premium*` fields server-only before charging real money.
- Message screening is client-side (Firestore can't run code on write). A determined attacker can bypass it; add a Cloud Function on `matches/*/messages` if you want server enforcement. Rules do cap length and require verified senders.
- `getCandidates` is still a client-side `limit(100)` scan; move discovery to a server route when you grow (it also lets you drop the public coarse coordinates entirely and return only a distance bucket).
- A user who was blocked by someone can still see that person in Discover (their block list is now private); the like is rejected by rules.
- A verified user who later changes their first photo stays verified — consider re-verifying when `images[0]` changes.
- Firestore rules were reviewed by hand and the app builds/type-checks, but I could not run the Firestore emulator here. Run your flows against `firebase emulators:start` (or the Rules Playground) before deploying.
