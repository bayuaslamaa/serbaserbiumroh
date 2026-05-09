---
title: "feat: Close remaining Umroh estimator PRD gaps"
type: feat
status: active
date: 2026-05-05
origin: PRD-umroh-budget-estimator (1).md
---

# feat: Close remaining Umroh estimator PRD gaps

## Summary

The core Umroh budget estimator is already built. This plan closes the remaining practical gaps between the PRD and the implemented feature summary: admin pricing audit visibility, stronger admin pricing API coverage, dashboard date filtering, and explicit verification around saved estimate snapshots versus current-rate recalculation.

---

## Problem Frame

`docs/FEATURES.md` shows the estimator, auth, admin pricing, exports, and tests are already implemented. The original PRD still calls out a few behaviors that are either only partially present or not clearly documented in code: pricing changes should show who/when changed them, dashboard filtering should include date filtering, and saved estimate totals should remain snapshot values while exports may use current pricing.

---

## Requirements

- R1. Admin pricing changes show enough audit context for an admin to know what changed, when, and by whom.
- R2. Admin pricing mutation endpoints keep existing inline-edit behavior while covering all implemented pricing categories: rates, hotel base prices, monthly hotel prices, airline prices, service fees, and hotel creation.
- R3. Dashboard estimate filtering supports date-based discovery in addition to the existing title/tier search.
- R4. Estimate save, edit, detail display, and export behavior clearly preserve the saved-total snapshot rule from the PRD, or explicitly document any current-pricing recalculation surface as intentional.
- R5. Existing estimator, dashboard, admin, and export behavior remains backward compatible with the current route/component structure.

---

## Scope Boundaries

- No payment, booking, reservation, or package inventory features.
- No redesign of the estimator flow, admin pricing UI, or export templates beyond the targeted gaps.
- No role-management UI for admins; `docs/FEATURES.md` currently describes `/admin/users` as a user list, not a full user-management surface.
- No multi-language UI expansion.
- No migration away from Drizzle, NextAuth v5, Anthropic, or the current Next.js App Router structure.

### Deferred to Follow-Up Work

- Full audit-log event stream for every non-pricing admin action: separate admin-operations feature.
- Estimate version history across repeated edits: separate persistence feature if users need compare/restore behavior.
- API rate limiting for `POST /api/estimate/parse`: important cost-control follow-up, but not part of this PRD-gap closure.

---

## Context & Research

### Relevant Code and Patterns

- `docs/FEATURES.md` documents 86 tests and the current completed surfaces.
- `docs/plans/2026-04-30-001-feat-umroh-budget-estimator-plan.md` is marked `status: completed`; it should not be reused as active work.
- `lib/db/schema.ts` already has `updatedAt` on pricing tables and `updatedBy` on `exchangeRates`, but not a general pricing audit table.
- `app/api/admin/pricing/[category]/route.ts` already handles `rates`, `hotel`, `monthly-hotel`, `airline`, and `service` mutations.
- `components/admin/PricingTable.tsx` already renders inline edits and "Diperbarui" timestamps.
- `components/dashboard/EstimateList.tsx` already supports client-side title/tier search and duplicate/delete actions.
- `app/api/estimate/[id]/route.ts` recalculates totals on `PATCH params`, which is correct for an edited snapshot.
- `app/api/estimate/[id]/export/route.ts` and export helpers should be verified against the PRD snapshot/current-rate decision.

### Institutional Learnings

- No `docs/solutions/` directory exists in this repo.

### External References

- Not used. The remaining work follows existing local Next.js, Drizzle, and component patterns.

---

## Key Technical Decisions

