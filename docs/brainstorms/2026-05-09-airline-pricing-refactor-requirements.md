---
date: 2026-05-09
topic: airline-pricing-refactor
---

# Airline Pricing Refactor

## Summary

Airline pricing will become a richer estimator pricing surface like hotel pricing: admins can manage multiple airline options, set monthly/seasonal prices, bulk import by CSV with preview/confirm, and the estimator can use the selected airline tier/month to calculate a more realistic flight cost.

---

## Problem Frame

Airline pricing currently behaves as a single flat price per broad airline tier. That is simple, but it cannot represent real Umroh flight pricing well: multiple airlines can belong to the same tier, fares vary by month, and admins need a spreadsheet-friendly way to refresh prices without editing each tier manually.

The hotel pricing workflow has moved toward a safer bulk-management model with concrete hotel rows, monthly prices, duplicate prevention, and a preview-confirm import flow. Airline pricing needs the same product capability, while preserving the estimator's simple tier-based user experience.

---

## Actors

- A1. Admin pricing manager: Maintains estimator airline pricing through manual edits and CSV import.
- A2. Estimator user: Receives flight-cost estimates based on the selected airline tier and travel month.
- A3. Planning/implementation agent: Uses this document to plan the airline pricing refactor without inventing product behavior.

---

## Key Flows

- F1. Preview airline pricing CSV import
  - **Trigger:** Admin has a spreadsheet of airline prices to load.
  - **Actors:** A1
  - **Steps:** Admin opens the airline pricing import area, uses or downloads a CSV template, uploads or pastes CSV content, and reviews rows grouped by create, update, invalid, and duplicate/conflict outcomes.
  - **Outcome:** No airline pricing data is written yet; admin can correct the file or proceed to confirmation.
  - **Covered by:** R1, R2, R3, R8, R9, R10

- F2. Confirm airline pricing import
  - **Trigger:** Admin accepts the preview results.
  - **Actors:** A1
  - **Steps:** Admin confirms the import, valid rows create new airline options or update matching existing options, monthly prices are applied, and invalid/conflicting rows remain unapplied.
  - **Outcome:** Estimator airline pricing reflects the confirmed rows without duplicate airline entries.
  - **Covered by:** R4, R5, R6, R7, R10

- F3. Estimate with seasonal airline pricing
  - **Trigger:** Estimator user creates or updates an estimate with an airline tier and optional travel month.
  - **Actors:** A2
  - **Steps:** Estimator resolves the selected airline tier to the appropriate active airline pricing option, uses the month-specific price when available, and falls back to the base airline price when a monthly override is absent.
  - **Outcome:** Flight cost in the estimate reflects the admin-managed airline pricing rules.
  - **Covered by:** R11, R12, R13

---

## Requirements

**Airline pricing model**
- R1. Airline pricing must support multiple airline options per existing airline tier.
- R2. Each airline option must have a visible label and enough descriptive text for admins to distinguish options in the pricing UI and import preview.
- R3. Airline pricing must preserve the existing tier values: BUDGET, STANDARD, GARUDA, and BUSINESS.
- R4. Airline pricing must support a base IDR round-trip price per person.
- R5. Airline pricing must support monthly IDR round-trip prices per person for January through December.
- R6. Blank or missing monthly airline prices must fall back to the airline option's base price.
- R7. Airline pricing must prevent duplicate airline option rows for the same tier and normalized label.

**CSV import and admin workflow**
- R8. Admins must be able to access a dummy airline pricing CSV template.
- R9. Admins must be able to preview airline pricing CSV rows before any write occurs.
- R10. The preview must classify rows as create, update, invalid, or duplicate/conflict with row-level correction reasons.
- R11. Confirming an import must re-validate the submitted airline pricing data before applying writes.
- R12. Confirming an import must update existing matching airline options instead of creating duplicates.
- R13. Confirming an import must write only rows that pass validation.
- R14. Existing inline editing of airline prices must continue to work for the primary admin pricing workflow.

**Estimator behavior**
- R15. Existing estimates, AI parsing, and estimator forms must continue to accept the current four airline tiers.
- R16. The estimator must use travel-month airline pricing when a travel month is present and a monthly override exists.
- R17. The estimator must fall back to base airline pricing when no travel month or no monthly override is available.
- R18. The first version must keep the estimator's user-facing airline selection simple; it should not require users to choose a specific airline option unless that is explicitly added later.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R7.** Given two CSV rows have the same tier and normalized airline label, when the admin previews the file, both rows are shown as a duplicate/conflict rather than becoming duplicate database rows.
- AE2. **Covers R5, R6, R16, R17.** Given an airline option has a base price and a February monthly price, when an estimate uses February, the February price is used; when an estimate has no monthly override, the base price is used.
- AE3. **Covers R8, R9, R10.** Given an admin needs the expected spreadsheet format, when they open the airline import workflow, they can use a template and preview row outcomes before confirming.
- AE4. **Covers R11, R12, R13.** Given a CSV row matches an existing airline option and another row is invalid, when the admin confirms the import, the matching row updates and the invalid row is not written.
- AE5. **Covers R14, R15, R18.** Given existing estimator and admin pricing workflows use airline tiers, when this refactor ships, those tier-based flows still work without requiring a full flight-search UX.

---

## Success Criteria

- Admins can manage airline pricing at a similar confidence level as hotel pricing: template, preview, row-level errors, confirm, and duplicate prevention.
- Estimator flight costs can reflect seasonal month differences without breaking existing tier-based estimates.
- Planning can proceed without inventing the import target, tier behavior, monthly fallback behavior, duplicate behavior, or out-of-scope booking behavior.

---

## Scope Boundaries

- No live flight booking or reservation.
- No real-time fare scraping or automatic external sync.
- No seat inventory, fare class, baggage rule, refund rule, route availability, or airline approval-rule modeling.
- No replacement of the simple tier-based estimator airline UX in the first version.
- No import of unrelated pricing categories such as hotels, services, exchange rates, or room multipliers as part of this feature.

---

## Key Decisions

- Keep existing airline tiers: The estimator and AI parsing already depend on BUDGET, STANDARD, GARUDA, and BUSINESS, so the refactor extends those tiers rather than replacing them.
- Add multiple options per tier: Real flight pricing can have several airlines or fare assumptions inside the same broad tier, so a single row per tier is too limiting.
- Add monthly prices: Airline pricing is seasonal and should respond to the same `travelMonth` signal already used by hotel pricing.
- Use preview-confirm import: Bulk airline pricing has the same risk profile as hotel pricing, so admins need a safety step before writes.
- Keep estimator UX simple in v1: The immediate value is better pricing data, not a full airline-shopping product.

---

## Dependencies / Assumptions

- Admin airline pricing remains part of estimator pricing, not a public booking product.
- Admins can source airline prices from supplier sheets, manual research, or internal assumptions before importing.
- The implementation can choose how to resolve a tier to a primary airline option for estimator calculations, as long as behavior is deterministic and documented during planning.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R18][Technical] How should the estimator choose the active airline option when multiple options exist under the same tier?
- [Affects R7][Technical] What exact normalized match key should be used to prevent duplicate airline options?
- [Affects R14][Technical] Should inline editing operate on a primary airline option per tier, or expose every airline option in the admin pricing table?
- [Affects R16, R17][Technical] How should existing saved estimates behave if airline option rows are later added, removed, or reprioritized?
