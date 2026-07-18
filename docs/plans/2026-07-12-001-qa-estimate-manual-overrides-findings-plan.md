---
title: "QA findings: manual estimate overrides (spreadsheet editing)"
date: 2026-07-12
type: qa-findings
status: open
scope: feat/estimate-update (staged working tree, uncommitted)
method: code-level QA (browser/live QA blocked — see B1)
---

# QA Findings — Manual Estimate Overrides

Code-level QA of the manual-override feature on `feat/estimate-update` (working tree, uncommitted). **Live/browser QA was NOT performed** — it is blocked (see B1). Reviewed against the current tree, which has diverged from the original build (group-flat cost basis removed; int4 total guard, optimistic concurrency, a clone endpoint, and inline input limits added).

**Overall health:** solid. Typecheck clean; **128 unit tests pass**; no crashes or logic bugs found. Admin authz fires before persistence, JSONB input is strictly bounded (canonical keys, per-row + total int4 caps, label caps, dup-id rejection), and the concurrency + int4 guards are real and tested. The items below are the genuine gaps, ranked.

---

## Blockers (must resolve before any live QA or deploy)

### B1. `manual_overrides` DB column not applied → entire estimates area 500s
- **Where:** `drizzle/migrations/0012_estimate_manual_overrides.sql` (written, not applied to Neon); every `db.select().from(estimates)` — `app/api/estimate/route.ts:61`, `app/api/estimate/[id]/route.ts:22,40,246`, `app/api/estimate/[id]/export/route.ts:27`, `app/(dashboard)/estimate/[id]/page.tsx:21`, plus the paginated GET list.
- **What:** `schema.ts` now defines `manual_overrides`, so drizzle emits `SELECT …, manual_overrides FROM estimates` and `INSERT … manual_overrides`. If the column is absent in the DB, **every estimate read and write errors** — dashboard list, detail view, export, save, edit, delete, clone all 500. Not just override-save.
- **Fix:** apply the additive column before deploy/QA. Safest: run `ALTER TABLE estimates ADD COLUMN manual_overrides jsonb;` directly (Neon SQL editor / psql). Do **not** `drizzle-kit push` against production Neon (drift → possible DROP), and `drizzle-kit generate` produces a spurious full baseline because `drizzle/migrations/meta/` is gitignored. Ideally apply + QA against a **dev DB**, not production.
- **Severity:** Release blocker.

### B2. No live/browser verification performed
- **What:** All findings here are from reading code. The interactive flow (admin login → estimator → edit amount/label → hide/restore → add/remove custom rows → save → reopen → export PDF/WhatsApp/copy → concurrency 409) has not been exercised. Unit tests cover the logic, not the rendered flow or the real DB round-trip.
- **Fix:** after B1, run the **Live QA checklist** at the bottom of this doc.

---

## P1 — High

### 1. Whole-group ("flat") custom cost is silently multiplied by pax at the group total
- **Where:** `lib/budget/overrides.ts` `applyOverrides` — `totalIdrGrp += row.idr * safePax` for every non-hidden row; `CustomRow` no longer carries a cost basis (`types/index.ts:66`).
- **What:** the group-flat vs per-person distinction was removed. Every custom row is now treated as per-person, so `totalIdrGrp = totalIdrPax × pax`. An admin who adds a genuine whole-group one-off (e.g. "Handling grup Rp 3.000.000" for the entire group) sees it counted as Rp 3.000.000 **per person** and **Rp 3.000.000 × pax** at the group total — an over-count by a factor of `pax`, with no visual indication.
- **Why it matters:** produces a wrong jamaah-facing group total for exactly the "Manasik / Handling" examples the feature was pitched on, and diverges from the approved plan (`2026-07-11-001-...`), which explicitly chose to support group-flat. Silent wrong numbers are the worst kind.
- **Fix (pick one):** (a) accept per-person-only and make it explicit — label the panel "per orang", and document that group costs must be entered as a per-person figure; or (b) reintroduce a per-row `perGroup` flag so a flat row contributes `idr` (not `idr × pax`) to the group total and `round(idr/pax)` per person. This was a deliberate simplification — **confirm the trade-off is intended.**

---

## P2 — Medium

### 2. Number inputs reformat on every keystroke → caret jumps, mid-string editing is awkward
- **Where:** `components/estimator/BudgetBreakdown.tsx` — amount inputs use `value={row.idr.toLocaleString("id-ID")}` (fully controlled, re-derived from state each render); custom-row amount equivalent.
- **What:** every keystroke re-formats the value (reinserting `.`), so editing digits in the **middle** of an existing number bounces the caret to the end, and a rejected keystroke (non-digit, or over MAX_IDR) briefly appears then disappears. Data is never wrong (append / clear-and-retype work), but it's UX degradation for a "spreadsheet-like" editor.
- **Fix:** use a local edit-buffer (uncontrolled while focused, format on blur) or preserve selection across reformat.

### 3. Orphan override keys persist and silently resurrect on service re-selection
- **Where:** `applyOverrides` ignores override keys with no matching base row (correct); overrides are stored raw in JSONB.
- **What:** override a service (e.g. `service:TASREH`), then deselect that service in params → the override key stays in the stored object (ignored, harmless). Re-select the service later → the old override **silently reappears** as a sticky value, possibly a stale price the admin forgot.
- **Why it matters:** a stale negotiated price can quietly re-enter a jamaah-facing estimate.
- **Fix:** prune override keys not present in the current base rows on save, **or** surface resurrected orphans as `stale`. Decide and document the deselect→reselect contract.

