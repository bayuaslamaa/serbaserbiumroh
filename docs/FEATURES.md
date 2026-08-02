# Umroh Planner — Feature Summary

> Last updated: 2026-06-11

All features built on the `feat/umroh-budget-estimator` branch. Stack: Next.js 14 App Router · TypeScript · Drizzle ORM + PostgreSQL (Neon) · NextAuth v5 · Anthropic Claude API · Tailwind CSS.

---

## 1. Authentication

- **Credentials login** — email + bcrypt-hashed password
- **Google OAuth** — via NextAuth v5 DrizzleAdapter
- **JWT role embedding** — `USER` or `ADMIN` role carried in the token
- **Split auth config** — `auth.config.ts` (Edge-safe, no Node builtins) + `auth.ts` (full adapter with bcrypt)
- **Login page** — `/login` with sign-in form
- **Route protection middleware** — unauthenticated requests redirected to `/login`; admin routes additionally check `role === ADMIN`

**Files:** `auth.config.ts`, `auth.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`

---

## 2. Database Schema

Managed with Drizzle ORM + Neon PostgreSQL. All PKs are CUID2 strings.

| Table | Purpose |
|-------|---------|
| `exchange_rates` | SAR→IDR and USD→IDR rates, admin-editable |
| `hotel_prices` | Base SAR/night per city×tier combination |
| `hotel_monthly_prices` | 12 monthly price overrides per hotel (Ramadan, school hols, etc.) |
| `airline_prices` | IDR round-trip per airline option, grouped by tier, with one default per tier |
| `airline_monthly_prices` | 12 monthly IDR overrides per airline option |
| `service_fees` | Additional service costs with currency, enabled flag, and divideByPax flag |
| `room_multipliers` | Quad/Triple/Double/Single pax-per-room and price multipliers |
| `users` | Auth users with `role` enum (USER / ADMIN) |
| `accounts`, `sessions`, `verification_tokens` | Auth.js adapter tables |
| `estimates` | Saved estimate snapshots (JSONB params + totals) |
| `community_join_requests` | Public community join requests with admin review status and duplicate matching fields |
| `faq_groups` | Admin-managed FAQ categories with display ordering |
| `faq_items` | Admin-managed Q&A items with rich answers, ordering, and publish status |

Enums: `city` (MAKKAH, MADINAH), `hotel_tier` (ECONOMY, STANDARD, PELATARAN, PREMIUM), `airline_tier` (BUDGET, STANDARD, GARUDA, BUSINESS), `service_key`, `role`.

**Files:** `lib/db/schema.ts`, `drizzle/migrations/`

---

## 3. Budget Calculation Engine

Pure function `calculateBudget(params, pricing)` — no side effects, fully unit-tested.

**Hotel cost formula:**
```
sarPerNight × nights × roomMultiplier × ceil(pax / paxPerRoom) × sarRate / pax
```

**Monthly pricing (Approach B):**
- `resolveHotelSar(config, travelMonth?)` checks `monthlyPrices[month]` first, falls back to `sarPerNight`
- Airline pricing follows the same fallback model: monthly IDR override first, then base IDR
- Enables Ramadan / school holiday pricing without changing base rates

**Concrete hotel selection:**
- Estimates may carry `madinahHotelId` and `makkahHotelId` in addition to legacy `hotelTier`
- Selected city hotel IDs override the tier fallback for calculation
- Legacy tier-only estimates still calculate from `pricing.hotels[city][tier]`
- Hotel breakdown metadata includes selected label, SAR/night, nights, room multiplier, and pax-per-room divisor

**Service fees:**
- Multi-currency: SAR, USD, or IDR
- `divideByPax = true` — group-shared costs (transport, tour) are divided per person for per-pax display; group total remains correct (`perPax × pax = original cost`)
- Disabled services are excluded from totals

**Output fields:** `hotelMadinahIdr`, `hotelMakkahIdr`, `hotelMadinahDetail`, `hotelMakkahDetail`, `servicesIdr`, `serviceItems[]`, `flightIdr`, `totalIdrPax`, `totalIdrGrp`, `sarRate`, `usdRate`

