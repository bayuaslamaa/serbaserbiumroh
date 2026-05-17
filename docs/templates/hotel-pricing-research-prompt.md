# Hotel Pricing CSV Research Prompt

Use this prompt with another model or research assistant to refine:

- `docs/templates/hotel-pricing-import-ota-recommended-draft.csv`

Use this file as the canonical import schema reference:

- `docs/templates/hotel-pricing-import-template.csv`

The goal is to produce an admin-reviewable hotel pricing CSV for the Umroh budget estimator. The CSV is not a booking guarantee, not an OTA sync, and not a final supplier quote. It is a researched draft that an admin will preview and confirm before importing.

## Prompt

You are helping prepare hotel pricing data for an Umroh budget estimator.

Input file:

`docs/templates/hotel-pricing-import-ota-recommended-draft.csv`

Output requirement:

Return a complete CSV with the exact same columns and one row per hotel:

```csv
city,tier,label,sublabel,distance,base_sar_per_night,jan_sar,feb_sar,mar_sar,apr_sar,may_sar,jun_sar,jul_sar,aug_sar,sep_sar,oct_sar,nov_sar,dec_sar
```

Do not add columns. Do not remove columns. Do not return markdown tables. Return only CSV content plus a short notes section after the CSV if needed.

## What To Research

For each hotel row, estimate realistic SAR/night pricing for 2027 by month using public OTA-style signals where possible:

- Agoda
- Booking.com
- Trip.com
- Expedia
- Google hotel snippets
- Official hotel website
- Other credible OTA or hotel listing pages

If live prices are unavailable, use nearby comparable hotels in the same city, tier, distance band, and brand class.

Also research the `distance` column for each hotel. This is a human-readable proximity note relative to Masjidil Haram for Makkah hotels and Masjid Nabawi for Madinah hotels. Acceptable values include examples like `pelataran`, `ring 1`, `250m`, `0.7 km`, `5 min walk`, `jalan kaki`, or `shuttle area`. If exact distance is unclear, use a conservative distance band or proximity phrase rather than inventing precision.

### Deep Research Requirements for `distance`

For every row, actively research distance/proximity instead of treating it as optional filler.

Use the best available evidence in this priority order:

1. Official hotel website or official hotel listing.
2. Google hotel/business profile snippets.
3. OTA listing details from Agoda, Booking.com, Trip.com, Expedia, or similar.
4. Repeated traveler-review signals that clearly mention walking distance or shuttle area.
5. Comparable nearby hotels in the same district/brand class if direct evidence is unavailable.

Distance anchors:

- `MAKKAH`: distance is relative to Masjidil Haram / Kaaba / Haram courtyard.
- `MADINAH`: distance is relative to Masjid Nabawi / Prophet's Mosque.

Prefer these normalized distance styles:

- `pelataran/ring 1` for courtyard or immediate mosque-front/tower properties.
- `100m jalan kaki`, `250m jalan kaki`, `0.5 km jalan kaki`, or similar when a numeric distance is credible.
- `5 min walk` only if the source uses walking-time language and numeric meters are not available.
- `shuttle area`, `>1 km shuttle`, or `farther/shuttle` for hotels that are not reliable walking-distance options.
- Blank only when there is no usable evidence and no comparable distance band can be inferred.

Do not put long source explanations in the `distance` cell. Keep evidence and caveats in Source Notes.

## Calendar Assumptions

The pricing is for a 2027 planning calendar.

Important seasonality:

- January 2027: winter holiday and pre-Ramadan demand. Should usually be above base.
- February 2027: Ramadan is projected to begin around February 8, 2027 in Saudi Arabia. Treat this as peak demand.
- March 2027: late Ramadan and Eid period. Usually the highest or near-highest month.
- April 2027: post-Eid and spring demand. Still elevated, but normally below February and March.
- May, June, September, October, November: usually closer to base unless hotel-specific evidence says otherwise.
- July and August: summer demand can be mildly elevated.
- December: winter holiday demand, normally above base.

Do not leave January and February as the lowest months unless there is strong evidence for that specific hotel.

## Tier Rules

Use only these tier values:

- `ECONOMY`
- `STANDARD`
- `PELATARAN`
- `PREMIUM`

Use the tier as a pricing/positioning bucket, not only official star rating.

General guide:

- `ECONOMY`: budget hotels, farther from Haram/Nabawi, weaker brand signal, shuttle or longer walk.
- `STANDARD`: normal 3-4 star OTA hotels, acceptable quality, not the strongest near-haram positioning.
- `PELATARAN`: close, high-demand, or strong 4-star hotels near Haram/Nabawi, but not clearly premium luxury.
- `PREMIUM`: 5-star, tower hotels, iconic near-Haram/Nabawi properties, or very strong premium brands.

If you change a row's tier, keep the label stable and explain the reason in the notes.

## Pricing Rules

All prices must be integers in SAR per room per night.

Use conservative admin-review pricing, not the cheapest possible OTA price and not an extreme outlier. Prefer median-like public rates.

For each row:

- `base_sar_per_night`: normal non-peak expected SAR/night.
- `jan_sar`: winter/pre-Ramadan expected SAR/night.
- `feb_sar`: Ramadan-start expected SAR/night.
- `mar_sar`: late Ramadan/Eid expected SAR/night.
- `apr_sar`: post-Eid/spring expected SAR/night.
- `may_sar` through `nov_sar`: normal or seasonal values based on evidence.
- `dec_sar`: winter holiday expected SAR/night.

Use city-sensitive pricing:

- Makkah near-Haram hotels usually have stronger Ramadan spikes than Madinah.
- Madinah near-Nabawi hotels still spike in Ramadan, but usually less aggressively than Makkah tower hotels.
- Farther shuttle hotels should spike less than tower or pelataran hotels.

## Data Quality Rules

Preserve import safety:

- Keep `city` as `MAKKAH` or `MADINAH`.
- Keep all price cells positive integers.
- Keep labels non-empty.
- Keep `distance` concise and human-readable. Do not claim exact walking access unless there is a credible source or strong OTA/listing signal.
- Keep `distance` useful for matching prompts like "pelataran", "ring 1", "jalan kaki", "dekat haram", and "dekat nabawi".
- Avoid duplicate keys after normalization: `city + tier + lower(trimmed label)`.
- Do not include commas inside any CSV field unless the field is properly quoted.
- Do not invent exact live availability. If evidence is weak, provide a reasoned estimate and mark it in notes.
- Do not claim that any hotel is guaranteed to be approved. Approval depends on each hotel's rules and OTA/supplier process.

## Source Notes

After the CSV, include a short notes section with:

- Which hotels had direct public price/rating evidence.
- Which hotels were estimated from comparable properties.
- Any tier changes made and why.
- Any hotel names that may need normalization or manual confirmation.
- Which distance values are direct evidence versus comparable estimates.
- Which hotels still need manual distance confirmation before admin import.

Keep source notes concise. Do not paste long excerpts from websites.

## Final Check Before Returning

Before returning the CSV, verify:

- Every row has exactly 18 columns.
- Every monthly price is a positive integer.
- Every row has a concise `distance` value, or a clear blank if distance could not be researched.
- January, February, March, April, and December reflect 2027 seasonality.
- There are no duplicate normalized keys.
- The output can be imported by the existing admin CSV preview flow.
