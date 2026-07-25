---
title: "feat: Revamp /estimate/new to narrative sentence + chip editors"
type: feat
status: active
date: 2026-07-25
origin: docs/design_handoff_estimator_revamp/README.md
---

# feat: Revamp /estimate/new to narrative sentence + chip editors

## Summary

Rebuild the presentation layer of `/estimate/new` (and the shared `/estimate/[id]` edit view) around a narrative sentence with clickable chips, an inline tray editor on desktop / bottom sheet on mobile, a sticky total rail (desktop) / sticky bottom bar (mobile), a client-side searchable hotel picker, and a WhatsApp message preview — as new components layered on top of `EstimatorClient.tsx`'s existing reducer, which is not modified. One small, contained exception: `lib/ai/parse.ts`'s total-days redistribution formula is extracted into a shared helper (see Key Technical Decisions) so it doesn't drift from the new "hari" chip's identical math.

---

## Problem Frame

`components/estimator/ParamsPanel.tsx` currently renders 8 equally-weighted sections as the only way to configure an estimate, producing a very long single-column form on mobile with no visible running total, fixed-6-column month grid, and touch targets below 44px. The full UX audit lives in the origin design notes; this plan implements the chosen direction (mock option "1d": sentence-as-primary-UI) from the hi-fi handoff bundle in `docs/design_handoff_estimator_revamp/` (see Sources & References).

---

## Requirements

- R1. A narrative sentence with clickable chips (e.g. "Umroh [12 hari] untuk [2 orang] bulan [November]...") replaces `ParamsPanel` as the page's default/primary editing surface.
- R2. Each chip opens a field editor: an inline "tray" section in the normal page flow on desktop (≥1024px), a bottom-sheet overlay on mobile (<1024px) — without modifying `EstimatorClient`'s reducer, action shapes, or handler behavior.
- R3. Hotel selection (per city) is a searchable, tier/price-filterable picker over the already-loaded `pricing.hotelOptions[city]` — no new API or data fetching.
- R4. The month picker and all mobile interactive controls — including existing controls (`Stepper`, `RadioCardGrid`, `ServiceCheckboxGrid`) reused inside the new mobile bottom sheet — meet ≥44px touch targets, and the month grid uses a responsive column count (not a fixed 6-column grid) in both the new field editors and the existing fallback form.
- R5. `BudgetBreakdown` ("Rincian Biaya") keeps 100% of its existing manual-override behavior and every aria-label/text string asserted by `components/estimator/__tests__/BudgetBreakdown.test.tsx`; only its visual styling changes.
- R6. The running total is always visible while editing: a sticky right rail on desktop, a sticky bottom bar on mobile.
- R7. A togglable WhatsApp message preview can be composed and copied to the clipboard.
- R8. A "Buka form lengkap" fallback reveals a full form as a safety net and is never removed.
- R9. A "ceritakan ulang dari nol" (start over) action resets the narrative behind an explicit confirm step, and does not silently discard `manualOverrides` (Rincian Biaya edits).
- R10. `EstimatorClient.tsx`'s `reducer`, `State`/`Action` shapes, and existing handler bodies (`handleParse`, `handleSave`, `patchRow`, `rowHandlers`) are unchanged, and every behavior `EstimatorClient.test.tsx` verifies (override orchestration, save payload serialization) still holds — the test file itself gets only the mechanical updates needed to reach its mocked children behind the new default view (see U7), not a rewrite of its assertions.

---

## Scope Boundaries

- Opening the admin-only gate (`app/(dashboard)/estimate/new/page.tsx`) to non-admin users.
- Any change to `lib/budget/*` calculation/override logic, the database schema, or new API routes.
- New animation/motion dependency — CSS transitions only, per the origin handoff's explicit constraint.
- Custom Tailwind breakpoints — the project's `sm:640 md:768 lg:1024` defaults only.
- Adopting the mock's placeholder numeric clamp bounds (e.g. "peserta 1–40", "malam 0–20") in place of the app's existing bounds (pax 1–200, nights 1–30 per city) — those are prototype example values, not a business-rule change request, and are left untouched.

### Deferred to Follow-Up Work

- Rebuilding "Buka form lengkap" into the mock's compact 4-column button-grid-that-opens-a-tray pattern. This plan keeps the existing `ParamsPanel.tsx` (full inline form) unmodified as the fallback content instead — see Key Technical Decisions for rationale. A pixel-perfect fallback redesign can follow later as its own scoped change.

---

## Context & Research

### Relevant Code and Patterns

- `components/estimator/EstimatorClient.tsx` — owns all estimate state via `useReducer`; its existing `lg:sticky lg:top-20 ... self-start` wrapper (around `BudgetBreakdown` + the save button) is the direct precedent for the new desktop sticky rail.
- `components/estimator/{InputPanel,ParamsPanel,BudgetBreakdown,Stepper,RadioCardGrid,ServiceCheckboxGrid}.tsx` — existing sub-components, several reused as-is inside the new field editors.
- `components/ui/dialog.tsx` — the only Radix Dialog-family primitive in the app (used today for the save dialog); base for the new mobile bottom sheet via repositioned `DialogContent` classes (bottom-anchored instead of centered), which inherits focus-trap, Escape-to-close, and scroll-lock for free.
- `components/ui/alert-dialog.tsx` — existing confirm-dialog primitive, used for the "ceritakan ulang dari nol" confirm step.
- `components/nav/MobileMenu.tsx` — the app's only hand-rolled full-screen overlay (portal + manual body-scroll-lock, no focus trap/Escape); styling reference only — the new bottom sheet is built on Radix Dialog instead, to get focus management for free.
- `components/hotel-nusuk/HotelPriceList.tsx` — search-input-with-icon + plain client-side `Array.prototype.filter()` pattern over hotel data with the same `tier`/`sublabel` shape; direct precedent for the new `HotelPicker`.
- `components/panduan/PdfViewer.tsx` — the app's only existing JS-based responsive-detection precedent (`useState` + `useEffect` + `window.innerWidth` + resize listener). No `matchMedia` usage exists anywhere in the repo.
- `lib/ai/parse.ts` (`applyDeterministicCorrections`/`extractTotalTripDays`) — already contains the exact "total days → nightsMadinah/nightsMakkah" redistribution formula (`nightsMadinah = min(4, totalDays − 1)`, `nightsMakkah = totalDays − nightsMadinah`, valid range 5–30 days) needed for the new "hari" chip.
- `lib/export/summary.ts` — existing copy-text formatters (`rp`, `rowCalc`, `exportLabel`, `basisNote`, `kursLine`) that the new WhatsApp-message formatter should sit alongside.
- `hooks/use-toast.ts` — the only existing custom hook (kebab-case, `use-` prefix, flat under `hooks/`); naming convention for the new `hooks/use-is-desktop.ts`.
- `types/index.ts` — `HotelOptionConfig` already carries `tier`, `sublabel`, `distance`, confirming the hotel picker needs no new fields; `EstimateParams` has no `days` field (only `nightsMadinah`/`nightsMakkah`), confirming the "hari" chip must be a derived, redistributing control, not a direct field write.
- `vitest.config.ts` — component tests run under `happy-dom`, which defaults `window.innerWidth` to ~1024 (the exact `lg:` boundary), so an `innerWidth`-based desktop/mobile hook needs no test-setup changes to keep existing tests on the desktop branch by default.