**Files:** `lib/budget/calculate.ts`, `lib/budget/__tests__/calculate.test.ts` (26 tests)

---

## 4. AI-Powered Natural Language Parsing

Converts freeform Bahasa Indonesia input into structured `EstimateParams` using the Anthropic Claude API.

- `parseEstimate(text, pricing)` sends a prompt with full pricing context
- Returns `{ params: EstimateParams, notes: string }` — notes explain assumptions made
- `ParseError` thrown on non-JSON responses or missing required fields
- Wraps API errors with `"Anthropic API error: …"` message
- Prompt includes imported Makkah and Madinah hotel option IDs when available
- If a requested hotel is unavailable locally, parser selects a same-city same-tier comparable option and records the substitution in notes
- Distance/proximity metadata helps rank comparable hotel choices for prompts like "ring 1", "jalan kaki", "dekat Haram", or "dekat Nabawi"

**Files:** `lib/ai/parse.ts`, `lib/ai/prompt.ts`, `lib/ai/__tests__/parse.test.ts` (21 tests)

---

## 5. Export Features

Two export formats for sharing estimates:

**PDF export** — formatted budget breakdown as a downloadable PDF  
**WhatsApp export** — human-readable text formatted for WhatsApp sharing (header, line items, totals in IDR)

**Files:** `lib/export/pdf.ts`, `lib/export/whatsapp.ts`, `lib/export/__tests__/pdf.test.ts`, `lib/export/__tests__/whatsapp.test.ts` (12 tests total)  
**API:** `GET /api/estimate/[id]/export?format=pdf|whatsapp`

---

## 6. Estimator UI (User-Facing)

### New Estimate Flow (`/estimate/new`)
1. **InputPanel** — freeform text input → AI parses into params
2. **ParamsPanel** — review and adjust all parameters manually
3. **BudgetBreakdown** — live cost breakdown per-person and group total

### ParamsPanel Controls
- **Night steppers** — Madinah and Makkah night counts (1–30)
- **Pax stepper** — number of participants (1–200)
- **Travel month selector** — 2×6 grid of month buttons; selecting a month updates hotel price badges dynamically; clicking again deselects (→ base price)
- **Hotel Madinah** — city-specific imported hotel options with tier and SAR/malam badge
- **Hotel Makkah** — city-specific imported hotel options with tier and SAR/malam badge
- **Room type** — RadioCardGrid (Quad / Triple / Double / Single)
- **Airline** — RadioCardGrid with IDR price badge
- **Additional services** — checkbox grid (Visa, Siskopatuh, Tasreh, Transport, Tour Makkah, Tour Madinah)
- **Full board toggle** — 3×meals/day included flag

### Components
- `RadioCardGrid` — reusable radio card selector
- `Stepper` — increment/decrement number input
- `ServiceCheckboxGrid` — service selection with currency display

**Files:** `app/(dashboard)/estimate/new/page.tsx`, `components/estimator/`

---

## 7. Community Join

- **Public join page** (`/komunitas`) — shareable form for calon jamaah to request joining the managed Umroh Mandiri WhatsApp community
- **Fields** — nama lengkap and nomor HP required; username sosial media and alasan join optional
- **Anonymous-first submit** — visitors can submit without login; logged-in users are associated when a session exists
- **Post-submit guidance** — success state shows request-join and admin-chat WhatsApp actions and instructs users to keep name/phone consistent for admin matching
- **Admin review** (`/admin/community-requests`) — admin can review submitted requests, see possible duplicate flags, update status, and add internal notes

**Files:** `app/(public)/komunitas/page.tsx`, `components/community/`, `app/api/community/join/route.ts`, `app/(admin)/admin/community-requests/page.tsx`, `app/api/admin/community-requests/`

## 8. Webinar RSVP

