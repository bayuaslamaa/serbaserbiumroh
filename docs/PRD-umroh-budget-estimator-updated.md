# PRD: Umroh Budget Estimator

**Product Requirements Document**  
Version 2.0 | Updated 2026-05-12  
Source: `PRD-umroh-budget-estimator (1).md`

---

## 1. Overview

### Product Summary

Umroh Planner is a full-stack web application for planning independent Umroh budgets. Users describe an Umroh plan in natural language, the AI parser converts it into structured trip parameters, and the estimator produces an itemized budget per person and per group. Admins manage the pricing and content data used by the estimator.

The product now includes:

- Natural-language budget estimation in Bahasa Indonesia and English.
- Manual controls for nights, pax, month, hotel, room type, airline, and services.
- Concrete hotel selection per city, not only generic hotel tiers.
- Monthly hotel and airline pricing for seasonal demand.
- Saved estimate dashboard and estimate detail pages.
- PDF and WhatsApp export.
- Admin pricing management with CSV import for hotel and airline prices.
- Public guide, FAQ, Hotel Nusuk directory, and pilgrim story content.
- Admin FAQ, hotel listing, and pilgrim story management.

### Goals

- Help pilgrims and travel planners estimate Umroh costs quickly from a conversational prompt.
- Preserve transparent budget math and itemized breakdowns.
- Let admins keep pricing realistic as seasons, airlines, exchange rates, and hotels change.
- Make hotel matching more practical by using concrete imported hotel options and distance/proximity metadata.
- Provide public supporting content that helps users understand Umroh planning tradeoffs.

### Non-Goals

- Payment processing.
- Booking or reservation guarantees.
- Live OTA scraping or availability sync.
- Hotel approval guarantee.
- Exact geocoding or walking-route validation.
- Multi-language UI beyond Indonesian-first copy.

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + local UI components |
| Database | PostgreSQL via Drizzle ORM |
| Auth | NextAuth v5, credentials, Google OAuth |
| AI | Anthropic Claude API |
| Markdown/content | MDX, React Markdown |
| Tests | Vitest + Testing Library |
| Package scripts | npm scripts with existing lockfiles |

---

## 3. Core Domain Model

All schema definitions live in `lib/db/schema.ts`.

### Pricing Tables

- `exchange_rates`: SAR and USD to IDR rates.
- `hotel_prices`: estimator hotel pricing rows.
  - City: `MAKKAH` or `MADINAH`.
  - Tier: `ECONOMY`, `STANDARD`, `PELATARAN`, `PREMIUM`.
  - `importKey`: unique normalized key for CSV/manual duplicate prevention.
  - `sarPerNight`: base SAR per room per night.
  - `label` and `sublabel`: display and matching context.
  - `distance`: optional human-readable proximity note relative to Masjidil Haram for Makkah or Masjid Nabawi for Madinah.
- `hotel_monthly_prices`: 12 monthly SAR overrides per hotel price row.
- `airline_prices`: concrete airline options grouped by tier.
  - Tier: `BUDGET`, `STANDARD`, `GARUDA`, `BUSINESS`.
  - `isDefault`: one default airline option per tier.
  - `importKey`: unique normalized key for imports.
- `airline_monthly_prices`: 12 monthly IDR overrides per airline option.
- `service_fees`: additional service costs with currency, enabled state, and `divideByPax`.
- `room_multipliers`: room sharing multiplier and pax divisor.

### User and Estimate Tables

- `users`: Auth users with `USER` or `ADMIN` role.
- Auth.js tables: `accounts`, `sessions`, `verification_tokens`.
- `estimates`: saved estimate snapshots with raw input, AI notes, JSONB params, and totals.

### Public Content Tables

- `pilgrim_stories` and related itinerary/packing item tables.
- `hotel_listings`: public Hotel Nusuk directory with `distanceMeters`, facilities, notes, and publish state.
- `faq_groups` and `faq_items`: grouped FAQ content with rich answers and publish state.

---

## 4. Estimate Params and Pricing Config

`types/index.ts` is the shared type source for estimator data.

### `EstimateParams`