### Institutional Learnings

- No `docs/solutions/` directory exists in this repository — there is no prior institutional learning to draw on for this work. Worth capturing via `/ce-compound` after this ships (test-pattern gotchas, the JS-branching-vs-CSS-toggle decision, chip/tray pattern) so future revamps have a real learnings entry.

---

## Key Technical Decisions

- **Desktop tray is inline page content, not an overlay.** Confirmed by opening `Estimator Hi-Fi.dc.html` in a browser this session: clicking a chip renders the tray as a normal bordered section pushing subsequent content down, not a positioned/floating popover. No Radix Dialog is needed for the desktop tray.
- **Mobile bottom sheet is built on the existing Radix `Dialog` primitive**, repositioned to `fixed inset-x-0 bottom-0` with rounded top corners, rather than hand-rolled like `MobileMenu.tsx` — this inherits focus-trap, Escape-to-close, and scroll-lock without new code.
- **Desktop/mobile branching uses a new `useIsDesktop()` hook** (`window.innerWidth` + resize listener, mirroring `PdfViewer.tsx`), not `matchMedia` — avoids introducing an untested browser API into the `happy-dom` test environment, and needs no test-setup changes since the default `innerWidth` already resolves to the desktop branch.
- **Responsive split always single-mounts** (only one of {tray, sheet} or {rail, bottom bar} is ever in the DOM at a time), never two DOM trees toggled by CSS `hidden`/`lg:hidden` classes. Reason: `BudgetBreakdown.test.tsx` uses `getByText`/`getByLabelText`, which is blind to CSS visibility — a second, simultaneously-mounted mobile representation of the same total/badges/formula text would produce duplicate matches and break the existing suite.
- **"Buka form lengkap" fallback reuses the existing `ParamsPanel.tsx`**, wrapped in a show/hide toggle, instead of rebuilding it into the mock's compact button-grid pattern — its logic, structure, and every string `EstimatorPreFill.test.tsx` asserts stay untouched. It receives exactly two mechanical fixes shared with the new field editors (the month-grid responsive-class fix, and consuming the shared hotel-selection helper below) — neither changes its rendered DOM shape or test-asserted text. See Deferred to Follow-Up Work.
- **The "hari" (total days) chip redistributes into `nightsMadinah`/`nightsMakkah`** using the same formula already coded in `lib/ai/parse.ts`, extracted into one shared pure function so the AI-parse path and the new chip never drift apart. Clamped to the same 5–30 range `lib/ai/parse.ts` already validates against; that range is itself extracted into shared constants (not just the formula) so the two validity checks can't drift independently of each other.
- **Hotel-selection resolution (city/tier/concrete-id patch) is extracted into one shared helper**, consumed by both `ParamsPanel.tsx` and the new `SentenceCard` — mirroring the nights-formula extraction above, for the same reason: `ParamsPanel.tsx`'s existing `handleHotelChange` and `SentenceCard`'s hotel chip would otherwise be two independent implementations of the same city/tier/id resolution, free to drift.
- **Hotel picker filters client-side** over `pricing.hotelOptions[city]` (already loaded via the existing `pricing` prop), following `HotelPriceList.tsx`'s search-input + `.filter()` precedent — no new API.
- **Transient "copied" feedback (WA message, etc.) uses local state + `setTimeout`**, matching `BudgetBreakdown`'s existing "Tersalin" pattern — not `toast()`. The existing save-success/error `toast()` call in `handleSave` is untouched and not duplicated. The WA preview's open/closed state (`waOpen`) is a controlled prop `EstimatorClient` owns and passes down to `EstimatorRail`/`MobileTotalBar`, not internal state owned by either — this is what lets "start over" (U4) collapse it via a callback.
- **"Start over" is gated behind an `AlertDialog` confirm**, resets narrative params and closes any open field editor and the WA preview, and explicitly does **not** touch `manualOverrides`. Because `UPDATE_PARAMS` shallow-merges its patch onto `state.params`, resetting requires explicitly nulling the optional fields `DEFAULT_PARAMS` doesn't carry (`madinahHotelId`, `makkahHotelId`, `travelMonth`) in the patch — spreading `DEFAULT_PARAMS` alone would leave a previously-picked concrete hotel or month stale (see U4).
- **Opening "Buka form lengkap" auto-closes any open chip field editor** (avoids two live editors on the same field simultaneously).
- **The services (multi-select) field editor gets an explicit "Selesai" close button** on both the tray and sheet variant, since it deliberately stays open after each toggle unlike every other field editor.
- **The hotel picker pins the currently-selected hotel in a visible row** even when the active search/filter would otherwise hide it from the list.
- **Resizing across the 1024px breakpoint while a field editor is open keeps the same field open**, re-rendering it in the new form factor (tray↔sheet) rather than closing it — no data is at risk either way since every field commits to the reducer immediately, but silently closing would lose the user's place for no reason.
- **Both `app/(dashboard)/estimate/new/page.tsx` and `app/(dashboard)/estimate/[id]/page.tsx`'s content wrappers are widened from `max-w-6xl`** to comfortably fit a ~352px sticky rail without cramping the sentence column (the origin handoff notes the design assumes ~1360px effective width). Both routes render the same `EstimatorClient`, so widening only the create page would leave the edit page's identical layout cramped for no reason. This is a page-local change in both files; `app/(dashboard)/layout.tsx`'s shared dashboard container is untouched, so no other dashboard page is affected.

