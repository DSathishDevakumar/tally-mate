# Progress Log — Grocery Shop Credit Ledger

This is a detailed record of what's been built so far, why it was built that way,
and what's still ahead. For "how do I run this," see `README.md` — this file is
the "what happened and why" companion to it.

## Overview

The app digitizes a kirana/grocery shop's monthly credit-notebook workflow. Phase 1
(schema + scaffolding + Google Sign-In) is done. Since then, feature modules have
shipped: **Customer Management**, **Daily Entry (manual)**,
**Daily Entry (voice-to-data)**, and **Reports (customer statements)**.

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

## Daily Entry — voice-to-data (`backend/src/services/geminiService.ts`, `backend/src/utils/fuzzyMatch.ts`, `mobile/app/(app)/daily-entry/voice*.tsx`)

- **Audio goes straight to Gemini — no on-device speech-to-text library.** The
  original handoff plan assumed an on-device STT library producing a
  transcript, but no Expo-Go-compatible STT library exists — the real ones
  (`@react-native-voice/voice`, etc.) need a custom dev client / EAS build,
  which would have broken this app's deliberate "plain Expo Go, no dev client"
  setup (see the OAuth decision above). Gemini accepts audio directly and can
  transcribe *and* extract structured data in one multimodal call, so that's
  what this does instead — confirmed via Expo's own SDK v57 docs that
  `expo-audio` recording works in plain Expo Go.