- `nightsMadinah`
- `nightsMakkah`
- `pax`
- `hotelTier`
- `madinahHotelId`
- `makkahHotelId`
- `roomType`
- `airline`
- `travelMonth`
- `services`
- `fullboard`

`hotelTier` remains the legacy fallback. Concrete hotel IDs win when present.

### `PricingConfig`

- `rates`
- `hotels`: city/tier fallback map.
- `hotelOptions`: full concrete hotel option list by city.
- `airlines`: tier default map.
- `airlineOptions`: concrete airline option list by tier.
- `services`
- `roomMultipliers`

---

## 5. Budget Calculation

The budget engine is `calculateBudget(params, pricing)` in `lib/budget/calculate.ts`.

### Hotel Formula

```text
sarPerNight × nights × roomMultiplier × ceil(pax / paxPerRoom) × sarRate / pax
```

Rules:

- Selected `madinahHotelId` and `makkahHotelId` override tier fallback.
- `travelMonth` applies monthly hotel override first, then base `sarPerNight`.
- Hotel distance metadata does not change cost math. It only improves hotel matching and selection.

### Airline Formula

- Selected airline tier resolves to its default concrete airline option.
- `travelMonth` applies monthly airline override first, then base IDR.
- `airline: "NONE"` produces `flightIdr = 0`.

### Service Fees

- SAR and USD are converted to IDR using current exchange rates.
- IDR service fees pass through unchanged.
- `divideByPax` splits group-shared services for per-person display.
- Disabled services are excluded.

---

## 6. AI Parsing

`lib/ai/parse.ts` calls Anthropic and validates the returned JSON. `lib/ai/prompt.ts` builds the static and dynamic prompt.

The AI parser must:

- Extract trip nights, pax, month, hotel tier, hotel names/IDs, room type, airline, services, and fullboard.
- Preserve explicit no-flight requests as `airline: "NONE"`.
- Correct accidental no-flight output when the user did not ask for no flight.
- Convert total days into Madinah/Makkah nights when the user says days instead of nights.
- Include hotel options with IDs, SAR price, tier, notes, and distance metadata.
- Prefer proximity-aware hotel choices for prompts containing terms like `pelataran`, `ring 1`, `jalan kaki`, `dekat`, `near haram`, or `near nabawi`.
- If a requested hotel is not in the local pricing list, choose a same-city, same-tier comparable option and explain the substitution.

Distance is best-effort ranking metadata. It must not be presented as a booking, approval, or exact walking-route guarantee.

---

## 7. User Experience

### Public Pages

- `/`: public home page.
- `/panduan`: guide index.
- `/panduan/[slug]`: MDX guide page.
- `/cerita-jamaah`: pilgrim stories list.
- `/cerita-jamaah/[slug]`: story detail.
- `/hotel-nusuk`: Hotel Nusuk directory.
- `/faq`: public FAQ page.

### Authenticated Pages

- `/dashboard`: saved estimates and FAQ preview.
- `/estimate/new`: freeform input, parsed params, manual controls, and live budget breakdown.
- `/estimate/[id]`: saved estimate detail with export.

### Estimator Controls

- Freeform trip description.
- Madinah and Makkah night steppers.
- Pax stepper.
- Travel month selector.
- City-specific hotel selectors for Madinah and Makkah.
- Room type selector.
- Airline selector, including no-flight option.
- Additional service checkboxes.
- Fullboard toggle.
- Save estimate action.

---

## 8. Admin Experience

Admin routes live under `/admin/*` and require `role === ADMIN`.

### Pricing Management: `/admin/pricing`

Admins can manage:

- Exchange rates.
- Hotel base prices, monthly prices, labels, and distance/proximity metadata.
- Hotel CSV import with preview/confirm.
- Airline options, defaults, monthly prices.
- Airline CSV import with preview/confirm.
- Service fee amounts, enabled state, and divide-by-pax behavior.

Hotel CSV columns:

```csv
city,tier,label,sublabel,distance,base_sar_per_night,jan_sar,feb_sar,mar_sar,apr_sar,may_sar,jun_sar,jul_sar,aug_sar,sep_sar,oct_sar,nov_sar,dec_sar
```

Airline CSV columns:

