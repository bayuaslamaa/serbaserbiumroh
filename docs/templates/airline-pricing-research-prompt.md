# Airline Pricing CSV Research Prompt

Use this prompt with another model or research assistant to refine:

- `docs/templates/airline-pricing-import-template.csv`

The goal is to produce an admin-reviewable airline pricing CSV for the Umroh budget estimator. The CSV is not a booking guarantee, not a live fare sync, and not a final airline/supplier quote. It is a researched draft that an admin will preview and confirm before importing.

## Prompt

You are helping prepare airline pricing data for an Umroh budget estimator.

Input file:

`docs/templates/airline-pricing-import-template.csv`

Output requirement:

Return a complete CSV with the exact same columns and one row per airline option:

```csv
tier,label,sublabel,base_idr_per_person,is_default,jan_idr,feb_idr,mar_idr,apr_idr,may_idr,jun_idr,jul_idr,aug_idr,sep_idr,oct_idr,nov_idr,dec_idr
```

Do not add columns. Do not remove columns. Do not return markdown tables. Return only CSV content plus a short notes section after the CSV if needed.

## What To Research

For each airline option row, estimate realistic IDR round-trip pricing per person for 2027 by month using public flight-search or OTA-style signals where possible:

- Google Flights
- Skyscanner
- Traveloka
- Tiket.com
- Expedia
- Trip.com
- Agoda flight search where available
- Official airline websites
- Other credible flight search or OTA pages

Research fares for typical Indonesia to Saudi Umroh routing. If exact route/date prices are unavailable, use comparable routes and carriers in the same tier.

Suggested route assumptions:

- Indonesia origin: Jakarta first, then Surabaya or other major Indonesian origins if Jakarta data is unavailable.
- Saudi destination: Jeddah or Madinah, whichever is representative for Umroh packages.
- Fare type: round-trip economy unless the tier is `BUSINESS`.
- Passenger: adult, one person.
- Include normal taxes/fees when public fare pages show them.
- Do not model baggage, refund, seat inventory, visa, hotel, or land-arrangement costs in this CSV.

## Calendar Assumptions

The pricing is for a 2027 planning calendar.

Important seasonality:

- January 2027: winter holiday and pre-Ramadan demand. Should usually be above base.
- February 2027: Ramadan is projected to begin around February 8, 2027 in Saudi Arabia. Treat this as peak demand.
- March 2027: late Ramadan and Eid period. Usually the highest or near-highest month.
- April 2027: post-Eid and spring demand. Still elevated, but normally below February and March.
- May, June, September, October, November: usually closer to base unless route/carrier evidence says otherwise.
- July and August: school holiday and summer demand can be mildly elevated.
- December: winter holiday demand, normally above base.

Do not leave January and February as the lowest months unless there is strong evidence for that specific airline option.

## Tier Rules

Use only these tier values:

- `BUDGET`
- `STANDARD`
- `GARUDA`
- `BUSINESS`

Use the tier as a pricing/positioning bucket:

- `BUDGET`: budget or low-cost carriers, often transit, lower service expectation, cheapest realistic Umroh flight bucket.
- `STANDARD`: mainstream economy carriers or mixed airline options, usually acceptable Umroh package default.
- `GARUDA`: Garuda Indonesia economy or Garuda-like direct/premium economy positioning.
- `BUSINESS`: business class or premium cabin assumptions.

If you change a row's tier, keep the label stable and explain the reason in the notes.

## Default Rules

The estimator uses one default airline option per tier.

- Keep `is_default` as `true` for the primary option in each tier.
- Use `false` for non-primary options if you add additional airline options.
- There must be at most one `true` row per tier.
- If you add multiple options in the same tier, choose the most representative package-estimator option as default.

## Pricing Rules

All prices must be integers in IDR round-trip per person.

Use conservative admin-review pricing, not the cheapest possible flash-sale fare and not an extreme outlier. Prefer median-like public rates suitable for package estimation.

For each row:

- `base_idr_per_person`: normal non-peak expected round-trip IDR/person.
- `jan_idr`: winter/pre-Ramadan expected IDR/person.
- `feb_idr`: Ramadan-start expected IDR/person.
- `mar_idr`: late Ramadan/Eid expected IDR/person.
- `apr_idr`: post-Eid/spring expected IDR/person.
- `may_idr` through `nov_idr`: normal or seasonal values based on evidence.
- `dec_idr`: winter holiday expected IDR/person.

Use tier-sensitive pricing:

- Budget carriers should usually remain below standard carriers, but may spike sharply in Ramadan if inventory is limited.
- Standard carriers should represent realistic Umroh package defaults.
- Garuda should usually price above standard economy, especially for direct or premium routing.
- Business should remain clearly higher than economy tiers and should spike during Ramadan/holiday periods.

## Data Quality Rules

Preserve import safety:

- Keep `tier` as `BUDGET`, `STANDARD`, `GARUDA`, or `BUSINESS`.
- Keep all price cells positive integers.
- Keep labels non-empty.
- Avoid duplicate keys after normalization: `tier + lower(trimmed label)`.
- Do not include commas inside any CSV field unless the field is properly quoted.
- Keep `is_default` as `true` or `false`.
- Do not invent exact live availability. If evidence is weak, provide a reasoned estimate and mark it in notes.
- Do not claim that any flight, fare, route, or booking is guaranteed to be available or approved.

## Source Notes

After the CSV, include a short notes section with:

- Which airline options had direct public fare evidence.
- Which airline options were estimated from comparable routes/carriers.
- Any tier changes made and why.
- Any labels that may need normalization or manual confirmation.
- Date checked and broad source type, for example: "Google Flights May 2026 search snippets" or "Traveloka comparable Jakarta-Jeddah fares."

Keep source notes concise. Do not paste long excerpts from websites.

## Final Check Before Returning

Before returning the CSV, verify:

- Every row has exactly 17 columns.
- Every monthly price is a positive integer.
- `is_default` is `true` or `false`.
- At most one row per tier has `is_default=true`.
- January, February, March, April, and December reflect 2027 seasonality.
- There are no duplicate normalized keys.
- The output can be imported by the existing admin CSV preview flow.
