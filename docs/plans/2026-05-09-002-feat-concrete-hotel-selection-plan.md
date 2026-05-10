---
title: "Concrete Hotel Selection for Estimator"
type: feat
status: completed
created: 2026-05-09
updated: 2026-05-09
owner: compound-engineering
---

# Concrete Hotel Selection for Estimator

## Summary

The estimator currently treats hotel choice as one shared `hotelTier` and renders four hardcoded tier cards from Makkah pricing. That makes the UI look like it only has four hotel options, prevents AI parsing from selecting requested hotels such as Olayan Ajyad or Kayan Hotel, and makes the hotel cost rows look like they are not multiplied by nights even though the calculation already does:

`SAR per night × city nights × room multiplier ÷ pax per room × SAR rate`

This plan changes the estimator to support concrete hotel selection per city, while preserving the existing tier-based behavior for older saved estimates. If a requested hotel is not available in the imported pricing list, the estimator should choose a comparable hotel in the same city and level, then explain the substitution in AI notes.

## Goals

- Show real imported hotel options for both Makkah and Madinah instead of only four tier cards.
- Let AI parsing and manual UI selection set different hotels for Makkah and Madinah.
- Calculate hotel costs from the selected city-specific hotel prices when present.
- Preserve existing estimates and API clients that only send `hotelTier`.
- Make hotel breakdown rows clear enough that admins can see the selected hotel, nightly SAR price, nights, and room-sharing division.
- Support fallback to a same-level comparable hotel when the requested hotel cannot be found in the pricing list.

## Non-Goals

- Do not add live OTA scraping or live availability lookup to the estimator runtime.
- Do not guarantee hotel approval or OTA availability.
- Do not redesign the hotel pricing import workflow.
- Do not add multi-hotel stays inside a single city for this iteration.
- Do not backfill existing saved estimates with concrete hotel IDs.

## Assumptions

- "Same level" means same city and same tier first. If no same-tier option is available, choose the nearest nightly SAR price in the same city.
- The imported `hotel_prices` table remains the source of truth for options shown in the estimator.
- `hotelTier` remains a legacy and fallback field, but selected hotel IDs win when present.
- Fuzzy hotel matching happens against local imported hotel labels and aliases, not against live web search.

## Requirements

- Add optional `makkahHotelId` and `madinahHotelId` to `EstimateParams`.
- Add a full city-grouped hotel options list to `PricingConfig`, including `id`, `city`, `tier`, `label`, `sublabel`, base SAR price, and monthly prices.
- Keep `pricing.hotels[city][tier]` available as the fallback/default tier map.
- Update `calculateBudget` to resolve each city hotel by selected ID first, then fall back to `hotelTier`.
- Add hotel detail metadata to `BudgetBreakdown` so UI/export can show the actual hotel label and formula.
- Update AI prompt and parser schema so the model can return `makkahHotelId` and `madinahHotelId`.
- Teach the parser prompt to pick a same-city comparable hotel if the requested hotel is absent from options, and to mention the substitution in notes.
- Update API validation for create/update estimates to accept optional hotel IDs and validate them against available pricing.
- Replace or expand the current "Kategori Hotel" UI with city-specific "Hotel Makkah" and "Hotel Madinah" selectors.
- Make the breakdown rows show selected hotel names and a compact per-person formula.

## Data Flow

```text
hotel_prices + hotel_monthly_prices
  -> fetchPricingConfig()
  -> pricing.hotelOptions[MAKKAH|MADINAH] + pricing.hotels[city][tier]
  -> AI parse / ParamsPanel selection
  -> EstimateParams.makkahHotelId / EstimateParams.madinahHotelId
  -> calculateBudget()
  -> BudgetBreakdown hotel detail rows
  -> UI, saved estimate totals, exports
```

## Implementation Plan

### 1. Extend Types and Pricing Config

Files:

- `types/index.ts`
- `lib/budget/calculate.ts`
- `lib/budget/__tests__/calculate.test.ts`

Changes:

- Add optional fields:

```ts
interface EstimateParams {
  makkahHotelId?: string
  madinahHotelId?: string
}
```

- Add a concrete hotel option type:

```ts
interface HotelOptionConfig extends HotelPriceConfig {
  id: string
  city: City
  tier: HotelTier
}
```

- Extend `PricingConfig`:

```ts
hotelOptions?: Record<City, HotelOptionConfig[]>
```