---

## Alternative Approaches Considered

- **Rebuild "form lengkap" into the mock's compact button-grid, matching the design 1:1** — rejected for this pass in favor of reusing the existing `ParamsPanel.tsx`. The button-grid version is materially more work (new component, new tray wiring for every field a second time) and would force a full rewrite of `EstimatorPreFill.test.tsx`'s concrete DOM assertions. Reusing `ParamsPanel` ships the primary UX win (sentence + chips + sticky total) with far less risk; the fallback form is a safety net, not the primary surface, so pixel fidelity there matters less. This is not purely an engineering-cost tradeoff, though: it also means a user who opens "Buka form lengkap" intentionally lands back on the pre-revamp experience — no sticky total, denser layout, smaller Stepper touch targets — the exact gaps this plan sets out to close. That's an accepted, visible seam for this pass (the fallback is meant to be used rarely), not an oversight. Deferred, not abandoned.
- **CSS-only responsive split (both desktop and mobile markup mounted, toggled via `hidden lg:...` classes)** — rejected because it duplicates rendered text (totals, badges, formulas) into two simultaneously-mounted DOM trees, which breaks `BudgetBreakdown.test.tsx`'s `getByText`/`getAllByText` assertions (blind to CSS visibility in `happy-dom`). A JS-driven single-mount hook (`useIsDesktop()`) avoids this at the cost of one small new hook + a brief post-hydration flash on first paint (see Risks & Dependencies).

---

## Open Questions

### Resolved During Planning

- **Does the "hari" chip write anywhere, given `EstimateParams` has no `days` field?** Resolved: it's editable and redistributes into `nightsMadinah`/`nightsMakkah` via the formula already in `lib/ai/parse.ts` (see Key Technical Decisions).
- **What does "ceritakan ulang dari nol" reset?** Resolved: narrative params + closes any open field editor + hides the WA preview, behind a confirm step; `manualOverrides` is explicitly untouched.
- **Does crossing the 1024px breakpoint mid-edit close the open field editor?** Resolved: no — it stays open and swaps form factor (tray↔sheet).
- **How does the hotel picker handle the selected hotel being filtered out by the user's own search?** Resolved: a pinned "Dipilih" row keeps it visible regardless of the active filter.
- **What price does the month grid show before any concrete hotel is chosen?** Resolved: the current `hotelTier`'s tier-level fallback rate, the same resolution the rest of the params already use before a concrete hotel id is set.
- **Does the services multi-select editor need an explicit close control?** Resolved: yes, an explicit "Selesai" button on both tray and sheet variants (outside-tap alone risks premature close mid-multi-select).
- **Does opening "Buka form lengkap" auto-close an open chip editor?** Resolved: yes.

### Deferred to Implementation

- Exact WhatsApp message wording — should mirror the mock's greeting/tone; final phrasing is a copy-polish detail, not a planning-time decision.
- Exact pixel spacing/sizing values from the hi-fi mock — the implementer should follow `docs/design_handoff_estimator_revamp/README.md`'s Design Tokens table and the live `Estimator Hi-Fi.dc.html` closely, but exact values are implementation detail.
- The exact widened `max-w-*` value for both `page.tsx` files (e.g. `max-w-7xl` vs. a bespoke `max-w-[1400px]`) — decide by checking the fit of a 352px rail + readable sentence column in a real browser at 1280/1440/1536px, not in the abstract. While checking, also verify the pre-existing double-container question the origin design notes flagged (`layout.tsx`'s `container mx-auto px-4 py-6` nesting `page.tsx`'s wrapper) doesn't leave unexpected double padding at very wide viewports.
- `HotelPicker`'s keyboard navigation model for a 10–30 item list (plain Tab-per-row vs. arrow-key/roving-tabindex list navigation) — a real interaction-design choice with no existing precedent in this codebase (`RadioCardGrid`, its closest analog, is Tab-per-row on much shorter lists); pick during implementation based on how large city hotel lists typically run.
- Whether an `aria-live` region should announce the total/chip-value changes as they happen — a nice-to-have accessibility enhancement, not required for R6 to be met (the total is already visible on-screen at all times).

---

## Implementation Units

- U1. **Shared responsive hook + nights/hotel-selection helpers**

**Goal:** Provide the shared infrastructure every other unit depends on: a desktop/mobile detection hook, the "hari" chip's nights-redistribution math (shared with the existing AI parser instead of duplicated), and the hotel-selection resolution logic (shared with `ParamsPanel.tsx` instead of duplicated).

**Requirements:** R2, R3, R4

**Dependencies:** None