### 4. Clone endpoint (`sourceEstimateId`) is API-only, with an authz nuance to confirm
- **Where:** `app/api/estimate/route.ts:59-88` (POST `sourceEstimateId` branch); `overridesFromStoredSource` skips the admin 403 at line 165.
- **What:** a new POST path duplicates an existing estimate (copying its stored overrides) gated on **ownership** only — a non-admin owner can clone an estimate that carries admin-set overrides and keep those overrides **without** being admin. There is **no UI caller** (`grep` finds none), so it's an untested-in-practice surface reachable only by direct API call. It *is* unit-tested (`save-route.test.ts`).
- **Why it matters:** confirm the intent: is "copy someone/an admin's overrides via clone" acceptable for a non-admin owner? If clone is a future UI feature, fine; if it's not meant to exist yet, consider gating it.
- **Fix:** confirm intent; if keeping, add a short doc note on the clone authz model. If not needed yet, remove or feature-flag the branch to shrink the attack surface.

---

## P3 — Low

### 5. Export header hotel name can differ from the renamed cost-row label
- **Where:** `lib/export/whatsapp.ts` / `pdf.ts` — summary header hotel names come from `breakdown` (actual hotel); itemized cost rows come from the override-aware `display`.
- **What:** if an admin renames the "Hotel Makkah" row, the WhatsApp/PDF **summary** still shows the real hotel name while the **cost line** shows the renamed label — two names for the same thing in one export. Likely intentional (summary = real hotel, line = cost label) but potentially confusing.
- **Fix:** confirm intended; if not, source both from `display`.

### 6. A hidden hotel row still appears in the export summary header
- **Where:** same exporters — the `🏨 Hotel Makkah: {name}` summary line renders unconditionally; hidden rows are only dropped from the itemized list + totals.
- **What:** hide the Hotel Makkah cost row → export omits it from the breakdown and total but still lists the hotel in the trip summary. Minor inconsistency.
- **Fix:** low priority; skip the summary line for a hidden hotel if desired.

### 7. Over-limit amount rejection can spam toasts while typing
- **Where:** `EstimatorClient.tsx` `amountExceedsLimit` — fires a destructive toast on every keystroke that exceeds `MAX_IDR`.
- **What:** typing a long number that crosses `MAX_IDR` mid-entry can trigger repeated "Nominal terlalu besar" toasts.
- **Fix:** debounce or validate on blur instead of per-keystroke.

---

## What is solid (verified, no action)

- **Backward compat:** null/empty overrides yield rows + totals byte-identical to the raw breakdown (tested).
- **Authz:** POST + PATCH reject non-admin override edits with 403 **before** persistence (`session.user.role`); ownership (owner-or-admin) enforced on GET/PATCH/DELETE/export/clone.
- **Input bounds:** `validateManualOverrides` — canonical keys only, strict `hasOnlyKeys` (rejects unknown fields), per-row + total int4 cap via `arePersistableEstimateTotals` (wired into both routes and tested), label length cap, `MAX_ROWS`, duplicate custom-id rejection.
- **Concurrency:** PATCH requires `expectedUpdatedAt` (428) and rejects a stale snapshot (409), with a DB-level compare-and-swap and a monotonic `updatedAt` bump; `!updated` lost-race → 409. Client sends `expectedUpdatedAt: savedAt` and shows a "reload" toast on 409, then redirects on success. All tested.
- **Injection:** override labels reach WhatsApp (`text/plain`), PDF (react-pdf `Text`), and copy (React-escaped) — no HTML/script/SQL sink.
- **Staleness:** `autoIdrAtOverride` is only recaptured when the patch sets the amount, so a label/hidden edit no longer clears a legitimate "usang" warning.

---

## Live QA checklist (run after B1 — ideally on a dev DB, as admin)

1. **Baseline (no overrides):** create/open an estimate → breakdown, total, PDF, WhatsApp, Copy all identical to pre-feature output.
2. **Amount override:** edit "Hotel Makkah" amount → total updates, `manual` badge + reset appear, formula sublabel drops.
3. **Label override:** rename a row → UI/PDF verbose label + WhatsApp short label update; computed amount unchanged.
4. **Hide/restore:** hide a row → struck-through, excluded from total + exports; ↺ restores it.
5. **Custom rows:** add "Manasik" (per-person) and a whole-group "Handling" → **check the group total** against expectation (this is Finding #1 — confirm behavior is acceptable). Delete a custom row; save with a blank-label custom row → blocked with toast.
6. **Staleness:** override a hotel amount → change nights/pax → row shows "⚠ nilai mungkin usang".
7. **Persistence + export parity:** save → reopen → edits intact; PDF + WhatsApp + Copy all reflect the overrides and match the on-screen total.
8. **Limits:** enter an amount > Rp 2.147.483.647 (int4) → inline reject toast; build a total that exceeds int4 → save blocked with toast.
9. **Concurrency:** open the same estimate in two tabs, save in one, then save in the other → 409 "Estimasi sudah berubah — muat ulang".
10. **Authz:** (if reachable) a non-admin editing overrides → 403; non-admin title/param-only edit → succeeds.
11. **Orphan overrides (Finding #3):** override a service → deselect it → save → re-select it → confirm whether the old override reappears.

---

## Notes

- File written per request as a standalone findings doc. **Not committed** (per "jangan commit dulu").
- No code was changed during this QA pass.
- The plan this feature was built from: `docs/plans/2026-07-11-001-feat-manual-estimate-overrides-plan.md` (note Finding #1 diverges from it).