- Build `hotelOptions` in `fetchPricingConfig` from every `hotel_prices` row.
- Keep existing `hotels[city][tier]` behavior for fallback and compatibility.
- Prefer a deterministic default per city/tier. If multiple rows share a city/tier, use `isDefault` if the table has it; otherwise preserve the current deterministic ordering.

Tests:

- `fetchPricingConfig` includes all imported hotels in `hotelOptions`.
- Existing tier-only calculation still works.
- Selected Makkah and Madinah hotel IDs override the tier fallback.
- Unknown selected IDs fall back without crashing.
- Monthly hotel prices apply to selected hotels.

### 2. Resolve Hotel Selection in Calculation

Files:

- `lib/budget/calculate.ts`
- `types/index.ts`
- `components/estimator/__tests__/BudgetBreakdown.test.tsx`

Changes:

- Add a helper such as `resolveCityHotel(pricing, city, selectedId, fallbackTier)`.
- Calculate Makkah and Madinah independently.
- Add breakdown metadata:

```ts
hotelMadinahDetail: {
  id?: string
  label: string
  tier: HotelTier
  sarPerNight: number
  nights: number
  roomPax: number
  roomMultiplier: number
}
hotelMakkahDetail: { ...same shape }
```

- Keep `hotelMadinahIdr` and `hotelMakkahIdr` unchanged as per-person IDR totals.

Tests:

- Formula uses `sarPerNight × nights × roomMultiplier ÷ paxPerRoom × sarRate`.
- Breakdown detail reflects selected hotel and selected month price.
- Totals stay backward compatible for estimates without hotel IDs.

### 3. Update AI Prompt and Parser

Files:

- `lib/ai/prompt.ts`
- `lib/ai/parse.ts`
- `lib/ai/__tests__/parse.test.ts`
- `app/api/estimate/parse/route.ts`

Changes:

- Include compact hotel options in the prompt by city:

```text
Makkah hotels:
- id=..., label=Olayan Ajyad, tier=STANDARD, SAR=...
Madinah hotels:
- id=..., label=Kayan Hotel, tier=STANDARD, SAR=...
```

- Extend expected JSON output with optional `makkahHotelId` and `madinahHotelId`.
- Normalize model output:
  - Accept IDs only if they exist in `pricing.hotelOptions`.
  - If the model names a hotel but omits an ID, run local normalized label matching before falling back.
  - If no exact match exists, select comparable same-city hotel by same tier, then closest SAR price.
- In AI notes, include clear substitutions:

```text
Hotel Kayan Madinah tidak ada di daftar harga; memakai opsi setara STANDARD Madinah: ...
```

Tests:

- Prompt contains real hotel IDs and labels.
- Parsing the user example selects Olayan Ajyad for Makkah and Kayan Hotel or a same-level Madinah fallback.
- Invalid hotel IDs are ignored or replaced by fallback.
- November remains selected as `travelMonth: 11`.

### 4. Replace the Hotel UI with City-Specific Selectors

Files:

- `components/estimator/ParamsPanel.tsx`
- `components/estimator/RadioCardGrid.tsx`
- `components/estimator/EstimatorClient.tsx`
- `components/estimator/__tests__/EstimatorPreFill.test.tsx`

Changes:

- Replace the single "Kategori Hotel" section with:
  - `Hotel Madinah`
  - `Hotel Makkah`
- Render options from `pricing.hotelOptions.MADINAH` and `pricing.hotelOptions.MAKKAH`.
- Show each card with label, tier/sublabel, and the selected month price.
- Use `params.madinahHotelId ?? fallbackHotelForTier("MADINAH", params.hotelTier).id` as the selected UI value.
- Use `params.makkahHotelId ?? fallbackHotelForTier("MAKKAH", params.hotelTier).id` as the selected UI value.
- When an admin selects a concrete hotel, update the corresponding ID.
- Keep `hotelTier` as a compatibility/fallback field. If both selected hotels are the same tier, update `hotelTier` to that tier; otherwise leave it as the fallback tier.
- If option counts are large, add compact tier filters per city before adding search. Search can be a follow-up if the imported list becomes too long.

Tests:

- UI renders more than four hotel options when pricing contains imported rows.
- Makkah and Madinah selections update different params fields.
- Existing `hotelTier`-only params still show sensible selected defaults.
- Changing `travelMonth` updates hotel card badges.

### 5. Clarify Cost Breakdown