- **Public webinar page** (`/webinar-umroh-mandiri`) — shareable event page for the Umroh Mandiri webinar; the schedule lives in `lib/webinar.ts` (`WEBINAR_DATE_LABEL` / `WEBINAR_STARTS_AT`), which every surface reads from
- **Logged-in RSVP gate** — anonymous visitors can read event details but cannot see the RSVP destination
- **Callback login CTA** — anonymous visitors are sent to `/login` with a callback back to the webinar page
- **Server-only RSVP URL** — `WEBINAR_RSVP_URL` is rendered only after `auth()` confirms a session, and only when it is an `https://` URL; missing or non-https config shows an unavailable state instead of a broken link

**Files:** `lib/webinar.ts`, `app/(public)/webinar-umroh-mandiri/page.tsx`, `middleware.ts`, `components/nav/`

> The 2 Agustus 2026 session has run. The homepage no longer promotes RSVP — its recording is listed in `components/home/PromoWebinar.tsx` — so the page above is reachable from the navbar only, and still renders live RSVP copy.

---

## 9. Dashboard

- **Estimate list** (`/dashboard`) — cards showing saved estimates with title, date, and per-pax total
- **Estimate detail** (`/estimate/[id]`) — full breakdown with export buttons
- **FAQ preview** — up to seven published FAQ items shown on the dashboard, with a link to the full FAQ page
- `EstimateCard` and `EstimateList` components

**Files:** `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/estimate/[id]/page.tsx`, `components/dashboard/`

---

## 10. Admin Panel

Admin-only route group (`/admin/*`) guarded by `requireAdmin()` server-side.

### Pricing Management (`/admin/pricing`)

All changes are saved immediately (no publish step).

**Exchange Rates**
- Inline-edit SAR→IDR and USD→IDR rates
- `PATCH /api/admin/pricing/rates`

**Hotel Prices**
- Inline-edit base SAR/malam per city×tier row
- Inline-edit optional distance/proximity metadata per hotel pricing row
- Expandable monthly price grid (12 months × 2 cities × 4 tiers)
- Inline-edit individual month prices
- **CSV bulk import** — upload one-hotel-per-row CSV, preview create/update/invalid/conflict rows, then confirm valid rows
  - Template columns: city, tier, label, sublabel, distance, base SAR/malam, Jan–Dec SAR overrides
  - Distance is a human-readable note relative to Masjidil Haram for Makkah or Masjid Nabawi for Madinah, used for AI hotel matching/ranking
  - Template includes examples for every supported tier: ECONOMY, STANDARD, PELATARAN, PREMIUM
  - Blank monthly override cells fall back to the base SAR/malam value
  - Existing rows are matched by city + tier + normalized label to prevent duplicates
  - Scope is estimator hotel pricing only; Hotel Nusuk directory fields are not imported
- **Add new hotel entry** — "+ Tambah Hotel" button opens a form with:
  - City select (MAKKAH / MADINAH)
  - Tier select (ECONOMY / STANDARD / PELATARAN / PREMIUM)
  - Label and sublabel text inputs
  - Optional distance text input
  - SAR/malam base price input
  - Auto-seeds 12 monthly price rows at the base rate on save
- `POST /api/admin/pricing/hotel-import/preview` (validate CSV and show preview; no writes)
- `POST /api/admin/pricing/hotel-import/confirm` (re-validate CSV, then apply valid create/update rows)
- `GET /api/admin/pricing/hotel-import/template` (download CSV template)
- `PATCH /api/admin/pricing/hotel` (update base price)
- `PATCH /api/admin/pricing/monthly-hotel` (update monthly price)
- `POST /api/admin/pricing/hotel` (add new entry)

**Airline Prices**
- Manage multiple airline options per tier while keeping estimator selection tier-based
- Mark one default airline option per tier; the estimator uses that default for calculations
- Inline-edit base IDR/person per airline option
- Expandable monthly price grid per airline option
- Inline-edit individual airline monthly prices
- **CSV bulk import** — upload one-airline-option-per-row CSV, preview create/update/invalid/conflict rows, then confirm valid rows
  - Template columns: tier, label, sublabel, base IDR/person, default flag, Jan-Dec IDR overrides
  - Blank monthly override cells fall back to the base IDR value
  - Existing rows are matched by tier + normalized label to prevent duplicates
