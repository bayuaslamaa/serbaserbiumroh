---
date: 2026-05-08
topic: hotel-pricing-csv-import
---

# Hotel Pricing CSV Import

## Summary

Add an admin CSV bulk import for estimator hotel pricing. The feature lets admins download or reference a dummy CSV template, upload hotel pricing rows with base and monthly SAR prices, preview the resulting creates/updates/errors, then confirm the import without creating duplicate hotel pricing rows.

---

## Problem Frame

Admins currently manage estimator hotel pricing through individual inline edits and a single-hotel add form. That works for small corrections, but becomes slow and error-prone when hotel packages or seasonal monthly prices need to be entered in bulk from a spreadsheet.

---

## Actors

- A1. Admin pricing manager: Maintains hotel price data used by the Umroh budget estimator.
- A2. Estimator user: Receives budget calculations based on the imported hotel pricing data.

---

## Key Flows

- F1. Preview hotel pricing CSV import
  - **Trigger:** Admin uploads a CSV in the hotel pricing admin area.
  - **Actors:** A1
  - **Steps:** Admin selects a CSV, starts validation, reviews a preview grouped by rows that will be created, updated, rejected, or flagged as duplicate/conflict.
  - **Outcome:** No pricing data is written yet; the admin can decide whether the import is safe to confirm.
  - **Covered by:** R1, R2, R3, R4, R5

- F2. Confirm validated import
  - **Trigger:** Admin confirms a valid preview.
  - **Actors:** A1, A2
  - **Steps:** Admin confirms the preview, valid rows are applied, existing matching hotel pricing rows are updated, unique new rows are created, and invalid/conflicting rows remain unapplied.
  - **Outcome:** Estimator pricing uses the newly imported hotel base and monthly prices.
  - **Covered by:** R4, R5, R6, R7

---

## Requirements

**CSV template and format**
- R1. The admin experience must provide a dummy CSV template for hotel pricing import.
- R2. The CSV format must use one hotel per row, with required base hotel pricing data and optional monthly SAR price values.
- R3. Monthly price values may be omitted; omitted monthly values must use the row's base SAR price rather than blocking the row.

**Validation and preview**
- R4. Uploading a CSV must produce a preview before any database write occurs.
- R5. The preview must clearly summarize which rows will create new hotel pricing entries, update existing entries, fail validation, or be blocked as duplicate/conflicting rows.
- R6. Invalid rows must identify enough row-level reason for an admin to correct the CSV without guessing.

**Duplicate prevention and writes**
- R7. Confirming an import must update existing hotel pricing rows when the row matches an existing unique hotel entry, rather than creating a duplicate.
- R8. Confirming an import must create a new hotel pricing row only when the row is unique.
- R9. Duplicate rows within the uploaded CSV must not create duplicate database rows.
- R10. Only rows that passed preview validation should be written on confirmation.

**Scope fit**
- R11. The import applies only to estimator hotel pricing data used by budget calculations.
- R12. The feature must preserve the current manual add/edit pricing workflow for admins who only need small changes.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given an admin needs the expected spreadsheet shape, when they access the import affordance, they can obtain or view a dummy CSV template showing one hotel per row with base and monthly SAR price columns.
- AE2. **Covers R3, R4, R5.** Given a CSV row has required base data and blank monthly values, when the admin previews the file, the row is treated as valid and the preview indicates the monthly prices will fall back to the base price.
- AE3. **Covers R4, R7.** Given a CSV row matches an existing hotel pricing entry, when the admin previews and confirms the import, the existing row is updated instead of a new duplicate being created.
- AE4. **Covers R5, R6, R10.** Given a CSV contains one valid row and one row with an invalid city or tier value, when the admin previews the file, the valid row is eligible for import and the invalid row shows a row-level correction reason; confirmation does not write the invalid row.
- AE5. **Covers R8, R9.** Given a CSV contains two rows that resolve to the same unique hotel entry, when the admin previews the file, the duplicate conflict is shown and confirmation cannot create two separate hotel pricing rows from those rows.
- AE6. **Covers R11, R12.** Given Hotel Nusuk directory records exist separately from estimator pricing, when an admin imports estimator pricing hotels, directory fields such as facilities, pilgrim notes, distance, and publish status are not required or changed.

---

## Success Criteria

- Admins can prepare hotel pricing in a spreadsheet, validate it safely, and import it without manually adding each hotel/month combination.
- Duplicate prevention is clear enough that admins trust repeated imports to update intended rows instead of multiplying entries.
- Planning can proceed without inventing the import target, row shape, preview behavior, duplicate behavior, or out-of-scope hotel directory behavior.

---

## Scope Boundaries

- Do not import Hotel Nusuk public directory data such as facilities, pilgrim notes, distance, publish status, or public hotel listing copy.
- Do not import airline prices, service fees, exchange rates, or room multipliers.
- Do not support XLSX in the first version; CSV is enough.
- Do not include fuzzy matching for slightly different hotel names in the first version.
- Do not sync with external supplier systems.
- Do not replace the existing manual admin pricing workflow.

---

## Key Decisions

- One hotel per CSV row: This matches how admins work in spreadsheets and avoids spreading one hotel across many rows.
- Monthly prices included in the row: Seasonal pricing is valuable for Umroh planning, and the current product already distinguishes base and monthly hotel pricing.
- Preview before confirm: Bulk imports are risky enough that admins need a safety step before writing data.
- Update existing matching rows: Repeated imports should be useful for refreshing pricing, not a source of duplicate hotel options.
- Start with estimator pricing only: The user explicitly chose estimator pricing hotels first; Hotel Nusuk directory import can be considered later as a separate feature.

---

## Dependencies / Assumptions

- Existing admin authentication and authorization continue to govern access to hotel pricing import.
- The system has a stable way to determine whether a CSV row matches an existing hotel pricing entry; planning should choose the exact match key and conflict handling.
- The dummy CSV template should be easy to open in common spreadsheet tools without requiring non-CSV features.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R7, R9][Technical] What exact uniqueness key should the implementation use for matching existing hotel pricing rows while minimizing accidental collisions?
- [Affects R4, R10][Technical] Should the confirm step re-validate the uploaded data from persisted preview state, or re-parse the submitted CSV payload?
- [Affects R5, R6][Technical] What is the clearest preview UI shape within the existing admin pricing page layout?
