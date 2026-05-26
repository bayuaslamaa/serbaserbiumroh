# Pilgrim Story CSV Research Prompt

Use this prompt to convert mixed Cerita Jamaah source files into `docs/templates/pilgrim-story-import-template.csv` format.

## Goal

Read every relevant source file for one or more jamaah stories, then produce a valid CSV that can be imported into Umroh Planner admin stories.

Source files may be PDF, DOCX, XLSX, JPG, MP4 transcript/notes, or mixed folders. Extract only facts supported by the source. If a value is uncertain, mention the uncertainty in `narrative` rather than inventing precise data.

## Output Contract

Return CSV only, with exactly this header:

```csv
slug,author_name,departure_city,travel_month,travel_year,pax,hotel_tier,airline_tier,makkah_nights,madinah_nights,total_budget_idr,narrative,is_published,is_featured
```

## Field Rules

- `slug`: lowercase kebab-case, unique, based on author/family name and year when available.
- `author_name`: person/family name visible in source or folder/file name.
- `departure_city`: Indonesian departure city if stated. If unknown, use the best supported city from source context and note uncertainty in `narrative`.
- `travel_month`: number `1-12`; leave blank if unknown.
- `travel_year`: numeric year; leave blank if unknown.
- `pax`: number of travelers. If unclear, infer only when source explicitly lists participants; otherwise use `1` and note uncertainty in `narrative`.
- `hotel_tier`: choose one of `ECONOMY`, `STANDARD`, `PELATARAN`, `PREMIUM`.
  - `ECONOMY`: low-cost, far/shuttle/basic.
  - `STANDARD`: mid-range normal hotel.
  - `PELATARAN`: close walking/ring 1/near Haram or Nabawi.
  - `PREMIUM`: 5-star/luxury/Clock Tower/front-row premium.
- `airline_tier`: blank if unknown, otherwise `BUDGET`, `STANDARD`, `GARUDA`, or `BUSINESS`.
- `makkah_nights`, `madinah_nights`: non-negative integers; use `0` if not available.
- `total_budget_idr`: total group budget in IDR. If source provides per-person budget, multiply by `pax` and note the conversion in `narrative`.
- `narrative`: concise Indonesian summary containing route, hotels, flight, notable costs, assumptions, and source filename references.
- `is_published`: `false`.
- `is_featured`: `false`.

## Quality Rules

- Do not output Markdown fences around the final CSV.
- Quote fields that contain commas, quotes, or newlines.
- Keep one story per row. If one source has multiple clearly separate trips, create multiple rows.
- Prefer leaving optional fields blank over hallucinating.
- Required fields must be populated: `slug`, `author_name`, `departure_city`, `pax`, `hotel_tier`, `total_budget_idr`.
- If a required field is truly unavailable, fill the safest defensible placeholder and write `PERLU REVIEW:` in `narrative`.

## Review Checklist

Before returning CSV, verify:

- Header matches exactly.
- All enum values are valid uppercase values.
- Numeric columns contain only numbers or blank where optional.
- `total_budget_idr` is group total, not per-person total.
- Narrative explains any inference or missing source data.
