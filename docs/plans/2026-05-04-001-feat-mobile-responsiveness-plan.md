---
title: "feat: Make the app fully mobile responsive"
type: feat
status: active
date: 2026-05-04
---

# feat: Make the app fully mobile responsive

## Summary

Make every user-facing surface of the Umroh Planner work correctly on mobile (375px+) and tablet (768px+) viewports. The work is structured as six targeted units: a NavBar hamburger menu, a Panduan guide picker for mobile, responsive filter controls, Estimator layout fixes, admin table overflow wrappers, and global typography/spacing polish.

---

## Problem Frame

The app was built desktop-first. All primary navigation links (`Panduan`, `Cerita Jamaah`, `Hotel Nusuk`, `Dashboard`) are wrapped in `hidden md:flex` with no mobile equivalent — users on phones see only a logo and two buttons. The Panduan guide sidebar is `w-64 hidden md:block` with no mobile fallback. Filter select controls have fixed widths that overflow 375px viewports. Estimator month-button grids render 6 columns at every viewport width. Admin pricing tables have no horizontal scroll container.

---

## Requirements

- R1. All navigation links are reachable on mobile (no `hidden md:*` without a mobile alternative).
- R2. The Panduan guide sidebar is replaced by a usable navigation pattern on mobile.
- R3. Story and hotel filter controls fit inside a 375px viewport without overflow.
- R4. The Estimator month-button grid and two-column layout render correctly on small screens.
- R5. Admin pricing and user tables scroll horizontally on mobile rather than overflowing the page.
- R6. Major headings and hero text scale down for small screens; dashboard header elements stack vertically on mobile.

---

## Scope Boundaries

- Admin sidebar/nav responsive redesign is not included — admin is a desktop-first tool; the layout is acceptable at tablet+ widths.
- No custom Tailwind breakpoints — use the project's existing defaults (`sm: 640px`, `md: 768px`, `lg: 1024px`).
- No PWA, native app, or viewport meta tag changes (Next.js already sets the default viewport meta).
- Story and hotel detail page card layouts already have grid breakpoints; only filter controls need fixing.
- The admin panel's content (StoryForm, HotelListingForm) is form-heavy and used on desktop; only table overflow is in scope for this plan.

---

## Context & Research

### Relevant Code and Patterns

- `components/nav/NavBar.tsx` — `hidden md:flex` wraps all nav links; user email uses `hidden md:block`; no hamburger exists
- `components/panduan/GuideSidebar.tsx` — `w-64 hidden md:block sticky top-4`; guide detail layout is `flex gap-8` with no responsive stacking
- `app/(public)/panduan/[slug]/page.tsx` — `max-w-5xl mx-auto flex gap-8` — flex row with no `flex-col md:flex-row` switch
- `components/cerita-jamaah/StoryFilters.tsx` — select triggers `w-48`, `w-40`, `w-40` (fixed, overflow mobile)
- `components/hotel-nusuk/HotelFilters.tsx` — select triggers `w-44` (fixed, overflow mobile)
- `components/estimator/ParamsPanel.tsx` — month picker uses `grid grid-cols-6 gap-1.5` (always 6 cols)
- `components/estimator/EstimatorClient.tsx` — `grid grid-cols-1 lg:grid-cols-2` jumps directly to 2-col at lg
- `components/admin/PricingTable.tsx` — tables use `<table className="w-full">` without overflow wrapper
- `components/home/HeroSection.tsx` — `text-4xl` fixed heading, `py-16` fixed padding
- `app/(dashboard)/dashboard/page.tsx` — `flex items-center justify-between` header doesn't stack on mobile
- `components/dashboard/EstimateList.tsx` — search input uses `max-w-sm` without `w-full` on mobile

### Institutional Learnings

- No `docs/solutions/` entries for responsive design.

### Existing Responsive Patterns (to reuse)