**Files:**
- Create: `hooks/use-is-desktop.ts`
- Create: `lib/estimate/nights.ts`
- Create: `lib/estimate/hotel-selection.ts`
- Modify: `lib/ai/parse.ts` (import the extracted redistribution function and the shared 5–30 day-range constants instead of keeping its own inline copies)
- Modify: `components/estimator/ParamsPanel.tsx` (its existing `handleHotelChange` city/tier/id resolution calls the new shared helper instead of its own inline logic — behavior-preserving, no change to `ParamsPanel`'s rendered output or the `onChange` patch shape `EstimatorPreFill.test.tsx` asserts)
- Test: `hooks/__tests__/use-is-desktop.test.ts`
- Test: `lib/estimate/__tests__/nights.test.ts`
- Test: `lib/estimate/__tests__/hotel-selection.test.ts`

**Approach:**
- `useIsDesktop()`: mirrors `PdfViewer.tsx`'s `useState` + `useEffect` + `window.innerWidth` + resize-listener pattern, threshold at 1024px (the project's `lg:` breakpoint), initial state defaults to desktop (`true`) to match the common case and `happy-dom`'s default `innerWidth`, corrected on mount/resize.
- `lib/estimate/nights.ts` exports: a pure function redistributing a total trip-day count into `{ nightsMadinah, nightsMakkah }` using the exact formula currently inline in `lib/ai/parse.ts`'s `applyDeterministicCorrections` (`nightsMadinah = min(4, totalDays − 1)`, remainder to Makkah); a `totalTripDays(params)` getter (`nightsMadinah + nightsMakkah`) for display; and the shared `MIN_TRIP_DAYS`/`MAX_TRIP_DAYS` (5/30) constants, so the "hari" chip's stepper clamp and `lib/ai/parse.ts`'s `extractTotalTripDays` validity check read from one source instead of two independently-maintained literals. `lib/ai/parse.ts` is updated to call the shared function and constants instead of keeping its own copies — behavior-preserving, its existing test suite must still pass unchanged.
- `lib/estimate/hotel-selection.ts` exports a pure function mirroring `ParamsPanel.tsx`'s existing `handleHotelChange`: given a city, a selected hotel id, and `PricingConfig`, returns the `{ hotelTier, madinahHotelId | makkahHotelId }` patch shape. Both `ParamsPanel.tsx` and the new `SentenceCard` (U4) call this one implementation instead of each resolving the city/tier/id mapping independently.

**Patterns to follow:**
- `components/panduan/PdfViewer.tsx` (resize-listener hook shape)
- `lib/ai/parse.ts`'s existing `applyDeterministicCorrections` (formula to extract, not reinvent)
- `components/estimator/ParamsPanel.tsx`'s existing `handleHotelChange` (logic to extract, not reinvent)

**Test scenarios:**
- Happy path: `useIsDesktop()` returns `true` at `innerWidth = 1200` and at the boundary `innerWidth = 1024`
- Edge case: returns `false` after a simulated resize to `innerWidth = 800`
- Edge case: removes its resize listener on unmount
- Happy path: `totalTripDaysToNights(12)` → `{ nightsMadinah: 4, nightsMakkah: 8 }`
- Edge case: `totalTripDaysToNights(6)` → `{ nightsMadinah: 4, nightsMakkah: 2 }` (madinah capped at 4)
- Edge case: `totalTripDaysToNights(30)` → `{ nightsMadinah: 4, nightsMakkah: 26 }`
- Happy path: `totalTripDays({ nightsMadinah: 4, nightsMakkah: 8, ... })` → `12`
- Happy path: `resolveHotelSelection("MAKKAH", "olayan-ajyad", pricing)` → `{ hotelTier: "STANDARD", makkahHotelId: "olayan-ajyad" }` (mirrors the existing `EstimatorPreFill.test.tsx` case for `handleHotelChange`)
- Edge case: selecting a fallback (non-concrete) tier-only option returns a patch with the city's hotel-id field left `undefined`, matching current `handleHotelChange` behavior

**Verification:**
- New unit tests pass; `lib/ai/__tests__/parse.test.ts` passes unchanged after the extraction (same inputs produce the same corrected params and notes); `EstimatorPreFill.test.tsx`'s existing `"updates the city-specific hotel ID when an imported hotel is selected"` case still passes unchanged after `ParamsPanel.tsx` switches to the shared helper.

---

- U2. **`HotelPicker` component**

**Goal:** A reusable searchable/filterable hotel list, used inside the hotel field editors.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Create: `components/estimator/HotelPicker.tsx`
- Test: `components/estimator/__tests__/HotelPicker.test.tsx`

**Approach:**
- Props: a city's `HotelOptionConfig[]`, the currently selected id, the active `travelMonth` (for seasonal price display), and an `onSelect(id)` callback.
- Renders a search `Input` (icon + text, mirroring `HotelPriceList.tsx`), a row of tier/price filter pills (client-side `.filter()`, no new dependency), and a scrollable list of hotel rows (reusing `RadioCardGrid`-style selected/hover states).
- The currently selected hotel is always rendered, pinned above the filtered results, even if it doesn't match the active search/filter (per Open Questions).

**Patterns to follow:**
- `components/hotel-nusuk/HotelPriceList.tsx` (search input + `.filter()`)
- `components/estimator/RadioCardGrid.tsx` (selected/hover row styling)
- `components/estimator/ParamsPanel.tsx`'s existing `resolveMonthlyHotelSar`/`sarLabel` helpers (seasonal price display — reuse or mirror, do not diverge)

**Test scenarios:**
- Happy path: typing in the search box filters the list by hotel name, case-insensitively
- Happy path: selecting a tier filter pill narrows results to that tier; "Semua" clears all filters
- Happy path: clicking a hotel row calls `onSelect` with its id
- Edge case: the selected hotel remains visible (pinned) when it doesn't match the current search/filter
- Edge case: an empty result set renders an empty-state message, not a blank list
- Integration: displayed price reflects the seasonal rate for `travelMonth` when present, base `sarPerNight` otherwise

**Verification:**
- Unit tests pass; manual comparison against the hi-fi mock's "PILIH HOTEL MADINAH" tray screenshot for both the desktop 2-column list and the mobile vertical list.

---

- U3. **Field editor shells (`FieldTray`, `FieldSheet`) + `MonthGrid` extraction**

**Goal:** The reusable "container" components each field editor renders inside — an inline desktop tray and a mobile bottom sheet — plus a standalone, responsive month-grid component.

**Requirements:** R2, R4

