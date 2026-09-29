# Flirty — Setup Guide

What changed: the app now runs on a real backend instead of localStorage mocks.

- **Firebase Auth** — real phone OTP (+ Google sign-in)
- **Firestore** — profiles, swipes/likes, matches, chat messages (all realtime)
- **Firebase Storage** — profile photo uploads
- **Groq (llama-3.3-70b-versatile)** — "AI Enhance" bio button on profile setup, and AI icebreaker suggestions in chat

Nothing will work until you plug in real Firebase + Groq credentials. Follow these steps in order.

---

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it (e.g. `flirty-app`) → finish the wizard.
2. In the project, click the **Web** icon (`</>`) to register a web app (no Firebase Hosting needed — you're deploying on Vercel).
3. Copy the `firebaseConfig` values shown — you'll paste these into `.env.local` in step 5.

## 2. Turn on Phone Authentication (with test numbers first)

1. Firebase console → **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Phone**.
3. Enable **Google** too (one click, no extra config) since the app also has a "Continue with Google" button.
4. Still on the Phone provider screen, scroll to **Phone numbers for testing** and add a few, e.g.:
   - `+91 9999999999` → code `123456`
   - `+91 8888888888` → code `654321`
   
   These numbers never receive a real SMS and never cost money — perfect for testing your Vercel deployment before you're ready to pay for real SMS.
5. **reCAPTCHA**: phone auth needs invisible reCAPTCHA, which Firebase handles automatically. No setup needed, but the domain you deploy to (your `*.vercel.app` URL and any custom domain) must be added under **Authentication → Settings → Authorized domains**. `localhost` is already allowed by default.
6. When you're ready for real users, this same flow works with real numbers — you just need to move Firebase to the **Blaze (pay-as-you-go)** plan (Phone Auth SMS isn't free past a small quota, similar to what you set up for Velai Vendum).

## 3. Turn on Firestore

1. **Build → Firestore Database → Create database** → start in **production mode** → pick a region close to India (e.g. `asia-south1`).
2. Deploy the security rules from `firestore.rules` in this repo: console → Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.

## 4. Turn on Storage

1. **Build → Storage → Get started** → production mode → same region.
2. Deploy `storage.rules` the same way: **Rules** tab → paste contents of `storage.rules` → **Publish**.

## 5. Get a Groq API key

1. https://console.groq.com/keys → **Create API Key** → copy it.
2. This key is used **server-side only** (in `/api/groq/*` routes) — it's never sent to the browser.

## 5b. Enable push notifications (delivery receipts work with no extra setup — this step is only for push)

Push notifications need two separate credentials:

1. **VAPID key (client-side)** — Firebase console → **Project settings → Cloud Messaging → Web Push certificates** → **Generate key pair**. Copy the value into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
2. **Service account (server-side, used to actually send pushes)** — Firebase console → **Project settings → Service accounts → Generate new private key**. This downloads a JSON file — copy three fields from it into your env vars:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (keep it on one line, with `\n` written literally — that's how it already looks in the downloaded JSON, just paste it as a quoted string)

Without these two, the app still works fine — "Enable notifications" in Settings will silently no-op, and in-app notifications (the bell) still work over Firestore realtime listeners. You only need this for actual OS-level push notifications when the tab/app is closed.

## 6. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from steps 1 and 5:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
GROQ_API_KEY=...
```

## 7. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, go through onboarding, and sign in with one of your **test phone numbers** (e.g. `9999999999` + OTP `123456`). Create a profile, then open a second browser (or incognito window) with a different test number to create a second account — swipe both ways on each other to test matching and chat.

## 8. Deploy to Vercel

1. Push this repo to GitHub (or `vercel` CLI directly).
2. In Vercel → **New Project** → import the repo.
3. Under **Environment Variables**, add the same 7 keys from `.env.local` (all of `NEXT_PUBLIC_FIREBASE_*` plus `GROQ_API_KEY`).
4. Deploy.
5. Back in Firebase console → **Authentication → Settings → Authorized domains** → add your `*.vercel.app` URL (and your custom domain later). Without this, phone/Google auth will fail on the deployed site with an `auth/unauthorized-domain` error.

## Testing checklist

- [ ] Onboarding → Sign in with a Firebase **test** phone number + its fixed OTP
- [ ] Profile setup: add a photo, write a bio, tap **AI Enhance** (uses Groq), pick interests, finish
- [ ] Create a second test account (second browser/incognito) with a different test number, opposite `interestedIn`
- [ ] Swipe/like each other from **Discover** → confirm the "It's a Match!" screen appears for both
- [ ] Open **Chats** → confirm the match appears, open it, send messages both ways, confirm realtime delivery
- [ ] In chat, tap the ✨ icon → confirm 3 AI icebreaker suggestions appear (Groq)
- [ ] **Explore → Likes you**: like one account from the other without matching back yet, confirm it shows up
- [ ] **Profile** tab: edit bio, change photo, toggle dark mode, logout, log back in with the same test number → profile persists

## Notes / known trade-offs (given it's an early-stage build)

- Candidate matching (`getCandidates`) filters by gender-vs-`interestedIn` only, not real GPS distance — "distance" labels are cosmetic until you wire real geolocation like you did for Velai Vendum.
- Firestore rules are permissive on reads (any signed-in user can read any profile) since Discover needs to browse everyone — this is standard for a dating app but means don't put anything in a profile you don't want other users to see.
- No content moderation on photos or bios yet — worth adding before public launch, especially given past experience with sensitive content on Velai Vendum.