- Grid card layouts: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` — already used in EstimateList, FeaturedStories, StoryFilters card list, HotelFilters card list
- `w-full sm:w-auto` button pattern — already in InputPanel
- Shadcn `Sheet` component — Radix UI Sheet is already a project dependency (used in other dialog patterns); appropriate for mobile nav drawer

---

## Key Technical Decisions

- **NavBar mobile drawer via Shadcn `Sheet`:** The existing Shadcn component set includes Sheet. A `Menu` icon button (Lucide) triggers a `Sheet` from the left; it lists the same links as the desktop nav. This avoids building a custom overlay/drawer from scratch and matches the project's UI component conventions.
- **GuideSidebar mobile: guide-picker `<Select>` above the article:** Simpler than a collapsible drawer. On `md:` and up, the existing sticky sidebar is preserved. Below `md:`, a `<Select>` with all guide titles (grouped by category) renders above the article content; selecting a guide navigates via `router.push()`. This mirrors the filter-control pattern already present in StoryFilters/HotelFilters.
- **Filter selects: `w-full sm:w-48` rather than fixed widths:** On mobile, each select expands to full width within the filter bar. The filter bar switches from `flex-row` to `flex-col sm:flex-row`. This is the simplest fix with no behavioral change.
- **Admin tables: wrap with `overflow-x-auto`:** Each table section (`<div className="overflow-x-auto">`) wraps the `<table>`. No column hiding — the table is always full-fidelity; on mobile the user scrolls horizontally.
- **No responsive refactor of admin forms:** StoryForm and HotelListingForm are complex forms used on desktop; leaving them outside scope keeps this plan bounded.

---

## Implementation Units

- U1. **NavBar — hamburger menu and mobile navigation sheet**

**Goal:** Replace the invisible-on-mobile nav links with a hamburger icon that opens a Sheet drawer containing all the same links.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `components/nav/NavBar.tsx`
- Test: `components/nav/__tests__/NavBar.test.tsx`

**Approach:**
- Add a `Sheet` (Shadcn), `SheetTrigger`, `SheetContent`, `SheetClose` import from `@/components/ui/sheet`
- Add a `Menu` icon (Lucide) button visible only on mobile (`md:hidden`) in the NavBar right section
- The Sheet opens from the left (or right — match visual direction); it contains a vertical list of the same links that appear in the desktop `hidden md:flex` div
- Include the same conditional admin links (show only when `session?.user?.role === 'ADMIN'`)
- After a link is clicked, the sheet closes automatically (wrap each link with `<SheetClose asChild>`)
- The user's email/name can optionally appear at the top of the sheet panel if logged in
- The existing `hidden md:flex` desktop nav remains unchanged

**Patterns to follow:**
- `components/ui/sheet.tsx` (Shadcn Sheet component)
- Existing desktop nav links in `NavBar.tsx` — mirror the same links, same auth conditions
- Lucide `Menu` icon (same `lucide-react` package used throughout)

**Test scenarios:**
- Happy path: hamburger button renders when viewport is mobile (test via component render — confirm `Menu` icon button is present in the DOM)
- Happy path: Sheet trigger is `md:hidden` — not rendered at desktop breakpoints (snapshot or class assertion)
- Happy path: Sheet content contains links for Panduan, Cerita Jamaah, Hotel Nusuk
- Happy path: Admin links present inside Sheet when role is ADMIN
- Happy path: Non-admin links not present in Sheet when role is USER
- Edge case: Sheet is not open by default (aria-hidden or Sheet open state is false on mount)

**Verification:**
- All nav links are accessible via the Sheet on mobile
- Desktop nav behavior is unchanged
- Existing NavBar tests still pass; new tests cover the hamburger and Sheet content

---

- U2. **Panduan — mobile guide picker above article**

**Goal:** Give mobile users a way to navigate between guides on the `[slug]` detail page, replacing the hidden desktop sidebar.

**Requirements:** R2

**Dependencies:** None (parallel to U1)

**Files:**
- Modify: `app/(public)/panduan/[slug]/page.tsx`
- Modify: `components/panduan/GuideSidebar.tsx`

**Approach:**
- In `app/(public)/panduan/[slug]/page.tsx`, the layout `flex gap-8` stays as-is for `md:` and above.
- Add a new mobile guide selector above the article, visible only on `< md:` screens (`block md:hidden`): a `<Select>` (Shadcn) with all guides grouped by category, defaulting to the current slug. On change, call `router.push('/panduan/' + selectedSlug)`.
- The `<GuideSidebar>` already uses `hidden md:block` — no change needed there.
- The detail page flex wrapper should add `flex-col md:flex-row` so the article fills the full width when sidebar is hidden on mobile.
- Keep `getAllGuides()` called once (already called server-side); pass the guides list as a prop to the mobile select or call it inside the select client component.

**Patterns to follow:**
- `components/cerita-jamaah/StoryFilters.tsx` — `'use client'` component using Select and router push
- `components/panduan/GuideSidebar.tsx` — guide grouping logic to mirror in the mobile select
- `components/ui/select.tsx` (Shadcn Select)

**Test scenarios:**
- Test expectation: none — this unit is pure layout and routing; the routing behavior is covered by Next.js internals and manual testing. The `getAllGuides()` function is already tested elsewhere.

**Verification:**
- On mobile viewport, a guide `<Select>` appears above the article; selecting a guide navigates to its route
- On `md:+` viewports, the select is hidden and the sidebar is visible
- The article renders full-width on mobile (no blank sidebar gap)

---

- U3. **Filter controls — responsive widths in StoryFilters and HotelFilters**

**Goal:** Make the story and hotel filter selects expand to full width on mobile so they don't overflow the viewport.

**Requirements:** R3

**Dependencies:** None (parallel to U1, U2)

**Files:**
- Modify: `components/cerita-jamaah/StoryFilters.tsx`
- Modify: `components/hotel-nusuk/HotelFilters.tsx`
- Test: `components/cerita-jamaah/__tests__/StoryFilters.test.tsx`
- Test: `components/hotel-nusuk/__tests__/HotelFilters.test.tsx`

**Approach:**
- In `StoryFilters`, change the filter bar from `flex flex-wrap gap-3` to `flex flex-col sm:flex-row flex-wrap gap-3`
- Change each select trigger's fixed width (`w-48`, `w-40`) to `w-full sm:w-48` and `w-full sm:w-40`
- Apply the same pattern to `HotelFilters`: filter bar `flex-col sm:flex-row`, select trigger `w-full sm:w-44`
- No behavioral change — filtering logic is unchanged

**Patterns to follow:**
- `w-full sm:w-auto` — already in `InputPanel` button
- `flex-col sm:flex-row` — common Tailwind responsive flex pattern

**Test scenarios:**
- Test expectation: none — responsive class changes are verified by visual inspection. Existing filter logic tests remain unchanged and continue to pass.

**Verification:**
- Filter controls use `flex-col` on mobile and `flex-row` on desktop
- Select triggers have `w-full sm:w-*` classes — no fixed-width-only class remains

---

- U4. **Estimator — mobile layout fixes**

**Goal:** Make the Estimator's month-picker grid and two-column layout work correctly on small screens.

**Requirements:** R4

**Dependencies:** None (parallel to U1, U2, U3)

**Files:**
- Modify: `components/estimator/EstimatorClient.tsx`
- Modify: `components/estimator/ParamsPanel.tsx`
- Test: `components/estimator/__tests__/EstimatorPreFill.test.tsx` (extend if needed)

**Approach:**
- In `EstimatorClient`, change `grid grid-cols-1 lg:grid-cols-2` to `grid grid-cols-1 md:grid-cols-2` so the two-column layout activates at tablet width, not only at `lg:`.
- In `ParamsPanel`, change the month button grid from `grid grid-cols-6 gap-1.5` to `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5`. Month labels should remain readable on mobile (each cell is wider).
- Review `RadioCardGrid.tsx`: if the hotel tier radio cards use `grid-cols-4` or a fixed count that overflows, add a responsive alternative (`grid-cols-2 sm:grid-cols-4`).
- The sticky panel (`lg:sticky lg:top-20`) can be left as-is or expanded to `md:sticky md:top-20` — defer final decision to implementation since it depends on the actual rendered height.

**Patterns to follow:**
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — pattern from EstimateList
- Month grid: same progressive approach as SectionCards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)

**Test scenarios:**
- Test expectation: none — layout changes only; no behavioral change. Existing estimator tests cover param pre-fill, badge rendering, and calculation logic; those must still pass.

**Verification:**
- On a 375px viewport, month buttons render in 3 columns and are tappable (not smaller than ~40px per button)
- Two-column layout activates at `md:` (768px), not `lg:` (1024px)
- All existing estimator tests pass

---

- U5. **Admin tables — horizontal scroll wrapper**

**Goal:** Prevent admin pricing and user tables from overflowing the viewport on mobile by wrapping them in a horizontal scroll container.

**Requirements:** R5

**Dependencies:** None (parallel to all other units)

**Files:**
- Modify: `components/admin/PricingTable.tsx`
- Modify: `app/(admin)/admin/users/page.tsx` (if it renders a table directly)

**Approach:**
- Wrap every `<table>` element with `<div className="overflow-x-auto -mx-4 sm:mx-0">` so the table scrolls independently on mobile without breaking the page layout.
- Add `text-xs sm:text-sm` to table header (`<th>`) and cell (`<td>`) elements in PricingTable.
- Change the monthly-price input grid (line ~329 in PricingTable) from `grid grid-cols-6 gap-2` to `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2` — matching the same fix applied to ParamsPanel month buttons in U4.
- Check `app/(admin)/admin/users/page.tsx` — if it renders a `<table>`, apply the same overflow wrapper.

**Patterns to follow:**
- `overflow-x-auto` — standard Tailwind table scroll pattern
- `text-xs sm:text-sm` — consistent with small-screen text sizing

**Test scenarios:**
- Test expectation: none — this is a pure HTML/CSS wrapping change. No logic is affected; admin table rendering is not unit-tested (admin pages are integration surfaces).

**Verification:**
- On a 375px viewport, pricing tables scroll horizontally without causing the page to overflow
- Monthly price input grid renders in 3 columns on mobile

---

- U6. **Global typography and spacing polish**

**Goal:** Scale down major headings for mobile, make the dashboard header stack vertically, and add responsive padding to page containers where needed.

**Requirements:** R6

**Dependencies:** None (can be done in parallel, but best after U1–U5 since it touches shared layout areas)

**Files:**
- Modify: `components/home/HeroSection.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Modify: `components/dashboard/EstimateList.tsx`
- Modify: `app/(public)/panduan/page.tsx` (guide index heading)
- Modify: `app/(public)/cerita-jamaah/page.tsx` (section heading, if fixed)
- Modify: `app/(public)/hotel-nusuk/page.tsx` (section heading, if fixed)