- **Backend**: `POST /api/entries/voice` (multipart, field `audio`, ≤15MB,
  gated by a `fileFilter` to `audio/*`) reads the uploaded buffer with
  `multer.memoryStorage()`, sends it inline (base64) to Gemini via
  `@google/genai`'s `models.generateContent` with `responseMimeType:
  "application/json"` + a `responseSchema` forcing `{transcript,
  customerName, amount, note, confidence}`, then fuzzy-matches `customerName`
  against the shop's active customers using a small hand-rolled
  normalized-Levenshtein scorer (`fuzzyMatch.ts` — no dependency needed for
  this). **It never writes to `LedgerEntry`** — the response is just a
  `draft` object with the transcript, extraction, best-match customer (if
  score ≥ 0.6), and top suggested matches for the human to review.
  `GEMINI_MODEL` is an env var (default `gemini-3.6-flash`) specifically so
  the model name can be swapped without a code change if needed.
- **`createEntry` (the existing manual-entry endpoint) was extended**, not
  duplicated: it now accepts optional `source` / `rawVoiceText` /
  `aiConfidence` fields. There is deliberately no separate "confirm" endpoint
  — the human pressing "Confirm & Save" on the mobile draft screen *is* the
  confirmation, and it calls the same `POST /api/entries` the manual flow
  uses, just tagged `source: "VOICE"` with the transcript/confidence
  preserved for audit. `isConfirmed` is hardcoded `true` in this handler
  regardless of source, since by the time this endpoint is called a human
  has already reviewed the data — that's the whole point of the draft/confirm
  split enforced by the AI-extraction schema fields.
- **Mobile**: `daily-entry/voice.tsx` records with `expo-audio`'s
  `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` (produces `.m4a` on both
  platforms), uploads the file via `draftVoiceEntry()` in `src/lib/api.ts`
  (see the `expo-file-system` `File.upload()` note below — not `fetch` +
  `FormData`), then `router.replace`s into `daily-entry/voice-confirm.tsx`
  with the draft serialized as a route param. That screen reuses the same
  customer-picker/amount/note fields as manual `new.tsx`, pre-filled from the
  draft, shows the transcript and a low-confidence-match warning when the
  customer couldn't be matched, and only calls `createEntry` (with
  `source: "VOICE"`) once the shopkeeper taps "Confirm & Save."
- **Inline customer creation**: the customer `PickerField` in
  `voice-confirm.tsx` has a trailing "+ Create new customer..." option
  (sentinel value, handled in `handleCustomerPickerChange` rather than ever
  being set as the real `customerId`). Picking it opens a small `Modal` —
  name (pre-filled from `draft.extractedCustomerName`) + optional phone —
  and calls the existing `createCustomer` API, so a shopkeeper recording an
  entry for a brand-new customer never has to leave the voice flow to add
  them first. No backend changes needed for this; it's the same
  `POST /api/customers` the manual Customers flow already uses.
- **Fixed on real-device testing**: the initial upload implementation used
  the classic React Native `formData.append("audio", { uri, name, type })`
  file-object trick — it typechecked and bundled fine, but failed on an
  actual device with `Unsupported FormDataPart implementation` (RN 0.86's
  networking layer no longer recognizes that shape). Replaced with
  `expo-file-system`'s `new File(uri).upload(url, { uploadType:
  UploadType.MULTIPART, fieldName: "audio", ... })` — a native multipart
  upload built for exactly this, which sidesteps the FormData polyfill
  entirely. Lesson: bundling/typechecking cleanly doesn't catch native
  networking behavior — this class of bug only surfaces on-device.
- **Verified**: both projects typecheck clean; `expo export --platform web`
  bundled cleanly (905 modules, zero errors) with the new screens and
  `expo-audio` in the tree; backend boots and serves `/health` with the new
  required `GEMINI_API_KEY` env var wired through `env.ts`. Full round-trip
  smoke test against the real Gemini API and database passed: synthesized a
  real speech WAV ("Ramesh Kumar, two hundred fifty rupees, rice and oil" via
  Windows SAPI TTS, since there's no physical device in this environment) →
  uploaded to `/api/entries/voice` → Gemini transcribed it correctly and
  extracted `{amount: 250, note: "rice and oil", confidence: 1}` → fuzzy-match
  picked the right customer (score 1.0) while still surfacing a plausible
  second suggestion → confirmed no `LedgerEntry` was written at the draft
  stage → called `createEntry` with `source: "VOICE"` → entry persisted with
  `rawVoiceText`/`aiConfidence` set and the customer's running balance updated
  correctly → cleaned up (deleted the entry via the API, the temp customer
  directly since no customer-delete route exists yet). **On-device UI**:
  first real-device attempt hit the FormData bug above (now fixed, see
  above) before recording could reach the backend at all — the fix hasn't
  been re-verified on-device yet, so the actual `voice.tsx` recording flow
  is still not confirmed working end to end on a phone.

## Reports — customer statements (`backend/src/services/customerBalance.ts`, `backend/src/controllers/reportsController.ts`, `mobile/app/(app)/reports/`)

- **Scope constraint, by design**: Billing (`Bill` generation) is still an
  unbuilt stub, so the outstanding-bill component of `runningBalance` is
  always zero. Payments now exist (`Payment` rows applied directly against
  the running balance, since there's no `Bill` to attach them to yet — see
  `paymentsController.ts`) and are included in the statement below. This
  module is a **per-customer statement**: pick
  a customer, see their full ledger history (not just today's), a balance
  breakdown, and totals. No charts — the mobile design system has no charting
  library, so this reuses the existing `Card`/`Badge`/list-row components.
  No date-range filtering yet either (all-time history) — small shop, small
  data volume; flagged as a natural future enhancement rather than built now.
- **Extracted balance math into `services/customerBalance.ts`** rather than
  duplicating it: `customersController.ts`'s private `getBalanceComponents`
  (single-customer) and its inline `groupBy` pair (shop-wide list) are now
  `getCustomerBalanceComponents` / `getShopBalanceMaps` / `runningBalanceOf`,
  imported by both `customersController.ts` (unchanged behavior) and the new
  `reportsController.ts`. Same formula as always: `openingBalance` + confirmed
  unbilled `LedgerEntry` total + outstanding `Bill` total (the bill half is
  currently always zero, for the same reason noted above).
- **Backend**: `GET /api/reports/customers` returns every customer (active
  *and* inactive — deliberately not filtered, unlike the Daily Entry customer
  picker, because a report specifically wants to surface an inactive customer
  who still owes money) with a lighter `select` than full Customer CRUD,
  ranked descending by `runningBalance`. `GET /api/reports/customers/:id`
  returns the customer, a `summary` (`totalCredit`, `totalPaid`,
  `entryCount`, `dateRange`, plus the balance components), and `entries`: a
  single chronological timeline merging every `LedgerEntry` *and* `Payment`
  for them (`type: "PURCHASE" | "PAYMENT"`), newest-first — added after an
  early version of Payments shipped that updated `runningBalance` correctly
  but left `entries` as `LedgerEntry`-only, so the statement showed the
  balance drop after a payment with no line item explaining it.
  `summary.totalCredit`/`entryCount`/`dateRange` are a plain historical sum
  over *every* purchase entry ever logged, kept deliberately separate from
  `runningBalance` (which follows the stricter unbilled/bill/payment
  formula) — the two will diverge once Billing ships and entries start
  getting billed.
- **Mobile**: same nested-stack pattern as Customers/Daily Entry —
  `reports/_layout.tsx` → `index.tsx` (ranked list, modeled on
  `customers/index.tsx`'s row) → `[id].tsx` (statement: balance `Card` +
  stats `Card` + `FlatList` of entries, modeled on `customers/[id].tsx` and
  `daily-entry/index.tsx`'s row style). Replaces the old `EmptyState`
  placeholder; `app/(app)/_layout.tsx` now sets `headerShown: false` on the
  Reports tab so the nested Stack owns its own header, matching every other
  tab.
- **Verified**: both projects typecheck clean; `expo export --platform web`
  bundles clean. Full round-trip smoke test against the real database
  passed: created a customer with a nonzero opening balance, logged three
  dated entries (spanning Jul 20 – Aug 1) via the real `POST /api/entries`,
  confirmed the ranked list surfaces the right `runningBalance` and sorts
  descending, confirmed the statement's `totalCredit`/`entryCount`/
  `dateRange`/entry order all match, confirmed a zero-entry customer returns
  `entryCount: 0`/`dateRange: null`/`entries: []`, confirmed a bogus customer
  id 404s and a missing bearer token 401s — cleaned up afterward (deleted the
  entries via the API, the two test customers directly via Prisma, same
  convention as prior modules).

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

Daily Entry (photo-to-data), Product Catalog, Monthly Billing & Settlement,
Payment Tracking, Reminders & Notifications, Customer Self-View,
offline-first SQLite sync, and push notifications. These come one module at a
time per the brief. (Reports today only covers per-customer statements — see
above; shop-wide/period reports and anything Bill/Payment-shaped are blocked
on Billing/Payments actually shipping.)

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
- Daily Entry (voice-to-data): both projects typecheck clean; mobile bundles
  clean via `expo export --platform web`; full round-trip smoke test against
  the real Gemini API and database passed (see module section above for
  details) — real `GEMINI_API_KEY` confirmed working, extraction + fuzzy
  match + confirm-gate + balance update all verified. **Not yet tested**: the
  on-device `expo-audio` recording UI itself (`voice.tsx`), since that can't
  be driven from a backend script.
- Reports (customer statements): both projects typecheck clean; mobile
  bundles clean; full round-trip smoke test against the real database passed
  (ranked list, statement totals/date-range/entry-order, zero-entry customer,
  404, 401 — see module section above for the exact scenarios and cleanup).

## Next up

- Test the voice-to-data on-device recording UI on a real device or
  simulator (the backend half is already verified — see above): tap
  "🎤 Add by Voice" → record → land on the confirm screen pre-filled with the
  draft → save → confirm the `LedgerEntry` row has `source: "VOICE"` set.
  Worth speaking a name that's a near-miss for an existing customer (to
  exercise the fuzzy-match warning path in `voice-confirm.tsx`) in addition
  to a clean match.
- Reports: try the new Reports tab on-device (ranked list → tap a customer →
  statement). Revisit date-range filtering/pagination if a shop's entry
  history grows large enough for the unpaginated `getCustomerStatement` query
  to matter.
