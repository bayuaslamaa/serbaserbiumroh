# Agent Handoff: Umroh Planner Current State

Last updated: 2026-05-12  
Branch: `feat/umroh-budget-estimator`

This document is for future coding agents. It summarizes what exists, what changed recently, and where to look before making changes.

---

## Current Worktree Note

There are uncommitted changes for the hotel pricing `distance` feature. The user explicitly requested work without committing.

Recent uncommitted scope:

- `hotel_prices.distance` nullable text column.
- Drizzle migration: `drizzle/migrations/0007_fearless_kinsey_walden.sql`.
- Hotel CSV import supports optional `distance`.
- Admin pricing UI can add/show/edit hotel distance.
- AI prompt and parser use distance/proximity ranking for close hotel requests.
- Updated docs/templates for hotel pricing research.

Do not revert these changes unless the user explicitly asks.

---

## Product Summary

Umroh Planner is a Next.js app for:

- AI-assisted Umroh budget estimation.
- Manual estimate adjustment.
- Saved estimate dashboard.
- PDF/WhatsApp exports.
- Admin-managed pricing and public content.
- Public guides, FAQ, stories, and Hotel Nusuk directory.

The newest architecture treats hotel and airline pricing as concrete options with monthly overrides rather than only broad tiers.

---

## Key Docs

- Updated PRD: `docs/PRD-umroh-budget-estimator-updated.md`
- Feature summary: `docs/FEATURES.md`
- Original PRD source: `PRD-umroh-budget-estimator (1).md`
- Hotel pricing import plan: `docs/plans/2026-05-08-001-feat-hotel-pricing-csv-import-plan.md`
- Concrete hotel selection plan: `docs/plans/2026-05-09-002-feat-concrete-hotel-selection-plan.md`
- Airline pricing refactor plan: `docs/plans/2026-05-09-001-refactor-airline-pricing-model-plan.md`
- FAQ management plan: `docs/plans/2026-05-10-001-feat-faq-management-plan.md`
- Hotel distance metadata plan: `docs/plans/2026-05-11-001-feat-hotel-price-distance-metadata-plan.md`

---

## Core Files by Area

### Schema and Seed

- `lib/db/schema.ts`
- `lib/db/seed.ts`
- `drizzle/migrations/`
- `types/index.ts`

### Estimator

- `lib/budget/calculate.ts`
- `lib/estimate/params.ts`
- `lib/ai/parse.ts`
- `lib/ai/prompt.ts`
- `components/estimator/EstimatorClient.tsx`
- `components/estimator/InputPanel.tsx`
- `components/estimator/ParamsPanel.tsx`
- `components/estimator/BudgetBreakdown.tsx`
- `app/(dashboard)/estimate/new/page.tsx`

### Admin Pricing

- `components/admin/PricingTable.tsx`
- `components/admin/InlineEditCell.tsx`
- `app/(admin)/admin/pricing/page.tsx`
- `app/api/admin/pricing/route.ts`
- `app/api/admin/pricing/[category]/route.ts`
- `lib/admin/hotel-pricing-import.ts`
- `lib/admin/airline-pricing-import.ts`

### FAQ

- `lib/faq.ts`
- `lib/admin/faq-import.ts`
- `components/faq/`
- `components/admin/faqs/`
- `app/(public)/faq/page.tsx`
- `app/api/admin/faqs/`

### Public Content

- `content/panduan/`
- `lib/panduan.ts`
- `components/panduan/`
- `components/cerita-jamaah/`
- `components/hotel-nusuk/`
- `app/(public)/`
- `app/api/admin/stories/`
- `app/api/admin/hotels/`

### Export

- `lib/export/pdf.ts`
- `lib/export/whatsapp.ts`
- `app/api/estimate/[id]/export/route.ts`

---

## Current Behavior to Preserve

### Budget Calculation

- Hotel cost:

```text
sarPerNight × nights × roomMultiplier × ceil(pax / paxPerRoom) × sarRate / pax
```

- Monthly hotel and airline prices override base prices when `travelMonth` exists.
- Concrete hotel IDs override legacy `hotelTier` fallback.
- `airline: "NONE"` should produce zero flight cost.
- Services with `divideByPax` are split per person.

### AI Parsing

- Must return strict JSON only.
- Must preserve mentioned month as `travelMonth`.
- Must not set no-flight unless the user explicitly asks no flight/ticket sendiri.
- Must match concrete hotel IDs when labels are available.
- Must choose comparable same-city/same-tier hotels when requested hotels are missing.
- Must use distance/proximity ranking for terms like:
  - `pelataran`
  - `ring 1`
  - `jalan kaki`
  - `dekat haram`
  - `dekat nabawi`
  - `near haram`
  - `near nabawi`

### Imports

- Hotel, airline, and FAQ imports all use preview-confirm flows.
- Confirm routes re-parse/re-validate. Do not trust client preview state.
- Duplicate prevention uses normalized import keys.
- New FAQ imports are draft by default.
- Hotel pricing `distance` is optional and must not affect `importKey`.

---

## Verification Commands

Use focused tests while developing, then run the suite.

```bash
npm test
```

Known current result:

- `npm test` passes: 31 files, 290 tests.

Useful focused test commands:

```bash
npm test -- lib/budget/__tests__/calculate.test.ts lib/ai/__tests__/parse.test.ts
npm test -- lib/admin/__tests__/hotel-pricing-import.test.ts app/api/admin/pricing/__tests__/hotel-import-route.test.ts
npm test -- components/admin/__tests__/PricingTableImport.test.tsx
npm test -- lib/admin/__tests__/faq-import.test.ts app/api/admin/faqs/__tests__/faq-import-route.test.ts
```

Known blockers:

- `npx tsc --noEmit` currently fails due to pre-existing test cast errors in:
  - `app/api/admin/hotels/__tests__/route.test.ts`
  - `app/api/admin/stories/__tests__/route.test.ts`
- `npm run lint` invokes `next lint` and prompts to configure ESLint, so it is not non-interactive yet.

---

## Common Pitfalls

- Do not confuse estimator `hotel_prices.distance` with public Hotel Nusuk `hotel_listings.distanceMeters`.
- Do not change hotel budget math when adding ranking/matching metadata.
- Do not let imported distance values change hotel import identity.
- Do not remove legacy tier fallback; saved estimates may rely on it.
- Do not make FAQ dashboard show more than seven published items.
- Do not rely on live OTA prices inside runtime estimator logic.
- Do not revert existing dirty worktree changes unless explicitly requested.

---

## Suggested Next Work

- Add ESLint config so `npm run lint` is non-interactive.
- Fix TypeScript test-cast errors so `npx tsc --noEmit` can be a reliable gate.
- Consider adding admin search/filtering for large hotel pricing lists.
- Consider an alias field for hotel matching if hotel names vary heavily across OTA sources.
- Consider a documented import/research workflow for periodically refreshing 2027 hotel and airline prices.
