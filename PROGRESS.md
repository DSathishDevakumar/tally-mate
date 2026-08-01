# Progress Log — Grocery Shop Credit Ledger

This is a detailed record of what's been built so far, why it was built that way,
and what's still ahead. For "how do I run this," see `README.md` — this file is
the "what happened and why" companion to it.

## Overview

The app digitizes a kirana/grocery shop's monthly credit-notebook workflow. Phase 1
(schema + scaffolding + Google Sign-In) is done. Since then, two feature modules have
shipped: **Customer Management** and **Daily Entry (manual)**. Next up is
**Voice-to-data**, which is being handed off to a fresh conversation — see
"Handoff: Voice-to-data" at the bottom of this file for exactly what that needs.

## Database schema (`backend/prisma/schema.prisma`)

- **Multi-tenancy from day one**: every business table carries a `shopId`, even
  though only one shop exists right now, so onboarding a second shop later needs
  no schema redesign.
- **Models**:
  - `Shop` — the tenant root.
  - `User` — mirrors a signed-in person, linked to Supabase Auth via
    `supabaseUserId`. `role` is `SUPER_ADMIN` / `SHOP_OWNER` / `CUSTOMER`;
    `shopId` is nullable only for `SUPER_ADMIN`.
  - `Customer` — a shop's customer ledger record; optionally linked to a `User`
    for read-only self-view login.
  - `Product` — catalog with unit + standard price. Not used by Daily Entry yet
    (see schema change below) — still here for whenever itemized entries or a
    Product Catalog screen get built.
  - `LedgerEntry` — the daily notebook line item. Carries a `source` enum
    (`MANUAL` / `VOICE` / `PHOTO`) plus `rawVoiceText`, `sourcePhotoUrl`, and
    `aiConfidence` for audit/debugging of AI extraction. Critically, it also
    carries `isConfirmed` — AI-extracted rows are never trusted data until a
    human reviews them, matching the brief's "never auto-save AI output" rule.
    **Schema change since Phase 1**: `productId`, `quantity`, and `unitPrice`
    are now optional. Real kirana notebooks log one total per customer visit,
    not itemized line items, so `totalAmount` + a free-text `note` (e.g. "rice,
    oil, soap") is the primary shape now; the product fields stay available
    for later if itemized entry or AI-structured extraction wants them.
  - `Bill` — monthly rollup (`previousBalance` + `currentMonthTotal` = `totalDue`),
    status `UNPAID` / `PARTIAL` / `PAID`, optional generated PDF URL.
  - `Payment` — against a customer and optionally a specific bill.
  - `Notification` / `DeviceToken` — push notification log and FCM token storage.
- **Datasource** uses both `url` (pooled connection, runtime queries) and
  `directUrl` (unpooled, used by `prisma migrate`) — Supabase's pooler doesn't
  support the connection type Prisma Migrate needs.

## Backend (`backend/`)

Express + TypeScript + Prisma, dev server via `tsx watch`.

- `src/config/` — `env.ts` (fails fast on missing required vars), `prisma.ts`
  (singleton `PrismaClient`, reused across hot reloads), `supabase.ts`
  (service-role Supabase client for server-side token verification).
- `src/middleware/auth.ts` — `requireAuth` verifies the Supabase access token via
  `supabaseAdmin.auth.getUser(token)`, then resolves it to our own `User` row;
  `requireRole` gates routes by role.
- `src/controllers/authController.ts` — `syncUser` (called once by the app right
  after Supabase sign-in; provisions the `User` row) and `getMe`. See "Bootstrap
  rule" below for the shop-creation logic inside `syncUser`.
- `src/routes/` — `auth.ts` is fully wired (`POST /api/auth/sync`,
  `GET /api/auth/me`); `customers.ts`, `products.ts`, `entries.ts`, `bills.ts`,
  `payments.ts`, `reports.ts` are stubbed `Router()`s behind `requireAuth`,
  each with a `// TODO` naming the module it's waiting on.
- `src/app.ts` / `src/index.ts` — Express app wiring + listener.

**Verified**: `npm install`, `npx prisma generate`, `npx tsc --noEmit` all ran
clean. Booted the server with placeholder env values and confirmed
`GET /health` returns `{"status":"ok","timestamp":"..."}`.

## Mobile app (`mobile/`)

Expo SDK 57, TypeScript, Expo Router for file-based routing, `react-native-web`
for browser preview.

- `app/_layout.tsx` — root layout, wraps `AuthProvider`, redirects between the
  `(auth)` and `(app)` route groups based on session state (guards both on
  mount via `app/index.tsx`'s `<Redirect>` and on navigation via a `useEffect`
  in the root layout).
- `app/(auth)/sign-in.tsx` — the Google Sign-In screen.
- `app/(app)/_layout.tsx` — tab navigator (Home, Customers, Daily Entry,
  Billing, Reports); each non-Home tab renders `src/components/PlaceholderScreen.tsx`
  with a short description of what that module will do.
- `src/lib/supabase.ts` — Supabase client configured for PKCE flow with
  AsyncStorage session persistence (React Native has no URL bar to inspect, so
  `detectSessionInUrl` is off).
- `src/lib/api.ts` — thin authenticated fetch wrapper that attaches the
  Supabase access token and calls the backend (`syncUser`, `getMe`).
- `src/context/AuthContext.tsx` — owns session state, listens to
  `supabase.auth.onAuthStateChange`, and on first sign-in calls `syncUser()`
  to provision the backend `User` row. `signInWithGoogle` drives the OAuth
  flow (see below).

**Verified**: `npx expo export --platform web` bundled cleanly — 865 modules,
zero errors — against placeholder env values, exercising the full route tree
(layouts, auth context, all placeholder screens).

## Auth flow end to end

1. User taps **Sign in with Google** on `(auth)/sign-in.tsx`.
2. `supabase.auth.signInWithOAuth({ provider: "google", skipBrowserRedirect: true })`
   gets a hosted OAuth URL from Supabase without redirecting yet.
3. `WebBrowser.openAuthSessionAsync` opens that URL in an in-app browser sheet;
   the user completes Google's consent screen.
4. Supabase redirects back to the app's redirect URI (`expo-auth-session`'s
   `makeRedirectUri()` — works inside plain Expo Go, no dev client needed) with
   a PKCE `code` param.
