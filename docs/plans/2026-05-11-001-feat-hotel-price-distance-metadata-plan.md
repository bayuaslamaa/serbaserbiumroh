---
title: "feat: Add hotel pricing distance metadata"
type: feat
status: completed
date: 2026-05-11
origin: direct request on 2026-05-11
---

# feat: Add hotel pricing distance metadata

## Summary

Add optional `distance` metadata to estimator hotel pricing rows so admins can import proximity context such as "pelataran", "ring 1", "jalan kaki", "250m", or "shuttle". The field is relative to Masjidil Haram for Makkah hotels and Masjid Nabawi for Madinah hotels. Estimator calculations should still use the selected hotel's SAR/night and nights formula, while AI hotel matching can use distance metadata to prefer safer close options when users ask for nearby hotels or when a requested hotel is not in the pricing list.

This is a follow-on to `docs/plans/2026-05-08-001-feat-hotel-pricing-csv-import-plan.md` and `docs/plans/2026-05-09-002-feat-concrete-hotel-selection-plan.md`.

## Problem Frame

Users often ask for hotels by proximity language rather than exact hotel names: "pelataran", "ring 1", "jalan kaki", "dekat haram", or "dekat nabawi". The current estimator hotel pricing table has `label`, `sublabel`, tier, base price, and monthly prices, but no dedicated distance/proximity metadata. That makes comparable hotel selection too blunt: if a requested hotel is missing, `lib/ai/parse.ts` currently picks the first same-tier option before falling back to nearest price. For proximity-sensitive prompts, that can select a hotel with the same tier but the wrong walking-distance profile.

## Requirements

- R1. Add nullable optional string `distance` to estimator `hotel_prices`.
- R2. Define the field as city-relative: Makkah distance refers to Masjidil Haram, Madinah distance refers to Masjid Nabawi.
- R3. Preserve existing hotel pricing rows and imports that do not provide distance.
- R4. Let admins bulk import `distance` through the hotel pricing CSV flow.
- R5. Let admins see and manage `distance` in the pricing admin flow so manual edits do not lose the metadata.
- R6. Include distance in pricing config and AI prompt context for concrete hotel options.
- R7. When user text contains proximity intent, prefer closer same-city hotel options during comparable selection.
- R8. When a requested hotel is unavailable, choose the same tier first, then use distance and price to find the best comparable hotel.
- R9. Do not change budget math. Hotel totals remain based on resolved SAR/night, city nights, room multiplier, pax-per-room, and SAR rate.
- R10. Do not mix this field with Hotel Nusuk public listing `distanceMeters`; that table remains separate.

## Scope Boundaries

- No live geocoding, map routing, OTA scraping, or automatic distance lookup.
- No guarantee that a hotel is actually approved, available, or walkable on a specific date.
- No forced numeric schema such as `distance_meters` on `hotel_prices`; admin-provided strings must support messy real-world labels.
- No automatic price recalculation based on distance. Admins still own the imported SAR values.
- No public Hotel Nusuk directory behavior changes.
- No broad redesign of the pricing import UI.

## Context and Existing Patterns

- `lib/db/schema.ts` defines `hotelPrices` as the estimator pricing source. It currently has `city`, `tier`, `importKey`, `sarPerNight`, `label`, `sublabel`, and `updatedAt`.
- `lib/admin/hotel-pricing-import.ts` owns the canonical hotel pricing CSV headers, template, parsing, duplicate detection, and row classification.
- `docs/templates/hotel-pricing-import-template.csv` is tested to match the canonical template exactly.
- `app/api/admin/pricing/hotel-import/preview/route.ts` and `app/api/admin/pricing/hotel-import/confirm/route.ts` share the parser and re-validate on confirm.
- `app/api/admin/pricing/[category]/route.ts` handles manual hotel pricing create/update.
- `lib/budget/calculate.ts` builds `PricingConfig.hotelOptions` from every `hotel_prices` row.
- `lib/ai/prompt.ts` currently lists hotel options with id, label, tier, SAR, and sublabel note.
- `lib/ai/parse.ts` currently matches exact label first, otherwise returns the first same-tier option, then nearest SAR price.
- Hotel Nusuk listings already have `distanceMeters`, but `docs/brainstorms/2026-05-08-hotel-pricing-csv-import-requirements.md` intentionally separated public listing fields from estimator pricing fields. This plan changes estimator pricing because proximity has become part of estimator hotel matching.

## Key Technical Decisions

- **Use `distance` as nullable text on `hotel_prices`:** The user's requested format is optional string, and admin source data may be "ring 1", "pelataran", "±300m", "5 min walk", or "shuttle". Text preserves admin judgment without requiring false precision.
- **Keep `sublabel` but stop overloading it:** `sublabel` can continue to describe hotel quality or package context. `distance` becomes the dedicated machine-readable-ish field for proximity matching and prompt context.
- **Treat distance as ranking metadata, not cost input:** Imported prices already reflect hotel location. The estimator should choose a more relevant hotel when possible, then calculate using that hotel's stored monthly/base price.
- **Use best-effort distance scoring:** A helper can extract rough numeric distance from strings like `250m`, `0.5 km`, and `5 min walk`, while giving high proximity scores to words like `pelataran`, `ring 1`, and `jalan kaki`. Unknown distance should not break selection.
- **Prefer conservative fallback behavior:** Without proximity language or usable distance metadata, keep current comparable behavior so this feature does not reshuffle all existing estimates.