- **Add new airline option** — "+ Tambah Maskapai" button opens a form with:
  - Tier select (BUDGET / STANDARD / GARUDA / BUSINESS)
  - Label and sublabel text inputs
  - IDR/person base price input
  - Optional default-for-tier marker
  - Auto-seeds 12 monthly price rows at the base rate on save
- `POST /api/admin/pricing/airline-import/preview` (validate CSV and show preview; no writes)
- `POST /api/admin/pricing/airline-import/confirm` (re-validate CSV, then apply valid create/update rows)
- `GET /api/admin/pricing/airline-import/template` (download CSV template)
- `PATCH /api/admin/pricing/airline`
- `PATCH /api/admin/pricing/monthly-airline`
- `POST /api/admin/pricing/airline`

**Service Fees**
- Inline-edit amount per service
- Toggle enabled/disabled per service
- Toggle divideByPax (whether cost is split across group members for per-person display)
- `PATCH /api/admin/pricing/service`

### Admin User List (`/admin/users`)
- View all registered users with role

### Community Requests (`/admin/community-requests`)
- Review public community join requests submitted from `/komunitas`
- View contact identity, optional social username, optional intent, submission date, duplicate indicator, status, and internal notes
- Update status: Baru, Sudah dicocokkan, Ditolak
- Add/edit internal notes for manual WhatsApp matching
- Duplicate indicators are advisory only and do not reject submissions

### FAQ Management (`/admin/content/faqs`)
- CRUD FAQ groups with explicit display order
- CRUD FAQ Q&A items with group, sort order, publish/draft status, and Markdown-style rich answers
- Publish/unpublish from the table without editing the full item
- Prevent deleting groups that still contain FAQ items
- **CSV bulk import** — upload/paste FAQ rows, preview create/update/invalid/conflict rows, then confirm valid rows
  - Template columns: group, question, answer
  - Missing groups are created during confirm
  - Existing FAQs are matched by normalized question and updated instead of duplicated
  - Imported new FAQs stay draft; publish status and ordering are managed in the admin UI

### Components
- `InlineEditCell` — click-to-edit cell with save/cancel
- `PricingTable` — full admin pricing dashboard

**Files:** `app/(admin)/admin/pricing/page.tsx`, `app/(admin)/admin/users/page.tsx`, `components/admin/`, `app/api/admin/pricing/`

---

## 11. Navigation

- `NavBar` — session-aware; shows Dashboard, public FAQ, community, webinar, and estimate links for all users; shows Admin links only when `role === ADMIN`
- Sign-out button

**Files:** `components/nav/NavBar.tsx`

---