5. The app exchanges that code for a session via
   `supabase.auth.exchangeCodeForSession(code)`.
6. `AuthContext` sees the new session, calls the backend's `getMe`; on first
   ever sign-in that 404s, so it falls back to `POST /api/auth/sync`, which
   verifies the token server-side and provisions the `User` row.
7. Root layout's redirect effect sees `session && appUser` and sends the user
   from `(auth)` into `(app)`, landing on the Home tab.

## Customer Management (`backend/src/controllers/customersController.ts`, `mobile/app/(app)/customers/`)

- **Running balance is computed, not stored**: `openingBalance` + confirmed
  `LedgerEntry`s not yet attached to a bill (`billId: null`) + outstanding
  amount on any `UNPAID`/`PARTIAL` bills. Recomputed on every read via Prisma
  `aggregate`/`groupBy` (list endpoint batches this in 2 queries total, not
  N+1 per customer) so it stays correct as Daily Entry and Billing add data.
- Backend routes: `GET/POST /api/customers`, `GET/PATCH /api/customers/:id`,
  all scoped to `req.appUser.shopId` and gated to `SHOP_OWNER` only (Customer
  self-view is a separate future module).
- Mobile: `app/(app)/customers/` is a nested `Stack` inside the Customers tab
  (`_layout.tsx` → `index.tsx` list, `new.tsx` create form, `[id].tsx`
  view/edit with an active/inactive `Switch`). This list-stack-inside-a-tab
  pattern is reused identically for Daily Entry below — reuse it again for
  future modules (Billing, Reports) rather than inventing a new navigation
  shape.

## Daily Entry — manual (`backend/src/controllers/entriesController.ts`, `mobile/app/(app)/daily-entry/`)

- Backend routes: `GET /api/entries?date=YYYY-MM-DD` (defaults to today),
  `POST /api/entries`, `PATCH/DELETE /api/entries/:id`. Editing/deleting is
  blocked once an entry has `billId` set (already rolled into a bill) —
  returns `409`.
- Mobile: same nested-stack pattern as Customers. `index.tsx` shows today's
  entries with a running total and pull-to-refresh; `new.tsx` has a
  `@react-native-picker/picker` customer dropdown (active customers only) +
  amount + optional note; `[id].tsx` edits or deletes, and renders a read-only
  "already billed" state once `billId` is set.
- Added shared backend infra while building this: `src/utils/asyncHandler.ts`
  + `src/middleware/errorHandler.ts` — Express 4 doesn't auto-catch rejected
  promises in route handlers, so every controller function needs wrapping in
  `asyncHandler(...)` at the route-registration site (see `routes/entries.ts`
  or `routes/customers.ts` for the pattern) or errors hang the request.
