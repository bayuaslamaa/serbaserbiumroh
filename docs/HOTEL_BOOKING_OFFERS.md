# Hotel Booking Offers

This document is the operating guide for the manual hotel booking catalog. The public experience resembles an OTA search, but the application only publishes catalog quotes and starts a WhatsApp request. Availability, payment, and booking confirmation remain manual.

## Product Boundary

- `/hotel-nusuk` remains the hotel recommendation and reference directory.
- `/pesan-hotel` is the date-search and quote surface.
- The application does not hold inventory, charge a customer, issue a voucher, or confirm a booking.
- An `ACTIVE` result is eligible to be requested. It is not proof that the hotel still has inventory.

## Data Model

`hotel_booking_offers` stores one room/rate window per row. One hotel can therefore have multiple rows for different periods, room types, cancellation rules, or prices. It can optionally reference `hotel_listings`, but standalone hotels are supported.

Important fields:

| Field | Meaning |
|---|---|
| `hotel_name`, `city`, `tier` | Display identity used by public results and admin maintenance |
| `hotel_listing_id` | Optional link to an existing Hotel Nusuk listing |
| `period_start` | Earliest allowed check-in boundary |
| `period_end` | Latest allowed check-out boundary |
| `room_type`, `rate_label`, `offer_label` | Room/rate variant identity |
| `room_basis` | Price basis, currently expected to describe a per-room, per-night rate |
| `price_amount`, `currency` | Catalog price per room per night |
| `max_adults`, `max_guests` | Optional per-room occupancy caps; both are evaluated against the entered adults count (search does not collect a separate guest count) |
| `min_nights` | Minimum stay length |
| `status` | Publication state: `ACTIVE`, `UNAVAILABLE`, or `INACTIVE` |
| `verified_at` | Last manual rate verification date |
| `import_key` | Stable normalized identity used by CRUD and CSV import |

Date matching uses a checkout boundary: `period_start <= check_in` and `check_out <= period_end`. For example, a stay from July 1 to July 5 is four nights and requires a rate window whose `period_end` is at least July 5.

The displayed quote is:

```text
price_amount x nights x rooms
```

Taxes, fees, exchange conversion, live inventory, and payment are not calculated by this feature.

## Public Flow

1. The jamaah opens `/pesan-hotel` and enters check-in, check-out, rooms, adults, and optional city or hotel-name filters.
2. The page considers only `ACTIVE` rows whose date window, minimum stay, and occupancy limits match.
3. Matching rates are grouped by hotel and displayed as separate room/rate options.
4. `Ajukan Booking` opens WhatsApp with the hotel, dates, nights, rooms, adults, selected rate, and estimated total.
5. The admin checks final availability with the hotel and continues payment and confirmation manually.

`NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL` may contain either a WhatsApp URL or a phone number. Without it, the request button is disabled.

## Admin Workflow

Use `/admin/content/hotel-booking-offers` to create, edit, delete, or bulk import rate windows.

Recommended publishing sequence:

1. Import or create rows as `INACTIVE`.
2. Verify hotel identity, date boundaries, room basis, price, occupancy, and cancellation text.
3. Record `verified_at` and change only requestable rows to `ACTIVE`.
4. Recheck the public result with representative stay dates.
5. Change stale inventory to `UNAVAILABLE` or `INACTIVE`; do not leave an unverified row active.

Admin writes and confirmed imports revalidate `/pesan-hotel`.

## CSV Bulk Import

Download the canonical template from the admin import panel or `GET /api/admin/hotel-booking-offers/import/template`. The repository copy is [templates/hotel-booking-offer-import-template.csv](templates/hotel-booking-offer-import-template.csv).

The import has two phases:

1. Preview parses every row and reports `create`, `update`, `invalid`, or `conflict` without writing.
2. Confirm parses the same CSV again and applies only `create` and `update` rows in one database transaction.

Required columns are `city`, `tier`, `hotel_name`, `period_start`, `period_end`, `room_basis`, and `price_amount`. Supported currencies are `SAR`, `USD`, and `IDR`. A file is limited to 256 KiB and 500 rows.

Rows are matched using city, tier, normalized hotel name, date boundaries, room basis, offer label, room type, and rate label. This allows one hotel and period to hold multiple prices as separate room/rate rows. During migration from the legacy key format, at most one new row updates the legacy record; additional distinct rates are created as new rows.

Repository fixtures:

- `docs/templates/hotel-booking-offer-import-template.csv`: one canonical example row.
- `docs/templates/hotel-booking-offer-import-gemini-2027-dummy.csv`: eight hotels with monthly rate windows from July 2026 through February 2027.
- `docs/templates/hotel-booking-offer-import-ota-2027-dummy.csv`: dummy offers derived from the OTA pricing research source.
- `docs/templates/hotel-booking-offer-import-available-from-folder.csv`: generated working data from the prepared source folder.

Treat research and dummy files as starting data. Keep them `INACTIVE` until an admin verifies the price and period.

## Reset and Reimport

Preview the number of rows that would be removed:

```bash
npm run db:reset:hotel-booking-offers -- --dry-run
```

Delete every hotel booking offer only after reviewing the count:

```bash
npm run db:reset:hotel-booking-offers -- --yes
```

The reset is destructive and does not affect Hotel Nusuk listings or estimator hotel pricing. After reset, import the selected CSV through the admin preview/confirm flow and activate only verified rows.

## Deployment Checks

Apply the hotel offer table migration before the rate-window migration. A valid chain contains one table-creation migration and one additive rate-window migration; duplicate generated migrations must not be deployed.

After migration, verify:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'hotel_booking_offers'
ORDER BY ordinal_position;

SELECT status, count(*)
FROM hotel_booking_offers
GROUP BY status
ORDER BY status;
```

Then smoke-test one matching stay, one out-of-window stay, one occupancy rejection, and one WhatsApp handoff.

## Main Implementation Files

- `lib/db/schema.ts`: table and indexes.
- `lib/hotel-booking/search.ts`: parameter validation, date matching, occupancy matching, and quote calculation.
- `lib/hotel-booking/whatsapp.ts`: manual handoff message and URL.
- `lib/admin/hotel-booking-offer-import.ts`: CSV template, parser, matching, and preview classification.
- `lib/admin/hotel-booking-offer-payload.ts`: admin CRUD payload validation and import-key generation.
- `app/(public)/pesan-hotel/page.tsx`: public query and result preparation.
- `app/api/admin/hotel-booking-offers/`: admin CRUD and import endpoints.

