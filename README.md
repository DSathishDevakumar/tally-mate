# Grocery Shop Credit Ledger

Digitizes the kirana/grocery shop credit-notebook workflow: give products on credit
through the month, then bill the customer once a month.

## Repo layout

```
backend/   Node.js + Express + Prisma API, connects to Supabase Postgres
mobile/    Expo (React Native, TypeScript) app, uses Expo Router
```

Every business table in `backend/prisma/schema.prisma` carries a `shopId`, so the
schema already supports multiple shops even though only one shop is onboarded today.

## Status

- Phase 1 scaffolding: full Prisma schema, backend project structure, Google
  Sign-In working end to end (verified live against a real Supabase + Google
  Cloud project).
- **Customer Management**: done (list/add/edit, running balance).
- **Daily Entry (manual)**: done (log a customer + amount + optional note per
  visit — not itemized; see `PROGRESS.md` for why).

Not built yet: Voice-to-data, Photo-to-data, Product Catalog, Billing, Payment
Tracking, Reminders, Reports, Customer Self-View, offline SQLite sync, and push
notifications. See `PROGRESS.md` for the detailed build log and what's queued
next.

## One-time account setup

You need free accounts/projects in these four places before anything will run
end-to-end. None of this involves paid tiers.

### 1. Supabase (Postgres + Auth)

1. Create a project at [supabase.com](https://supabase.com).
2. **Database URL**: Project Settings → Database → Connection string. Copy both the
   "Transaction" pooler URL (port 6543, for `DATABASE_URL`) and the "Session" pooler
   or direct URL (port 5432, for `DIRECT_URL` — Prisma Migrate needs a non-pooled
   connection).
3. **API keys**: Project Settings → API. Copy the Project URL, `anon` `public` key,
   and `service_role` key.
4. **Enable Google auth provider**: Authentication → Providers → Google → enable it.
   You'll fill in the Client ID/Secret from step 2 below, and Supabase will show you
   a callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) — copy it,
   you need it next.

### 2. Google Cloud (OAuth client for Google Sign-In)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. APIs & Services → OAuth consent screen → configure it (External, fill in app name
   and your email; you can stay in "Testing" mode with your own account as a test
   user while developing).
3. APIs & Services → Credentials → Create Credentials → OAuth client ID →
   **Web application** (Supabase's hosted auth page performs the OAuth handshake
   server-side, so this must be a Web client, not an Android/iOS client).
4. Under "Authorized redirect URIs," paste the Supabase callback URL from step 1.4.
5. Copy the generated Client ID and Client Secret into Supabase's Google provider
   settings (Authentication → Providers → Google), then Save.

### 3. Firebase (push notifications — needed later, not for this phase)

Create a project at [console.firebase.google.com](https://console.firebase.google.com)
when you get to the Reminders & Notifications module. Not required to run auth/schema.

### 4. Gemini API (AI extraction — needed later, not for this phase)

Get a free-tier key at [aistudio.google.com](https://aistudio.google.com) when you
get to Voice-to-data / Photo-to-data. Not required to run auth/schema.

## Running the backend

```bash
cd backend
cp .env.example .env    # fill in DATABASE_URL, DIRECT_URL, SUPABASE_* from above
npm install
npx prisma migrate dev --name init   # creates tables in your Supabase Postgres
npm run dev                          # http://localhost:4000
```

`GET /health` should return `{ "status": "ok" }`.

## Running the mobile app

```bash
cd mobile
cp .env.example .env    # fill in EXPO_PUBLIC_SUPABASE_URL / ANON_KEY, EXPO_PUBLIC_API_URL
npm install
npm run start            # opens Expo Dev Tools; scan the QR code with Expo Go
```

`EXPO_PUBLIC_API_URL` needs to point at a host your phone/emulator can reach — see
the comments in `mobile/.env.example` for the right value per platform (localhost
works for iOS Simulator; Android emulator needs `10.0.2.2`; a physical phone needs
your computer's LAN IP).

Tap **Sign in with Google** — it opens the Supabase-hosted Google consent screen in
an in-app browser, then redirects back into the app, exchanges the auth code for a
Supabase session, and calls the backend to provision your `User` row. The first
person to ever sign in becomes the `SHOP_OWNER` of an auto-created placeholder Shop
(rename it once shop settings exist) — see the comment in
`backend/src/controllers/authController.ts` for why, and what to replace it with once
proper multi-shop onboarding exists.

## Next steps

Build one module at a time: Customer Management → Daily Entry (manual) →
Voice-to-data → Photo-to-data → Billing → offline sync → push notifications.