**Approach:**
- `HeroSection.tsx`: Change `text-4xl` → `text-2xl sm:text-3xl md:text-4xl`; change `py-16` → `py-8 sm:py-12 md:py-16`; change CTA button row from `flex gap-4` → `flex flex-col sm:flex-row gap-4` so buttons stack on mobile.
- `dashboard/page.tsx`: Change the header div from `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3` so the greeting and "Buat Estimasi" button stack on narrow viewports.
- `EstimateList.tsx`: Change search input `max-w-sm` → `w-full sm:max-w-sm` so it doesn't overflow mobile.
- Section page headings (`panduan/page.tsx`, `cerita-jamaah/page.tsx`, `hotel-nusuk/page.tsx`): Apply `text-2xl sm:text-3xl` to any fixed `text-3xl` headings.
- Layouts already use `px-4` which is acceptable; additional padding changes are not required unless discovered during implementation.

**Patterns to follow:**
- `w-full sm:w-auto` — from InputPanel
- `flex-col sm:flex-row` — from U3 filter bar pattern

**Test scenarios:**
- Test expectation: none — typography and spacing changes are verified visually. No behavioral change; no logic touched.

**Verification:**
- HeroSection heading is `text-2xl` on mobile, scales up at `sm:` and `md:` breakpoints
- Dashboard header elements stack on narrow viewports
- CTA buttons in HeroSection stack vertically on mobile
- Search input in EstimateList fills full width on mobile