- **Add a pricing audit table instead of overloading `updatedAt`:** `updatedAt` tells admins when a row changed, but not the old value, new value, category, or actor. A small `pricing_audit_logs` table keeps the current pricing schema stable and records meaningful context for admin review.
- **Keep inline-edit endpoints category-based:** The existing `app/api/admin/pricing/[category]/route.ts` structure is already used by `PricingTable`; strengthening validation/tests inside that shape is lower risk than splitting routes now.
- **Add dashboard date filtering client-side first:** The dashboard initially loads 20 estimates and can load more. A client-side date filter matches the existing search implementation and avoids introducing new API query contracts before pagination/search requirements grow.
- **Treat `PATCH` as a new saved snapshot:** When users edit estimate params, recalculating and storing new totals is compatible with the PRD because the edited estimate becomes the new saved state. Exports need explicit verification so users are not surprised by current-rate versus saved-rate totals.

---

## Open Questions

### Resolved During Planning

- **Should this plan rebuild the estimator?** No. The feature summary and code show the estimator is already implemented; this plan only closes remaining deltas.
- **Should admin audit be visible in the current pricing screen?** Yes. A compact recent-changes panel on `/admin/pricing` is enough for v1 and matches the admin's pricing workflow.
- **Should dashboard date filtering be server-side?** Not in this plan. Existing dashboard search is client-side, and the initial PRD asks for search/filter without requiring API-level query semantics.

### Deferred to Implementation

- **Exact audit log value shape:** Use JSONB or text fields based on the simplest Drizzle fit after implementation starts; the plan requires old/new values to be inspectable, not a specific serialization.
- **Export snapshot wording:** Final copy should be chosen while reviewing the actual PDF/WhatsApp output strings.

---

## Implementation Units

- U1. **Pricing audit persistence**