**Dependencies:** U1 (hook informs which shell the parent mounts), U2 (HotelPicker is one of the field bodies rendered inside these shells)

**Files:**
- Create: `components/estimator/FieldTray.tsx`
- Create: `components/estimator/FieldSheet.tsx`
- Create: `components/estimator/MonthGrid.tsx`
- Modify: `components/estimator/ParamsPanel.tsx` (apply the same `grid-cols-3 sm:grid-cols-4 md:grid-cols-6` responsive fix directly to its existing inline month-button grid — a class-only change, not a rewrite; `ParamsPanel` otherwise stays untouched per the Key Technical Decisions)
- Test: `components/estimator/__tests__/FieldTray.test.tsx`
- Test: `components/estimator/__tests__/FieldSheet.test.tsx`

**Approach:**
- `FieldTray`: a bordered section (title, close button, `children`) rendered inline in the page flow; moves focus to its first focusable control on mount, listens for Escape to close (calling the same `onClose` contract as its close button, so keyboard behavior matches `FieldSheet`'s Radix-provided Escape-to-close), and calls `onClose` — which the parent also uses to restore focus to the triggering chip.
- `FieldSheet`: wraps `components/ui/dialog.tsx`'s `Dialog`/`DialogContent` with bottom-anchored positioning classes (`fixed inset-x-0 bottom-0`, rounded top corners) instead of the default centered transform — inherits Radix's focus-trap, Escape-to-close, and scroll-lock.
- `MonthGrid`: extracted from `ParamsPanel.tsx`'s existing inline month-button markup, made responsive (`grid-cols-3 sm:grid-cols-4 md:grid-cols-6`), reused by the new field editors. `ParamsPanel.tsx`'s own copy gets the same column-count fix applied in place (not replaced by `MonthGrid`) to avoid touching its tested render path.
- Field bodies composed inside these shells by the parent (`SentenceCard`, U4): existing `Stepper` (days/pax/nights), new `MonthGrid`, existing `RadioCardGrid` (room/board/airline), existing `ServiceCheckboxGrid` plus a new "Selesai" close button, new `HotelPicker` (U2). Per R4, `Stepper`/`RadioCardGrid`/`ServiceCheckboxGrid` need a mobile-sizing override (larger tap targets, e.g. a size prop or a wrapping class applied only inside `FieldSheet`) when rendered on mobile — their current sizing (e.g. `Stepper`'s 36px buttons) is left as-is everywhere else they're used (desktop tray, the untouched `ParamsPanel` fallback), since this is a mobile-context-only sizing concern, not a rewrite of those components.
- On mobile, the services field editor (`ServiceCheckboxGrid` + "Selesai") disables `FieldSheet`'s default backdrop-tap-to-close for that one field (override the Radix Dialog's outside-pointer-close), since it deliberately stays open across multiple toggles — closing only via "Selesai" keeps tray and sheet behavior identical for this field, unlike the outside-tap-based Radix default.

**Patterns to follow:**
- `components/ui/dialog.tsx` (FieldSheet base)
- `components/nav/MobileMenu.tsx` (backdrop/dark-surface visual reference only)
- `components/estimator/RadioCardGrid.tsx`'s `focus-visible:ring-2 ring-[var(--color-gold)]` pattern

**Test scenarios:**
- Happy path: `FieldTray` renders its children and calls `onClose` when its close button is clicked
- Happy path: `FieldTray` calls `onClose` when Escape is pressed
- Happy path: `FieldSheet` renders its children inside a Radix `Dialog`; closing via the dialog's `onOpenChange` calls the same `onClose` contract as `FieldTray`
- Edge case: `FieldTray` moves focus to its first focusable element on mount
- Edge case: closing either shell fires a return-focus callback the parent uses to refocus the triggering chip
- Integration: a services-editor body (`ServiceCheckboxGrid` + "Selesai") stays open across multiple checkbox toggles in both `FieldTray` and `FieldSheet`, and closes only via "Selesai" — a simulated backdrop-tap/outside-pointer event on `FieldSheet`'s services variant does not close it
- Happy path: `MonthGrid` renders 3 columns at a narrow width, 4 at the `sm:` breakpoint, and 6 at `md:`+ (class assertions for all three)
- Edge case: only one of `FieldTray`/`FieldSheet` is ever present in the DOM for a given open field (mirrors the single-mount verification U5 does for `EstimatorRail`/`MobileTotalBar`)

**Verification:**
- Unit tests pass; a manual keyboard-only walkthrough (Tab to a chip → Enter opens the tray → Tab through fields → Escape/close returns focus to the chip) succeeds in the browser.

---

- U4. **`SentenceCard`, restyled Story panel, start-over flow**

**Goal:** The new primary UI: the narrative sentence with chips, the field-editor orchestration (which field is open, which shell to use), the collapsible Story panel, and the "start over" confirm flow.

**Requirements:** R1, R2, R9

**Dependencies:** U1, U2, U3

**Files:**
- Create: `components/estimator/SentenceCard.tsx`
- Modify: `components/estimator/InputPanel.tsx` (restyle into the "Story panel": step badge, conditional visibility, "Batal" link — existing `value`/`onChange`/`onParse`/`loading` props kept, new optional `visible`/`onCancel` props added)
- Test: `components/estimator/__tests__/SentenceCard.test.tsx`

**Approach:**
- `SentenceCard` receives `params`, `pricing`, `onChange` (same shape `ParamsPanel` already receives) plus the derived total-days value (via U1's `totalTripDays`), and renders the sentence as ordered text/chip segments. On mobile (`useIsDesktop() === false`), the rendered segment list stops after the room-type chip (matching the origin spec) — airline and services stay reachable via "Buka form lengkap" (R8) rather than as mobile sentence chips.
- Owns local `openField: FieldKey | null` state; a chip click sets it (closing any other open field first); renders the matching `FieldTray`/`FieldSheet` (chosen via `useIsDesktop()`) around the relevant field body. Each chip is a real `<button>` with an `aria-label` combining the field name and its current value (e.g. "Bulan: November, klik untuk ubah") and `aria-expanded`/`aria-controls` wired to the open tray/sheet's id.
- Hotel-chip selection calls U1's shared `resolveHotelSelection` helper (same `onChange` patch shape `ParamsPanel.tsx` already produces) — not a second, independent implementation.
- "Ceritakan ulang dari nol" opens an `AlertDialog`; on confirm, calls `onChange` with a patch that spreads `DEFAULT_PARAMS` and explicitly sets `madinahHotelId: undefined, makkahHotelId: undefined, travelMonth: undefined` (the reducer's existing `UPDATE_PARAMS` action shallow-merges its patch onto `state.params`, so `DEFAULT_PARAMS` alone would leave a previously-picked concrete hotel or month stale — no new action needed, just a patch that explicitly clears the optional fields DEFAULT_PARAMS doesn't carry), closes any open field editor, and asks the parent (via a callback prop) to re-show the Story panel and hide the WA preview.

**Patterns to follow:**
- `docs/design_handoff_estimator_revamp/README.md`'s "Sentence card" and chip styling spec (padding, `border-bottom-width: 2px`, radius) — translate to Tailwind + the existing `--color-gold`/`--color-border` CSS vars
- `components/estimator/RadioCardGrid.tsx` (focus-visible pattern for chip buttons)
- `components/ui/alert-dialog.tsx` (start-over confirm)

**Test scenarios:**
- Happy path: the rendered sentence's chip values reflect `params` (e.g. the "hari" chip shows `nightsMadinah + nightsMakkah`)
- Happy path: editing the "hari" chip's stepper calls `onChange` with correctly redistributed `nightsMadinah`/`nightsMakkah`
- Happy path: selecting a hotel in a hotel chip's picker calls `onChange` with the correct `hotelTier` + city-specific hotel id (via the shared `resolveHotelSelection` helper)
- Happy path: the services chip's editor stays open across multiple toggles and closes via "Selesai"
- Happy path: each chip exposes an `aria-label` reflecting its field and current value, and `aria-expanded` toggles with its editor's open state
- Edge case: only one field editor is open at a time — opening a second chip closes the first
- Edge case: clicking an already-open field's chip again closes it
- Edge case: on mobile (`useIsDesktop() === false`), the sentence stops after the room-type chip — no airline/services chips render
- Edge case: "ceritakan ulang dari nol" requires confirmation; canceling leaves `params` untouched; confirming resets params (including clearing `madinahHotelId`/`makkahHotelId`/`travelMonth`, not just the fields `DEFAULT_PARAMS` sets), closes any open editor, and fires the Story-panel/WA-preview reset callbacks
- Integration: when the `useIsDesktop()` value flips while a field is open, the same field stays open and its shell swaps (tray↔sheet)
- Edge case: only one of `FieldTray`/`FieldSheet` is ever present in the DOM at a time for the currently open field

**Verification:**
- Unit tests pass; manual browser comparison against `Estimator Hi-Fi.dc.html`'s sentence card at both desktop and mobile viewport widths, confirming the mobile sentence truncation and that airline/services remain reachable via "Buka form lengkap" on mobile.

---

- U5. **Sticky rail, mobile bottom bar, WhatsApp preview**

**Goal:** Always-visible total (desktop rail / mobile bottom bar) and the WhatsApp message preview + copy flow.

**Requirements:** R6, R7

**Dependencies:** U1; developed against `BudgetBreakdown`'s existing props (unaffected by U6's restyle, so this can proceed in parallel with U6)

**Files:**
- Create: `components/estimator/EstimatorRail.tsx`
- Create: `components/estimator/MobileTotalBar.tsx`
- Create: `lib/export/whatsapp.ts`
- Test: `components/estimator/__tests__/EstimatorRail.test.tsx`
- Test: `lib/export/__tests__/whatsapp.test.ts`

**Approach:**
- `waOpen` (WA preview shown/hidden) is a controlled prop — `boolean` value + setter — passed down from `EstimatorClient` (see U7), not state either component owns internally. This is what lets "start over" (U4) collapse the preview via a callback without reaching into a child's internal state.
- `EstimatorRail` (desktop, `useIsDesktop() === true`): wraps the existing `BudgetBreakdown` + save button (reusing the existing `lg:sticky lg:top-20 ... self-start` positioning), adds a total card (`display.totalIdrPax`/`totalIdrGrp`, already computed upstream), a category-breakdown bar (pure presentational aggregation of `display.rows` into Hotel/Penerbangan/Visa & layanan — no new business logic), and a WA preview toggle + panel driven by the `waOpen` prop.
- `MobileTotalBar` (mobile, `useIsDesktop() === false`): compact sticky bottom bar with the same total and a "Kirim WA" action that sets `waOpen`, opening the same WA preview content rendered in-flow above the bar (matching the mock's mobile section).
- `lib/export/whatsapp.ts` exports `buildWhatsAppMessage(display, params, ...)`, a new formatter alongside the existing ones in `lib/export/summary.ts` (greeting, trip summary, nights/hotel lines, total, reused `EXPORT_NOTES` contact/disclaimer lines) — distinct from `buildCopyText` (used by "Salin rincian"), which stays as-is.
- The WA "Salin pesan" button uses local state + `setTimeout` for its transient "Tersalin" feedback, matching `BudgetBreakdown`'s existing pattern.

**Patterns to follow:**
- `EstimatorClient.tsx`'s existing `lg:sticky lg:top-20 ... self-start` wrapper
- `BudgetBreakdown.tsx`'s `copyStatus` local-state-plus-`setTimeout` pattern
- `lib/export/summary.ts`'s existing formatter style/format conventions

**Test scenarios:**
- Happy path: `EstimatorRail` renders the total, three category breakdown amounts, and both CTA buttons
- Happy path: toggling the WA preview shows/hides the panel
- Happy path: "Salin pesan" copies the composed text and shows a transient copied-state that reverts after the same duration `BudgetBreakdown`'s "Tersalin" uses
- Edge case: category breakdown bar widths are proportional to the largest category, with no division-by-zero when a category total is 0
- Happy path (formatter): `buildWhatsAppMessage` output includes the greeting, trip summary, total, and the reused `EXPORT_NOTES` lines
- Integration: `MobileTotalBar`'s displayed total equals `EstimatorRail`'s for the same `display` input (single source of truth, no drift)

**Verification:**
- Unit tests pass; manual browser check against the mock's rail and mobile bottom-bar screenshots; confirm `EstimatorRail` and `MobileTotalBar` are never simultaneously mounted (single-branch contract from U1).

---

- U6. **`BudgetBreakdown` visual restyle (contract-preserving)**

**Goal:** Apply the new "Rincian Biaya" visual spec (grid-column layout, badge/icon restyle) without changing any tested behavior, aria-label, or text string.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Modify: `components/estimator/BudgetBreakdown.tsx`

**Approach:**
- Restyle only: the `lg:`+ grid-column layout (`1fr 148px 176px 40px` per the origin spec), `lucide-react` icons (`X`, `RotateCcw`/`Undo2`) replacing the current `×`/`↺` character glyphs, badge-pill and "+ Tambah baris biaya" restyle.
- Every aria-label and rendered text string asserted by the existing test suite must remain byte-identical: aria-labels `"Nama baris"`, `"Nama biaya"`, `"Harga satuan"`, `"Nilai (Rp)"`, `"Sembunyikan baris"`, `"Kembalikan ke nilai otomatis"`, `"Hapus baris"`, `"Tambah baris"`, `"Salin rincian estimasi"`; text/badges `"manual"`, `"disembunyikan"`, `"harga real"`, `"estimasi"`, `"⚠ nilai mungkin usang"`, `"per orang"`; the `readOnly` wiring for `editable=false` and the always-readonly custom-row unit-price mirror.
- Mobile spacing/touch-target sizing is applied to the same row markup via responsive classes (extending the existing `flex-col sm:flex-row` pattern) — no second, simultaneously-mounted "mobile card" representation of the same row (would duplicate text and break `getByText`, per Key Technical Decisions).

**Patterns to follow:**
- The existing `ComputedRow`/`CustomRowEditor`/`AmountField`/`IconButton` internal structure — restyle presentation only, keep every function signature and label.

**Test scenarios:**
- Test expectation: none beyond the existing suite — this unit's bar is "`components/estimator/__tests__/BudgetBreakdown.test.tsx` passes with zero modifications."

**Verification:**
- The existing `BudgetBreakdown` test suite passes unmodified; manual browser diff against the mock's "Rincian Biaya" section at desktop and mobile widths, confirming ≥44px touch targets on mobile.

---

- U7. **`EstimatorClient` integration, full-form fallback, page width**

**Goal:** Compose all the new pieces into `EstimatorClient.tsx`'s render output, wire the full-form fallback toggle, and adjust `page.tsx`'s content width — while leaving the reducer, action shapes, and handler bodies untouched.

**Requirements:** R1, R2, R6, R8, R10

**Dependencies:** U1, U2, U3, U4, U5, U6 (integration unit, last)

**Files:**
- Modify: `components/estimator/EstimatorClient.tsx` (render/JSX only)
- Modify: `app/(dashboard)/estimate/new/page.tsx` (widen the content wrapper beyond `max-w-6xl`; exact value decided in-browser during implementation)
- Modify: `app/(dashboard)/estimate/[id]/page.tsx` (the same width change, so the edit route's identical `EstimatorClient` layout isn't left cramped)
- Test: update `components/estimator/__tests__/EstimatorPreFill.test.tsx`'s `"EstimatorClient — initialParams pre-fill"` describe block (see Approach)
- Test: update `components/estimator/__tests__/EstimatorClient.test.tsx` (mechanical only — see Approach)

**Approach:**
- `EstimatorClient`'s `return (...)` JSX is restructured to render `SentenceCard` (U4) as the default view, a "Buka form lengkap" toggle that reveals the unmodified `ParamsPanel` (auto-closing any open `SentenceCard` field editor when opened), and `EstimatorRail`/`MobileTotalBar` (U5, gated by `useIsDesktop()`) wrapping the restyled `BudgetBreakdown` (U6) in place of the current always-two-column layout.
- New local `useState` hooks are added alongside the existing `useReducer` call for pure UI-only flags: `showStory`, `showFullForm`, `waOpen`. The `useReducer(reducer, ...)` call, the `reducer` function itself, `dispatch`, and every existing handler (`handleParse`, `handleSave`, `patchRow`, `rowHandlers`) are carried over verbatim.
- Because `ParamsPanel` is no longer part of the default render (only mounted once `showFullForm` is true, consistent with this plan's single-mount rule — see Key Technical Decisions), two existing test files interact with it directly and both need a mechanical update, not a rewrite of what they verify:
  - `EstimatorPreFill.test.tsx`'s `ParamsPanel`-specific assertions (rendered via the real component in isolation) need no changes at all. Its `"EstimatorClient — initialParams pre-fill"` block currently asserts pre-filled values via `getByDisplayValue` against `ParamsPanel`'s Stepper inputs — these specific assertions are updated to query the new default UI instead (e.g. the `SentenceCard`'s rendered chip text reflecting the pre-filled value), preserving the same intent (initialParams correctly flow into what the user sees first) against the new UI shape.
  - `EstimatorClient.test.tsx` mocks `../ParamsPanel` and interacts with it (via a fake "change params" button) immediately after render, with no prior "Buka form lengkap" click — since the real component behind that mock is no longer mounted by default, each test in this file needs one added step (open "Buka form lengkap" before interacting with the mocked `ParamsPanel`). The mocks themselves (import paths, prop names: `onChange` into `ParamsPanel`; `display`/`onSetAmount`/`onSetUnitPrice`/`onResetRow`/etc. into `BudgetBreakdown`) and every assertion about override orchestration and save-payload serialization are otherwise unchanged — this is a "reach the same mocked component through one more click" update, not a rewrite of what the test proves.

**Patterns to follow:**
- N/A — this is the composition point; the governing constraint is "unchanged reducer," not a structural pattern to mirror.

**Test scenarios:**
- Test expectation: `EstimatorClient.test.tsx`'s override-orchestration and save-serialization assertions all still pass after the one-line "open full form first" addition described above — no other change to that file.
- Happy path: the full page renders the sentence card, rail or bottom bar (per viewport), Rincian Biaya, WA preview toggle, and save button.
- Happy path: "Buka form lengkap" reveals `ParamsPanel`; opening it while a `SentenceCard` field editor is open closes that editor first.
- Integration: editing a param via a `SentenceCard` chip updates the sticky total (rail/bottom bar) live, and produces the same total as editing the same param via the `ParamsPanel` fallback would (same reducer, same `calculateBudget`) — this is the one new test proving the new UI and the old fallback UI stay in sync through the shared reducer.

**Verification:**
- Full `components/estimator/__tests__/*` suite passes, including the explicitly-updated `EstimatorPreFill.test.tsx` pre-fill assertions and `EstimatorClient.test.tsx`'s one-added-step updates; manual browser walkthrough at 1440px and 375–414px viewports against the hi-fi mock (both `/estimate/new` and an existing `/estimate/[id]`), covering: chip edit round-trip, hotel search/filter, services multi-select staying open, start-over confirm, full-form fallback open/close, WA preview copy, an unaffected save flow, and no unexpected double-padding from the pre-existing `layout.tsx` + `page.tsx` container nesting at very wide viewports.

---

## System-Wide Impact

- **Interaction graph:** `EstimatorClient` is shared by both `app/(dashboard)/estimate/new/page.tsx` (create) and `app/(dashboard)/estimate/[id]/page.tsx` (edit) — every unit here affects both routes identically. No new entry points are introduced.
- **Error propagation:** Unchanged — the existing save/parse error `toast()` calls are untouched by this plan.
- **State lifecycle risks:** The new UI-only `useState` flags (`openField`, `showStory`, `showFullForm`, `waOpen`) are local/ephemeral and reset on remount, with no persistence concerns. `manualOverrides` (reducer-owned) is explicitly preserved across the new "start over" flow.
- **API surface parity:** None — no API routes are touched.
- **Integration coverage:** U7 adds the one integration test proving `SentenceCard` chip edits and the `ParamsPanel` fallback converge on the same total through the shared reducer — no existing test currently proves that path for the new UI.
- **Unchanged invariants:** `EstimatorClient`'s reducer/action shapes, `calculateBudget`/`applyOverrides` business logic, the save/parse API contracts, and the `ManualOverrides` JSONB persistence format are untouched by this plan.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `useIsDesktop()` causes a brief hydration-mismatch/flash on first client paint (SSR/initial render assumes desktop) | Same tradeoff `PdfViewer.tsx` already accepts in this codebase; initial state defaults to the common case (desktop), corrected on mount — a known minor flash, not a blocker. |
| A future change re-introduces a CSS-only parallel mobile DOM tree, breaking `getByText` assertions again | The single-mount rule is documented in this plan's Key Technical Decisions; U6's approach explicitly calls it out for `BudgetBreakdown`. |
| `EstimatorPreFill.test.tsx`'s Stepper-based pre-fill assertions and `EstimatorClient.test.tsx`'s mocked-`ParamsPanel` interactions both break because `ParamsPanel` is no longer the default view | Explicitly scoped into U7 as required, intentional, mechanical test updates (one added "open full form" step for `EstimatorClient.test.tsx`; requery-the-new-default-UI for `EstimatorPreFill.test.tsx`) — not a surprise regression, and neither file's underlying assertions about reducer/save behavior change. |
| The "hari" redistribution formula, its 5–30 day-range bound, or the hotel-selection resolution drifts from `lib/ai/parse.ts`/`ParamsPanel.tsx`'s originals if reimplemented independently | U1 extracts all three into shared functions/constants; `lib/ai/parse.ts` and `ParamsPanel.tsx` are both updated to import them instead of keeping their own copies. |
| Design-fidelity gap: the "form lengkap" fallback won't match the mock's compact button-grid, and reintroduces the pre-revamp UX gaps (no sticky total, small touch targets) for anyone who opens it | Explicit, documented product/scope tradeoff (Key Technical Decisions / Alternative Approaches Considered / Deferred to Follow-Up Work), reversible later as its own scoped change. |
| `page.tsx`'s width bump reads inconsistently against other dashboard pages, or between the create and edit estimate routes | Both `estimate/new/page.tsx` and `estimate/[id]/page.tsx` get the same change so the two routes stay visually consistent; `layout.tsx`'s shared container — and every other (non-estimate) dashboard page — is untouched. |
| The "start over" reset silently leaves a stale `madinahHotelId`/`makkahHotelId`/`travelMonth` selected, since `UPDATE_PARAMS` shallow-merges | U4's reset patch explicitly nulls those three optional fields instead of relying on `DEFAULT_PARAMS` alone. |

---

## Sources & References

- **Origin document:** [docs/design_handoff_estimator_revamp/README.md](../design_handoff_estimator_revamp/README.md)
- Design notes: `docs/design_handoff_estimator_revamp/2026-07-25-estimate-new-page-design-notes.md`
- Hi-fi prototype (verified interactively in-browser this session): `docs/design_handoff_estimator_revamp/Estimator Hi-Fi.dc.html`
- Related code: `components/estimator/*`, `lib/ai/parse.ts`, `lib/export/summary.ts`, `hooks/use-toast.ts`, `components/panduan/PdfViewer.tsx`, `components/nav/MobileMenu.tsx`, `components/hotel-nusuk/HotelPriceList.tsx`, `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`
- Related prior plan: `docs/plans/2026-05-04-001-feat-mobile-responsiveness-plan.md` (its unapplied month-grid fix intent is completed here via U3/U7)