## 12. API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/admin/pricing` | Admin | List all pricing config |
| `PATCH` | `/api/admin/pricing/[category]` | Admin | Update rates / hotel / airline / service / monthly-hotel |
| `POST` | `/api/admin/pricing/hotel` | Admin | Add new hotel price entry (auto-seeds 12 monthly rows) |
| `GET` | `/api/admin/pricing/hotel-import/template` | Admin | Download hotel pricing CSV template |
| `POST` | `/api/admin/pricing/hotel-import/preview` | Admin | Preview hotel pricing CSV create/update/invalid/conflict rows without writes |
| `POST` | `/api/admin/pricing/hotel-import/confirm` | Admin | Confirm valid hotel pricing CSV rows and return applied row identities |
| `POST` | `/api/admin/pricing/airline` | Admin | Add new airline option (auto-seeds 12 monthly rows) |
| `GET` | `/api/admin/pricing/airline-import/template` | Admin | Download airline pricing CSV template |
| `POST` | `/api/admin/pricing/airline-import/preview` | Admin | Preview airline pricing CSV create/update/invalid/conflict rows without writes |
| `POST` | `/api/admin/pricing/airline-import/confirm` | Admin | Confirm valid airline pricing CSV rows and return applied row identities |
| `POST` | `/api/estimate` | User | Create estimate (AI parse → calculate → save) |
| `GET` | `/api/estimate/[id]` | User (owner) | Get saved estimate |
| `GET` | `/api/estimate/[id]/export` | User (owner) | Export as PDF or WhatsApp text |
| `POST` | `/api/estimate/parse` | User | Parse freeform text → EstimateParams (no save) |
| `POST` | `/api/community/join` | Public | Save community join request |
| `GET` | `/api/admin/community-requests` | Admin | List community join requests with duplicate flags |
| `PATCH` | `/api/admin/community-requests/[id]` | Admin | Update community request status or internal note |
| `GET` | `/api/admin/faqs` | Admin | List FAQ items |
| `POST` | `/api/admin/faqs` | Admin | Create FAQ item |
| `GET/PUT/DELETE` | `/api/admin/faqs/[id]` | Admin | Read, update, or delete FAQ item |
| `GET/POST` | `/api/admin/faqs/groups` | Admin | List or create FAQ groups |
| `PUT/DELETE` | `/api/admin/faqs/groups/[id]` | Admin | Update or delete FAQ group |
| `GET` | `/api/admin/faqs/import/template` | Admin | Download FAQ CSV template |
| `POST` | `/api/admin/faqs/import/preview` | Admin | Preview FAQ CSV create/update/invalid/conflict rows without writes |
| `POST` | `/api/admin/faqs/import/confirm` | Admin | Confirm valid FAQ CSV rows, creating missing groups and draft FAQ items |

---

## 13. Test Coverage

Community join and webinar RSVP add focused coverage for request validation, public submit route, public form success/error states, admin request routes, admin row actions, middleware public route matching, and RSVP link gating.

| File | Tests | Area |
|------|-------|------|
| `lib/budget/__tests__/calculate.test.ts` | 26 | Budget engine: hotel, services, totals, concrete hotel selection, hotel and airline monthly pricing, exchange rates |
| `lib/ai/__tests__/parse.test.ts` | 21 | AI parsing: happy paths, hotel IDs/fallbacks, distance-aware matching, error paths, API failures |
| `lib/export/__tests__/whatsapp.test.ts` | 9 | WhatsApp export formatting |
| `app/api/admin/pricing/__tests__/route.test.ts` | 14 | Admin PATCH validation logic |
| `app/api/admin/pricing/__tests__/airline-import-route.test.ts` | 9 | Airline import preview/confirm routes |
| `lib/admin/__tests__/airline-pricing-import.test.ts` | 11 | Airline CSV parser/template/validation |
| `app/api/estimate/__tests__/route.test.ts` | 7 | Estimate API route and params validation |
| `lib/db/__tests__/schema.test.ts` | 11 | DB schema types |
| `components/dashboard/__tests__/EstimateCard.test.tsx` | 7 | EstimateCard rendering |
| `components/estimator/__tests__/BudgetBreakdown.test.tsx` | 6 | BudgetBreakdown rendering |
| `components/estimator/__tests__/EstimatorPreFill.test.tsx` | 12 | Estimator pre-fill and hotel option rendering |
| `lib/export/__tests__/pdf.test.ts` | 3 | PDF export |
| `lib/auth.__tests__/auth.test.ts` | 5 | Auth logic (bcrypt, role) |

---

## Seed Data

- 2 exchange rates (SAR=4700, USD=17300)
- 8 hotel entries (4 tiers × 2 cities) with labels and sublabels
- 96 monthly price rows (8 hotels × 12 months, seeded at base price)
- 4 default airline entries
- 48 monthly airline price rows (4 airline options × 12 months, seeded at base price)
- 6 service fee entries
- 4 room multiplier entries
- 1 admin user + 1 regular user (dev only)

**Files:** `lib/db/seed.ts`