**Goal:** Persist admin pricing changes with actor, category, target row, old value, new value, and timestamp.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/seed.ts`
- Create: `drizzle/migrations/`
- Test: `lib/db/__tests__/schema.test.ts`

**Approach:**
- Add a `pricingAuditLogs` table with a CUID2 primary key, `category`, `targetId`, `targetLabel`, `changedBy`, `before`, `after`, and `createdAt`.
- Reference `users.id` for `changedBy` when feasible; if strict foreign key behavior complicates seeded/admin bootstrap flows, store the actor id as text and keep the API responsible for writing valid ids.
- Do not mutate existing pricing row shapes beyond any type exports required for the new table.

**Patterns to follow:**
- CUID2 and timestamp patterns in `lib/db/schema.ts`.
- Existing Drizzle migration layout in `drizzle/migrations/`.

**Test scenarios:**
- Happy path: schema exports the audit table and inferred select/insert types.
- Happy path: inserting an audit row with rate-change metadata round-trips `category`, `targetId`, `before`, and `after`.
- Edge case: audit row can store a null or empty previous value for a newly created hotel entry.

**Verification:**
- Migration creates the audit table without altering existing pricing data.
- Existing schema tests still pass.

---

- U2. **Admin pricing mutations write audit records**

**Goal:** Ensure every admin pricing mutation records a corresponding audit log entry without changing the existing inline-edit response contracts.

**Requirements:** R1, R2, R5

**Dependencies:** U1

**Files:**
- Modify: `app/api/admin/pricing/[category]/route.ts`
- Test: `app/api/admin/pricing/__tests__/route.test.ts`

**Approach:**
- For each category mutation, fetch the current row before updating, perform the update/create, then insert a pricing audit row in the same request flow.
- Cover `rates`, `hotel`, `monthly-hotel`, `airline`, `service`, and `POST category=hotel`.
- Preserve current response shapes like `{ rate }`, `{ hotel }`, `{ monthlyPrice }`, `{ airline }`, and `{ service }` so `PricingTable` does not need broad rewiring.
- Keep existing auth behavior: unauthenticated requests return 401 and non-admin users return 403.

**Patterns to follow:**
- Existing validation and update branches in `app/api/admin/pricing/[category]/route.ts`.
- Existing admin pricing route tests in `app/api/admin/pricing/__tests__/route.test.ts`.

**Test scenarios:**
- Happy path: updating SAR exchange rate creates one audit row with old/new rate values and the admin user id.
- Happy path: updating a monthly hotel price creates one audit row tied to the monthly hotel target.
- Happy path: toggling `service.enabled` or `service.divideByPax` creates an audit row with the boolean transition.
- Happy path: creating a hotel also creates an audit row whose old value is empty/null and new value includes the hotel plus seeded monthly prices summary.
- Error path: invalid mutation body returns 400 and creates no audit row.
- Error path: unauthenticated or non-admin mutation creates no audit row.

**Verification:**
- Existing inline edit UI still receives the same response shape.
- Each successful mutation leaves exactly one corresponding audit row.

---

- U3. **Admin pricing recent-changes panel**

**Goal:** Show admins a compact recent pricing changes list on `/admin/pricing`.

**Requirements:** R1

**Dependencies:** U1, U2

**Files:**
- Modify: `app/(admin)/admin/pricing/page.tsx`
- Modify: `components/admin/PricingTable.tsx`
- Test: `app/api/admin/pricing/__tests__/route.test.ts` or a focused component test if the project adds one for admin UI.

**Approach:**
- Fetch the most recent audit rows in `app/(admin)/admin/pricing/page.tsx`, ordered newest first and capped to a small count such as 10.
- Render a "Perubahan Terbaru" panel near the pricing tables with category, target label, actor identifier, timestamp, and concise before/after summary.
- After inline edits, either append the returned audit item if U2 includes it in the response, or keep the initial server-rendered panel as a refresh-based summary. Prefer minimal API churn; if response shape changes, make it additive.

**Patterns to follow:**
- Existing section styling in `components/admin/PricingTable.tsx`.
- `formatDate` timestamp rendering already used for pricing rows.

**Test scenarios:**
- Happy path: with audit rows present, the panel shows newest entries first.
- Happy path: with no audit rows, the panel renders an empty-state message.
- Edge case: audit row with missing actor display falls back to the actor id or "Admin".

**Verification:**
- Admins can see recent pricing changes without leaving `/admin/pricing`.
- Pricing table editing behavior remains unchanged.

---

- U4. **Dashboard date filtering**

**Goal:** Add date-based filtering to the estimate dashboard while preserving existing title/tier search, pagination, duplicate, and delete behavior.

**Requirements:** R3, R5

**Dependencies:** None

**Files:**
- Modify: `components/dashboard/EstimateList.tsx`
- Modify: `components/dashboard/EstimateCard.tsx` if date display needs shared formatting adjustments.
- Test: `components/dashboard/__tests__/EstimateCard.test.tsx`
- Test: create `components/dashboard/__tests__/EstimateList.test.tsx` if no suitable list test exists.

**Approach:**
- Add a date filter control to `EstimateList`, using a simple range or preset selector that fits the existing client-side filtering model.
- Filter by `createdAt` initially, since dashboard cards already display the creation date.
- Keep search and date filters composable: a result must match both the text query and selected date constraint.
- Ensure loaded-more estimates are included in the same client-side filter state.

**Patterns to follow:**
- Existing client-side search state in `components/dashboard/EstimateList.tsx`.
- Existing `formatDate` display in `components/dashboard/EstimateCard.tsx`.

**Test scenarios:**
- Happy path: selecting a date range containing an estimate's `createdAt` keeps that card visible.
- Happy path: selecting a range outside an estimate's `createdAt` hides that card.
- Happy path: text search and date filter combine correctly.
- Edge case: clearing the date filter restores all estimates that match the text query.
- Edge case: empty filtered result shows the existing "Tidak ada estimasi yang cocok." state.

**Verification:**
- Dashboard users can find estimates by date without losing duplicate/delete/load-more behavior.

---

- U5. **Snapshot/current-rate export verification**

**Goal:** Make estimate detail and export behavior explicit and tested so saved snapshots do not accidentally drift from the PRD rule.

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Modify: `app/(dashboard)/estimate/[id]/page.tsx`
- Modify: `components/estimator/EstimatorClient.tsx`
- Modify: `app/api/estimate/[id]/export/route.ts`
- Modify: `lib/export/pdf.ts`
- Modify: `lib/export/whatsapp.ts`
- Test: `app/api/estimate/__tests__/route.test.ts`
- Test: `lib/export/__tests__/pdf.test.ts`
- Test: `lib/export/__tests__/whatsapp.test.ts`

**Approach:**
- Review whether estimate detail currently displays stored totals, live recalculated totals, or both. If editing uses live recalculation, label saved-state timestamps clearly.
- Keep `PATCH params` recalculation behavior: an edit produces a new saved snapshot with refreshed totals.
- Verify exports either use saved snapshot totals or intentionally current pricing. If current pricing is retained, add visible wording in PDF/WhatsApp output so the user knows the export reflects current rates, not necessarily the original save-time totals.
- Add regression tests around saved totals not changing merely because pricing config changes after save.

**Patterns to follow:**
- Existing estimate route tests in `app/api/estimate/__tests__/route.test.ts`.
- Existing export tests under `lib/export/__tests__/`.
- PRD key business rule #7 in `PRD-umroh-budget-estimator (1).md`.

**Test scenarios:**
- Happy path: creating an estimate stores `totalIdrPax` and `totalIdrGrp` based on pricing at creation time.
- Edge case: changing exchange rates after save does not mutate the stored estimate totals.
- Happy path: patching estimate params recalculates and persists a new snapshot.
- Integration: export output includes wording that distinguishes current-rate recalculation from saved snapshot totals if export uses current pricing.
- Error path: unauthorized export/read requests remain blocked.

**Verification:**
- Users and admins can distinguish saved estimate totals from current-rate export totals.
- Existing export output remains valid and shareable.

---

## System-Wide Impact

- **Interaction graph:** Admin pricing mutations affect calculation inputs, estimator UI price badges, future saved estimate totals, and exports that recalculate against current pricing.
- **Error propagation:** Audit write failures should fail the pricing mutation unless implementation intentionally wraps the mutation and audit insert in a transaction. Silent audit loss would undermine R1.
- **State lifecycle risks:** Pricing updates and audit inserts should be treated as one logical operation; avoid successful price updates with missing audit rows.
- **API surface parity:** Existing admin pricing response shapes should remain backward compatible for `PricingTable`.
- **Integration coverage:** Route tests need to prove pricing mutation plus audit write together, not only isolated schema behavior.
- **Unchanged invariants:** Saved estimate rows keep `totalIdrPax` and `totalIdrGrp` as stored snapshots; recalculation only occurs on create, patch with params, or intentionally current-pricing export.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Audit logging adds partial-write risk to pricing mutations | Insert audit rows in the same request flow and prefer a DB transaction when implementation wiring makes it straightforward |
| Dashboard date filtering could confuse pagination if only 20 rows are loaded | Keep it client-side and visibly scoped to loaded estimates for now, or preserve "Muat lebih banyak" so users can expand the result set |
| Export semantics may already differ from the completed plan | Treat code as source of truth during implementation, then add explicit tests and user-facing wording instead of silently changing totals |
| New audit table migration can affect existing databases | Add the table only; avoid rewriting existing pricing rows |

---

## Documentation / Operational Notes

- Update `docs/FEATURES.md` after implementation to include pricing audit visibility, dashboard date filtering, and the final export/snapshot semantics.
- If audit logs are implemented with JSONB before/after fields, document the shape briefly near the route tests or schema comments.

---

## Sources & References

- **Origin document:** [PRD-umroh-budget-estimator (1).md](../../PRD-umroh-budget-estimator%20(1).md)
- Feature summary: [docs/FEATURES.md](../FEATURES.md)
- Completed estimator plan: [docs/plans/2026-04-30-001-feat-umroh-budget-estimator-plan.md](2026-04-30-001-feat-umroh-budget-estimator-plan.md)
- Related code: `lib/db/schema.ts`
- Related code: `app/api/admin/pricing/[category]/route.ts`
- Related code: `components/admin/PricingTable.tsx`
- Related code: `components/dashboard/EstimateList.tsx`
- Related code: `app/api/estimate/[id]/route.ts`