---

## System-Wide Impact

- **Interaction graph:** NavBar change (U1) is rendered on every public and dashboard page via the `(public)` and `(dashboard)` layouts. Sheet open/close state is local to NavBar — no global state side effects.
- **Error propagation:** None — all changes are Tailwind class additions. No new API calls, no data fetching.
- **State lifecycle risks:** None — no persistent state changes.
- **API surface parity:** None — no API routes touched.
- **Integration coverage:** U2 introduces a `router.push()` call in the mobile guide selector. This is the only new interactive behavior; it mirrors the pattern in StoryFilters.
- **Unchanged invariants:** Estimator calculation logic, auth flows, DB queries, and all server-side data fetching are untouched by this plan.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Sheet component not yet installed in the project | Check `components/ui/sheet.tsx` first. If missing, run `pnpm dlx shadcn-ui@latest add sheet` — the project uses Shadcn CLI already. |
| NavBar Sheet and existing auth sign-out action compatibility | The Sheet wraps link elements; sign-out is a form action. Wrap the form inside `<SheetClose asChild>` or close the sheet imperatively on form submit. |
| Guide picker Select navigates before the sheet fully closes | In U2, navigation is instant on select. No sheet is involved — the guide picker is a Select, not a Sheet. No timing issue. |
| Month button grid change breaks existing ParamsPanel tests | ParamsPanel tests check rendered values, not class names. Class-only changes should not break logic tests. Verify during U4. |

---

## Sources & References

- Related code: `components/nav/NavBar.tsx`, `components/panduan/GuideSidebar.tsx`, `components/cerita-jamaah/StoryFilters.tsx`, `components/hotel-nusuk/HotelFilters.tsx`, `components/estimator/EstimatorClient.tsx`, `components/estimator/ParamsPanel.tsx`, `components/admin/PricingTable.tsx`
- Shadcn Sheet docs: used for U1 hamburger drawer
- Tailwind responsive breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px` (project default)