## Implementation Units

### U1. Schema, Migration, and Types

**Goal:** Add optional distance metadata to estimator hotel pricing rows and carry it through shared domain types.

**Requirements:** R1, R2, R3, R6, R9, R10

**Dependencies:** None

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/migrations/<next>_add_hotel_price_distance.sql`
- Modify: `types/index.ts`
- Modify: `lib/budget/calculate.ts`
- Test: `lib/db/__tests__/schema.test.ts`
- Test: `lib/budget/__tests__/calculate.test.ts` if existing mocks require explicit hotel option shape coverage

**Approach:**
- Add `distance: text("distance")` to `hotelPrices` with no `notNull`.
- Extend `HotelPriceConfig` and `HotelOptionConfig` with `distance?: string | null`.
- Map `h.distance` into each hotel option in `fetchPricingConfig()`.
- Keep fallback `pricing.hotels[city][tier]` compatible by including `distance` only as optional metadata.
- Generate or write the migration in the project's existing Drizzle style.

**Test scenarios:**
- Schema exposes a `distance` column on `hotelPrices`.
- Existing hotel pricing rows without distance remain valid.
- `fetchPricingConfig()` includes `distance` on concrete hotel options when present.
- Budget totals are unchanged when distance is added to a selected hotel.

### U2. Hotel Pricing CSV Import and Admin Management

**Goal:** Let admins import, preview, confirm, and manually maintain hotel distance metadata.

**Requirements:** R3, R4, R5, R10

**Dependencies:** U1

**Files:**
- Modify: `lib/admin/hotel-pricing-import.ts`
- Modify: `docs/templates/hotel-pricing-import-template.csv`
- Modify: `app/api/admin/pricing/hotel-import/preview/route.ts` if preview row shape needs display metadata
- Modify: `app/api/admin/pricing/hotel-import/confirm/route.ts`
- Modify: `app/api/admin/pricing/[category]/route.ts`
- Modify: `components/admin/PricingTable.tsx`
- Test: `lib/admin/__tests__/hotel-pricing-import.test.ts`
- Test: `app/api/admin/pricing/__tests__/hotel-import-route.test.ts`
- Test: `components/admin/__tests__/PricingTableImport.test.tsx`

**Approach:**
- Add optional `distance` to `HOTEL_PRICING_IMPORT_HEADERS`, preferably after `sublabel` so human identity fields stay grouped before prices.
- Parse `distance` by trimming strings; store `null` or empty string consistently when blank. Prefer `null` at the database boundary and an empty display value in forms.
- Include `distance` in `ParsedHotelPricingImportData`.
- On confirm, write `distance` during create and update.
- Keep import matching unchanged: `city + tier + normalized label`. Distance must not affect `importKey`, because distance corrections should update the same hotel row.
- Add distance to manual hotel create/edit payloads and UI fields so admins can correct imported metadata later.
- Display distance in the hotel pricing admin table or card in a compact way without crowding monthly price controls.

**Test scenarios:**
- Canonical template and docs template include the new `distance` column.
- Existing CSVs without `distance` still parse successfully.
- A CSV with `distance` stores trimmed distance in parsed row data.
- Quoted distance values containing commas parse correctly.
- Confirm create writes `distance` to `hotelPrices`.
- Confirm update changes `distance` without creating a duplicate row.
- Manual admin create can submit distance.
- Manual admin edit can update or clear distance.

### U3. AI Prompt Context

**Goal:** Give the model compact proximity context for each hotel option without increasing ambiguity or token waste.

**Requirements:** R2, R6, R7, R8

**Dependencies:** U1

**Files:**
- Modify: `lib/ai/prompt.ts`
- Test: `lib/ai/__tests__/prompt.test.ts` or the existing AI prompt/parser test file if prompt tests are already colocated

**Approach:**
- Include `distance=${h.distance}` in each concrete hotel option line only when present.
- Add one static rule explaining that distance is relative to Masjidil Haram for Makkah and Masjid Nabawi for Madinah.
- Add one static rule telling the model to prefer close/walking/ring-1/pelataran hotels when the user asks for proximity.
- Keep the dynamic line compact:

```text
id=..., label=..., tier=..., SAR=..., distance=250m, note=...
```

**Test scenarios:**
- Prompt includes distance for hotel options that have it.
- Prompt omits or marks distance cleanly for hotels without it.
- Static prompt says distance is city-relative to the correct mosque.
- Existing prompt structure still returns raw JSON requirements and known defaults.

### U4. Deterministic Comparable Hotel Ranking

**Goal:** Make local fallback selection use proximity safely even when the model omits an ID or picks an unavailable hotel.

**Requirements:** R6, R7, R8, R9

**Dependencies:** U1, U3

**Files:**
- Modify: `lib/ai/parse.ts`
- Test: `lib/ai/__tests__/parse.test.ts`

**Approach:**
- Add proximity intent detection against the original user input or model notes/labels. Include Indonesian and English terms:
  - `pelataran`
  - `ring 1`
  - `jalan kaki`
  - `dekat`
  - `pinggir masjid`
  - `near haram`
  - `near nabawi`
  - `walking distance`
- Pass the original user input into hotel resolution so `findComparableHotel()` can use proximity intent.
- Add a helper that scores distance strings:
  - Strong closest signals: `pelataran`, `ring 1`, `haram view`, `nabawi view`, `0-300m`.
  - Close/walking signals: `jalan kaki`, `walking`, `walk`, `near`, `dekat`, `300-800m`.
  - Less close signals: `shuttle`, `bus`, `>1 km`, `remote`, `thakher` unless exact hotel requested.
  - Numeric extraction for `m`, `meter`, `km`, and simple ranges.
- Ranking order for a requested-but-missing hotel:
  1. Same city and same tier.
  2. If proximity intent exists, better distance score first.
  3. Nearest SAR price to the tier fallback.
  4. Existing deterministic order as final tie-breaker.
- Ranking order for no requested hotel but proximity intent exists:
  1. Same city and requested/inferred tier.
  2. Better distance score first.
  3. Nearest SAR price.
- Keep exact label/id matches highest priority even when distance is poor, because the user named a specific available hotel.
- Add notes when an unavailable hotel is substituted, including the comparable label and distance when available.

**Test scenarios:**
- Exact available hotel match wins even if another same-tier hotel is closer.
- Missing requested Makkah hotel with "jalan kaki" chooses a closer same-tier Makkah option over the first same-tier option.
- Missing requested Madinah hotel with "dekat Nabawi" chooses a closer same-tier Madinah option.
- Prompt with "pelataran" but no hotel name selects a close/pelataran same-city option when available.
- Prompt without proximity terms preserves the existing first same-tier behavior.
- Unknown or blank distance values do not crash and sort after clear close options only when proximity intent exists.
- Substitution notes mention the chosen comparable hotel and remain human-readable.

### U5. Research Prompt and Admin Documentation

**Goal:** Make future bulk imports collect distance consistently.

**Requirements:** R2, R4, R5, R10

**Dependencies:** U2

**Files:**
- Modify: `docs/templates/hotel-pricing-research-prompt.md`
- Modify: `docs/FEATURES.md` or the existing admin pricing documentation section if present
- Test: covered indirectly by `lib/admin/__tests__/hotel-pricing-import.test.ts` template alignment

**Approach:**
- Update the research prompt's CSV schema from 17 columns to 18 columns by adding `distance`.
- Tell researchers that distance is relative to Masjidil Haram for Makkah and Masjid Nabawi for Madinah.
- Give examples of acceptable distance values: `pelataran`, `ring 1`, `250m`, `0.7 km`, `5 min walk`, `shuttle area`.
- Tell researchers to use comparable distance bands when live distance data is weak.
- Document that distance helps matching/ranking but does not guarantee approval, walkability, or availability.

**Test scenarios:**
- Research prompt final check expects 18 columns.
- Template alignment test still proves the docs CSV template matches the canonical import template.

## Sequencing

1. Implement U1 first so every downstream surface can compile against the new optional field.
2. Implement U2 next because import/admin persistence is the source of truth for distance data.
3. Implement U3 after pricing config carries distance, so prompt context reflects real stored data.
4. Implement U4 once prompt and deterministic parser paths can both access distance and original user intent.
5. Implement U5 last to align admin/research instructions with the shipped CSV format.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Text distance values are inconsistent | Keep parsing best-effort and preserve raw admin text; rank only when signals are clear. |
| Adding distance to import breaks older CSV files | Treat `distance` as optional and keep only the original required headers required. |
| Distance starts acting like a false guarantee | Keep UI/docs wording clear that it is admin-entered proximity context, not approval or route validation. |
| Comparable selection changes too many estimates | Only use distance ranking when proximity intent is present or when substituting unavailable hotels with proximity language. |
| Confusion with Hotel Nusuk `distanceMeters` | Keep schema names distinct and document that estimator `hotel_prices.distance` is independent text metadata. |

## Verification Strategy

- Run focused tests for parser/import, pricing routes, schema, AI prompt/parser, and budget calculation.
- Use one fixture with Makkah same-tier hotels at different distances and one fixture with Madinah same-tier hotels at different distances.
- Manually check an estimator parse prompt such as: "hotel ring 1 jalan kaki Makkah, dekat Nabawi Madinah, 2 pax November" and confirm selected hotel IDs prefer close options when present.
- Confirm an older CSV without `distance` still previews and confirms.
- Confirm a new CSV with `distance` creates/updates rows and the value appears in admin pricing UI.