- Fixed along the way: `@types/express` was pinned to v5 while `express`
  itself is v4 — caused `req.params.id` to type as `string | string[]`.
  Pinned to `^4.17.21` to match the runtime version.

## Key architecture decisions

- **Monorepo, single repo** — one dev (for now), so a single repo with
  `backend/` and `mobile/` side by side beats split repos; avoided npm
  workspaces to sidestep Metro's known pain points resolving hoisted
  dependencies in RN monorepos.
- **TypeScript everywhere** — Prisma generates types automatically, and this
  app leans on sharing shapes (`AppUser`, roles) between backend responses and
  mobile consumption.
- **Supabase OAuth web-redirect over native Google Sign-In SDK** — chosen so
  the app runs in plain Expo Go during early development, with no dev client /
  EAS build required. Trade-off: slightly less polished UX (in-app browser
  sheet vs. native consent sheet) — worth revisiting once the app needs an EAS
  build for other native modules anyway.
- **`supabase.auth.getUser(token)` over manual JWT verification** — simpler and
  more reliable than hand-rolling HS256/JWKS verification; costs one network
  call per request but is the officially recommended pattern and easy to swap
  later if latency becomes an issue.
- **"First user to sync becomes the Shop Owner" bootstrap rule**
  (`authController.ts`) — since this app starts with exactly one shop, the
  very first person to sign in gets an auto-created placeholder `Shop` and the
  `SHOP_OWNER` role. This is explicitly a phase-1 shortcut, flagged with a
  comment in the code — it needs replacing with real Super Admin shop
  onboarding before a second shop is ever added.

## Not built yet

Daily Entry (voice-to-data / photo-to-data), Product Catalog, Monthly Billing &
Settlement, Payment Tracking, Reminders & Notifications, Reports & Analytics,
Customer Self-View, offline-first SQLite sync, and push notifications. These
come one module at a time per the brief.

## Verified / smoke-tested

- Google Sign-In: confirmed live end to end against the real Supabase project
  and Google Cloud OAuth client — a real `Shop` + `User` row exist in the
  database from an actual sign-in (not just a bundling test).
- Customer Management: both projects typecheck clean; a full round-trip
  smoke test against the real database (create → get → update → list →
  validation rejection → cleanup) passed.
- Daily Entry (manual): both projects typecheck clean; a full round-trip
  smoke test against the real database (create customer → empty list →
  create entry → list → update → validation rejections → confirmed the
  customer's running balance reflects the unbilled entry → delete → list
  empty again → cleanup) passed.
- Smoke tests were run via temporary throwaway scripts (minting a real
  session token through `supabaseAdmin.auth.admin.generateLink` +
  `verifyOtp`, since there's no password-based test login) and deleted
  afterward — not committed to the repo.

## Handoff: Voice-to-data

Starting a fresh conversation for this on purpose — Gemini prompt-engineering
deserves focused iteration separate from scaffolding work, and it needs a key
you haven't gotten yet.

**Before that conversation can build anything**: get a free-tier Gemini API
key at [aistudio.google.com](https://aistudio.google.com) and add it to
`backend/.env` as `GEMINI_API_KEY` (not yet in `.env.example` — add it there
too when wiring this up).

**What it needs to build**, using patterns already established above:
- A backend endpoint (e.g. `POST /api/entries/voice`) that takes raw
  transcribed text, calls Gemini to extract `{ customerName, amount, note }`,
  fuzzy-matches `customerName` against the shop's existing `Customer` rows,
  and returns a *draft* — it must NOT write to `LedgerEntry` directly.
- A mobile screen using on-device speech-to-text (not yet chosen/installed —
  research an Expo-compatible library) that sends the transcript to that
  endpoint, then shows a **confirmation/edit screen** (reuse the form fields
  from `app/(app)/daily-entry/new.tsx`) pre-filled with the draft. Only on
  explicit confirm does it call the existing `POST /api/entries` — this is
  the brief's hard rule ("AI-extracted data must always go through human
  confirmation before saving") and `LedgerEntry.isConfirmed` /
  `rawVoiceText` / `aiConfidence` already exist in the schema for exactly
  this.
- Reuse `src/lib/api.ts`'s `authedFetch` pattern for the new endpoint call,
  and the Customers/Daily-Entry nested-stack navigation pattern if this
  becomes its own route rather than a mode within `daily-entry/new.tsx`.