Files:

- `components/estimator/BudgetBreakdown.tsx`
- `lib/export/whatsapp.ts`
- `lib/export/pdf.ts`
- Relevant export and component tests

Changes:

- Change generic hotel rows from:

```text
Hotel Madinah      Rp ...
Hotel Makkah       Rp ...
```

to:

```text
Hotel Madinah - Kayan Hotel       Rp ...
SAR 250 × 4 malam ÷ 4 orang/kamar

Hotel Makkah - Olayan Ajyad       Rp ...
SAR 350 × 8 malam ÷ 4 orang/kamar
```

- Keep values as per-person totals.
- Add a small `per orang` hint for hotel rows if needed.
- Ensure exports use the same selected hotel names and formula details.

Tests:

- Breakdown renders selected hotel labels.
- Breakdown renders nights and room-sharing divisor.
- Export output includes selected hotels.

### 6. Update API Validation and Persistence

Files:

- `app/api/estimate/route.ts`
- `app/api/estimate/[id]/route.ts`
- `app/api/estimate/__tests__/route.test.ts`

Changes:

- Accept optional `makkahHotelId`, `madinahHotelId`, and `travelMonth` in validation.
- Validate hotel IDs against `fetchPricingConfig(db)` when saving.
- If an ID is missing or invalid, either reject with a clear 400 or normalize to fallback before saving. Prefer normalization for AI parse output and rejection for direct save/update payloads.
- Keep saved params JSON backward compatible.

Tests:

- POST/PATCH accepts params with valid city hotel IDs.
- POST/PATCH rejects mismatched city IDs, such as a Madinah ID in `makkahHotelId`.
- Existing tier-only payloads still pass.
- Totals are recalculated from selected hotel IDs.

### 7. Documentation and QA

Files:

- `docs/FEATURES.md`
- `docs/plans/2026-05-09-002-feat-concrete-hotel-selection-plan.md`

Changes:

- Document that concrete hotel selection uses imported admin pricing, not live OTA pricing.
- Document fallback behavior for unavailable hotels.
- Document that hotel totals are per person after room sharing.

Verification:

- Run unit tests:

```bash
npm test
```

- Run targeted tests while developing:

```bash
npm test -- lib/budget/__tests__/calculate.test.ts
npm test -- lib/ai/__tests__/parse.test.ts
npm test -- components/estimator/__tests__/BudgetBreakdown.test.tsx
npm test -- app/api/estimate/__tests__/route.test.ts
```

- Manually test the provided input:

```text
Assalamualaikum selamat pagi dari indo kakak , saya baca kakak bisa bantu umroh mandiri , boleh spill kisaran harga umroh 12 hari hotel di mekkah boleh di olayan ajyad di madinah kayan hotel untuk bulan november kak 2pax
```

Expected result:

- `travelMonth = 11`
- 12-day trip maps to 4 nights Madinah and 8 nights Makkah, unless parser rules are changed separately.
- Makkah selected hotel is Olayan Ajyad if available; otherwise same-level Makkah fallback.
- Madinah selected hotel is Kayan Hotel if available; otherwise same-level Madinah fallback.
- Breakdown hotel rows show selected hotel names and formulas using 4 and 8 nights.

## Risks

- Large hotel option lists may make the card UI too tall. Mitigation: add tier filters first, then search if needed.
- AI may return labels instead of IDs. Mitigation: local normalized label matching and strict ID validation.
- One legacy `hotelTier` cannot represent different Makkah and Madinah selected tiers. Mitigation: use concrete hotel IDs as primary and keep `hotelTier` only as fallback/default.
- More prompt context may increase parse cost. Mitigation: include compact hotel option rows only, not full monthly matrices unless needed.

## Rollout

1. Land type/pricing/calculate changes with compatibility tests.
2. Land parser changes and targeted prompt tests.
3. Land UI changes and breakdown clarity.
4. Land API validation and export updates.
5. Run full test suite and manually verify the supplied user input.

## Completion Criteria

- Admin can select concrete Makkah and Madinah hotels from imported pricing data.
- AI parse can select or substitute hotels from a natural language request.
- Hotel totals use selected hotel nightly rates, selected month, city-specific nights, room multiplier, and room-sharing divisor.
- Breakdown makes the hotel formula visible enough to remove ambiguity.
- Existing saved estimates without hotel IDs still load and calculate.
- `npm test` passes.