```csv
tier,label,sublabel,base_idr_per_person,is_default,jan_idr,feb_idr,mar_idr,apr_idr,may_idr,jun_idr,jul_idr,aug_idr,sep_idr,oct_idr,nov_idr,dec_idr
```

### Content Management

- `/admin/users`: user list.
- Admin hotel listing routes for Hotel Nusuk content.
- Admin pilgrim story routes and publish toggles.
- `/admin/content/faqs`: FAQ group and Q&A management.
- FAQ CSV import with group creation and update-existing behavior.

---

## 9. API Surface

### Estimate APIs

- `POST /api/estimate/parse`
- `POST /api/estimate`
- `GET /api/estimate`
- `GET /api/estimate/[id]`
- `PATCH /api/estimate/[id]`
- `DELETE /api/estimate/[id]`
- `GET /api/estimate/[id]/export?format=pdf|whatsapp`

### Admin Pricing APIs

- `GET /api/admin/pricing`
- `POST /api/admin/pricing/hotel`
- `PATCH /api/admin/pricing/[category]`
- `GET /api/admin/pricing/hotel-import/template`
- `POST /api/admin/pricing/hotel-import/preview`
- `POST /api/admin/pricing/hotel-import/confirm`
- `POST /api/admin/pricing/airline`
- `GET /api/admin/pricing/airline-import/template`
- `POST /api/admin/pricing/airline-import/preview`
- `POST /api/admin/pricing/airline-import/confirm`

### Admin Content APIs

- `GET/POST /api/admin/faqs`
- `GET/PUT/DELETE /api/admin/faqs/[id]`
- `GET/POST /api/admin/faqs/groups`
- `PUT/DELETE /api/admin/faqs/groups/[id]`
- `GET /api/admin/faqs/import/template`
- `POST /api/admin/faqs/import/preview`
- `POST /api/admin/faqs/import/confirm`
- `GET/POST /api/admin/hotels`
- `GET/PUT/DELETE /api/admin/hotels/[id]`
- `GET/POST /api/admin/stories`
- `GET/PUT/DELETE /api/admin/stories/[id]`
- `POST /api/admin/stories/[id]/publish`

---

## 10. Templates and Research Docs

Templates live in `docs/templates/`.

- `hotel-pricing-import-template.csv`
- `hotel-pricing-research-prompt.md`
- `hotel-pricing-import-ota-recommended-draft.csv`
- `hotel-pricing-import-ota-2027-researched.csv`
- `airline-pricing-import-template.csv`
- `airline-pricing-research-prompt.md`
- `faq-import-template.csv`

Hotel pricing research must account for:

- City.
- Tier.
- Brand and quality class.
- Distance band/proximity to Haram or Nabawi.
- Seasonal month pricing for 2027.
- Ramadan and winter holiday spikes.

---

## 11. Testing and Quality

Current full test suite status as of 2026-05-12:

- `npm test`: 31 test files, 290 tests passing.
- `npx tsc --noEmit`: currently blocked by unrelated existing test type-cast errors in admin hotel/story route tests.
- `npm run lint`: currently prompts to configure ESLint through `next lint`, so it is not usable non-interactively until ESLint config is added.

Important test areas:

- `lib/budget/__tests__/calculate.test.ts`
- `lib/ai/__tests__/parse.test.ts`
- `lib/admin/__tests__/hotel-pricing-import.test.ts`
- `lib/admin/__tests__/airline-pricing-import.test.ts`
- `lib/admin/__tests__/faq-import.test.ts`
- `app/api/admin/pricing/__tests__/hotel-import-route.test.ts`
- `app/api/admin/pricing/__tests__/airline-import-route.test.ts`
- `app/api/admin/faqs/__tests__/faq-import-route.test.ts`
- `components/admin/__tests__/PricingTableImport.test.tsx`
- `components/estimator/__tests__/EstimatorPreFill.test.tsx`

---

## 12. Open Product Notes

- The estimator is still a planning aid, not a quote or booking guarantee.
- Hotel approval remains subject to hotel/supplier/OTA rules.
- Distance/proximity values are admin-entered research metadata and should be reviewed before import.
- Live OTA scraping remains out of scope until a separate legal/technical plan exists.
- Pricing imports should remain preview-confirm workflows to avoid accidental production data changes.
