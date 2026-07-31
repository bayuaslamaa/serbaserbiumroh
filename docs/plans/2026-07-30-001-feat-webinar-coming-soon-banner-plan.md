---
title: "feat: Add webinar coming-soon banner"
date: 2026-07-30
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
depth: lightweight
---

# feat: Add webinar coming-soon banner

## Goal Capsule

**Objective:** Add a compact webinar announcement at the top of the homepage hero so visitors immediately see that registration will open soon.

**Authority hierarchy:** This plan defines scope and copy; the approved design file
(`Webinar Coming-Soon Banner.dc.html`, treatments 1a and 1b) defines the visual treatment. Where they
disagree on look, the design wins; where they disagree on scope or copy, the plan wins. Existing
homepage content and behavior remain authoritative everywhere outside the announcement.

**Execution profile:** U1 ports the approved design into an isolated component. U2 places it at the
top of the hero without changing the existing hero content.

**Stop conditions:** Stop and ask if implementation requires an active registration destination, changes to the existing webinar page, or edits to any homepage section beyond the hero insertion point.

**Tail ownership:** Opening registration, linking a registration form, and replacing the old recording promo are separate follow-up work.

### Requirement reversal — 30 Juli 2026

**Two stop conditions above fired, were raised, and the operator chose to cross both.** This section
records that decision. Where it conflicts with R2, R3, R8, AE3, KTD3, or the Scope Boundaries below,
**this section wins** — those clauses describe the abandoned passive design and are marked as
superseded in place.

*What changed:* the banner now carries one registration CTA (`Daftar Sekarang` -> `/webinar-umroh-mandiri`)
plus a note that the RSVP link is for logged-in users only. `/webinar-umroh-mandiri` was updated from
the June event to August, and its event facts moved into `lib/webinar.ts` so the banner, the page, and
its SEO description read from one source.

*Why:* the passive state was incoherent in place. The plan itself flagged this under Risks — a
"pendaftaran segera dibuka" card sitting ~200px above the hero's existing active `RSVP Webinar`
button, pointing at a stale June page. Shipping the passive banner would have put two contradictory
registration states in one viewport. The reversal resolves that, at the cost of the deferral this
plan was written around.

*Consequence for anyone verifying this branch against the plan:* a `Daftar Sekarang` link in the
banner is **correct**, not a defect. `components/home/__tests__/WebinarComingSoonBanner.test.tsx`
pins "exactly one interactive control" and is the current authority; AE3's "zero interactive
elements" is not. The component filename still says `ComingSoon` and no longer describes what it
renders — renaming it is safe follow-up work.

## Product Contract

### Summary

The homepage receives one compact announcement at the top of its hero for the free webinar “Jangan Nekat Umroh Mandiri Sebelum Tahu Risiko Ini!”. It shows the schedule and a clear “registration coming soon” state without presenting a clickable registration action. The navbar, existing hero copy, social proof, calls to action, recording promo, section cards, and featured stories remain unchanged.

### Problem Frame

The upcoming webinar is not visible on the homepage, while the poster already contains the campaign message and schedule. Visitors need an above-the-fold announcement that fits the website’s dark green and gold system without turning the portrait poster into a large page takeover or implying that registration is already open.

### Requirements

- R1. The homepage displays a webinar announcement as the first content inside the hero, before the existing H1.
- R2. ~~The announcement includes “Webinar Gratis”, “Coming Soon”, …~~ **Superseded by the
  Requirement reversal.** “Coming Soon” is gone; the pill would contradict the button beside it. The
  announcement includes “Webinar Gratis”, the headline, “Ahad, 2 Agustus 2026”, and “09.00 WIB”.
- R3. ~~The announcement … does not render an active registration link, button, or form.~~
  **Superseded by the Requirement reversal.** The announcement renders exactly one registration
  control, linking to `WEBINAR_PATH`, plus a note that the RSVP link requires login.
- R4. The announcement is visible without scrolling on a typical desktop viewport and remains legible as a stacked card on mobile.
- R5. The announcement uses the site’s dark green, gold, cream, border, typography, and radius tokens so it belongs to the current homepage.
- R6. The portrait poster is a visual and content reference, not a full-width image embedded in the hero.
- R7. Existing hero copy, statistics, CTA labels, CTA destinations, admin gating, and ordering after the announcement do not change.
- R8. The existing `PromoWebinar`, `SectionCards`, `FeaturedStories`, navbar, and public layout do
  not change. ~~webinar detail route~~ — **superseded by the Requirement reversal**: the route was
  updated to the August event and now reads its facts from `lib/webinar.ts`.

### Approved Design (supersedes the original brief)

**The design now exists** and is the authority for visual treatment. This section replaced the
original “Design Brief for AI Designer” — that brief did its job, the designer worked from it, and
the resulting treatment satisfies it. Nothing below is open for reinterpretation.

**Source:** Claude Design project `12c17c1c-257f-4826-8ec9-0ee22f9d3cc5`, file
`Webinar Coming-Soon Banner.dc.html` (companion `support.js` is the design-canvas runtime, not part
of the deliverable). Read it via the design MCP before implementing U1.

It supplies **two complete treatments**, both rendered inside a mock hero so the fit is visible:

- **1a — Desktop (1280px):** a horizontal card, max-width 880px, centred, `28px` gap. Left column
  carries the two pills then the headline then the supporting line; a right column separated by a
  `border-left` carries the `JADWAL` label, date, time, and the passive status. Two decorative
  layers: a blurred gold radial at the top-right and a `☾` glyph at 10% opacity.
- **1b — Mobile (375px):** the same content stacked, pills wrapping, date and time on one
  `border-top`-separated row, status last.

**Implementation notes carried from the design file** (these are the parts easy to get wrong):

- The headline is a `<p>`, **not** a heading — the page `h1` must stay first in document order.
- Wrapper is `role="region" aria-label="Pengumuman webinar"`.
- Zero interactive elements. The status dot is **neutral, not gold**, and not button-shaped, so the
  state reads informational and is never conveyed by colour alone (the literal “COMING SOON” and
  “Pendaftaran segera dibuka” text carry it).
- Row layout switches to stacked below `md`.
- The crescent motif is decorative text at 10% opacity — drop it if it competes with the headline.

**Use the repo's tokens, not the design's literal hex values.** The design hardcodes `#9fb3a5` for
muted text while the repo's `--color-text-muted` is `#9ab39e`; the design's own notes say to use
tokens, so the token wins. Gold (`#c9a84c`) and the `PromoWebinar` gradient stops
(`#12301d → #0e271a → #0b1c12`) do match the repo — verified against `app/globals.css` and
`components/home/PromoWebinar.tsx`.

**Exact copy**

- Eyebrow: `WEBINAR GRATIS`
- Status: `COMING SOON`
- Headline: `Jangan Nekat Umroh Mandiri Sebelum Tahu Risiko Ini!`
- Schedule: `Ahad, 2 Agustus 2026`
- Time: `09.00 WIB`
- Registration state: `Pendaftaran segera dibuka`
- Optional supporting line: `Pantau informasi pendaftaran selanjutnya di Serba Serbi Umroh.`

### Acceptance Examples

- AE1. Given a visitor opens `/` on desktop, when the hero appears, then the webinar announcement is visible above the existing homepage H1 and its schedule is readable.
- AE2. Given a visitor opens `/` on a narrow mobile viewport, when the announcement renders, then its content stacks without clipping or horizontal scrolling.
- AE3. ~~Given registration has not opened … no registration link, button, form, or misleading click
  affordance is present.~~ **Superseded by the Requirement reversal.** Given a visitor inspects the
  announcement, then exactly one interactive control is present — a registration link to
  `WEBINAR_PATH` — and the login requirement is stated before the click, not after it.
- AE4. Given the announcement is added, when the rest of the homepage renders, then the existing hero content and all later homepage sections retain their current content and order.

### Scope Boundaries

#### Deferred to follow-up work

- ~~Replace the passive registration state with an active CTA…~~ **Pulled forward** — see the
  Requirement reversal.
- ~~Update `/webinar-umroh-mandiri` for the new event and align its stale tests.~~ **Pulled forward**
  — the page is on August and the two tests that had been red since before this branch now pass.
- Add registration tracking, reminders, calendar integration, or campaign administration. **Still
  deferred, and the reversal raised its cost:** the banner now says "amankan tempat Kakak" and the
  webinar page states a hard 300-seat Zoom capacity with random admission, but nothing records a
  registration — there is no RSVP table or column anywhere, and `WEBINAR_RSVP_URL` is a Zoom *join*
  link, not a registration form. Either the copy stops implying a reserved seat, or seat reservation
  becomes real work. Do not leave it implied.
- **Give the banner a runtime expiry.** `WEBINAR_STARTS_AT` is read by tests only, so after 2 Agustus
  the homepage keeps soliciting registrations for a past event until someone redeploys. A red test is
  not a guard — this repo carried a red webinar date test for roughly six weeks.

#### Outside this change

- Redesigning the navbar or the rest of the homepage hero.
- Removing or redesigning the existing recording promo.
- Embedding the supplied portrait poster as a full-size homepage image.
- Adding animation, countdown timers, popups, carousels, or sticky promotional UI.

## Planning Contract

### Key Technical Decisions

- KTD1. **Use a dedicated presentational component.** The announcement belongs in `components/home/` so its campaign content and styling stay isolated from the existing hero copy and CTA logic.
- KTD2. **Compose the banner as the hero’s first child.** `HeroSection` keeps its current semantic H1 and all current content in the same order; only the new component is prepended.
- KTD3. ~~**Render a passive registration state.**~~ **Superseded by the Requirement reversal:
  render an active registration CTA that defers all branching to the webinar page.** The banner links
  to `WEBINAR_PATH`, never to `WEBINAR_RSVP_URL` — that is a server-side env var, and the page owns
  the login and URL-missing branches. The access note sets the expectation before the click.
- KTD4. **Translate the poster into the site design system.** Reusing the poster as a portrait image would dominate the above-the-fold area and perform poorly on mobile. The component extracts its message, gold hierarchy, and small decorative motifs into a responsive card.
- KTD5. **Keep campaign data local to the component for this iteration.** This is one fixed announcement with no admin or scheduling workflow. A data model or feature-flag abstraction would expand scope without serving the current request.

## Implementation Units

### U1. Webinar coming-soon announcement

**Goal:** Build the isolated, responsive announcement component from the approved design (treatments
1a and 1b in `Webinar Coming-Soon Banner.dc.html`).

**Requirements:** R2, R3, R4, R5, R6.

**Dependencies:** None.

**Files:**

- `components/home/WebinarComingSoonBanner.tsx` (new)
- `components/home/__tests__/WebinarComingSoonBanner.test.tsx` (new)

**Approach:** Port treatment 1a/1b to a server-rendered component. Translate the design's inline
styles to Tailwind plus the repo's CSS variables — do **not** carry the design's inline `style`
attributes or its literal hex values into the component (see the token note in the design section).
The design's row layout maps to `md:`; below that it stacks.

Keep the campaign headline as visually prominent text rather than a heading so the existing homepage
`h1` remains the first heading in document order. Keep decoration CSS- or glyph-based so no image
asset is required at runtime.

**Patterns to follow:** `components/home/PromoWebinar.tsx` for the current dark campaign-card treatment and responsive spacing; `components/home/HeroSection.tsx` for homepage typography and token usage.

**Test scenarios:**

- Covers AE1. Rendering the component shows the webinar headline, date, time, “Webinar Gratis”, and “Coming Soon”.
- Covers AE3. Rendering the component exposes no link, button, textbox, or form role.
- The registration state reads “Pendaftaran segera dibuka” in visible text.
- The existing homepage title remains the first and only heading in the hero.

**Verification:** The component test passes, the rendered banner matches treatments 1a and 1b at
1280px and 375px, and it exposes no interactive control.

### U2. Homepage hero placement and regression coverage

**Goal:** Place the announcement above the existing hero content while proving the rest of the hero is unchanged.

**Requirements:** R1, R7, R8.

**Dependencies:** U1.

**Files:**

- `components/home/HeroSection.tsx`
- `components/home/__tests__/HeroSection.test.tsx`

**Approach:** Render `WebinarComingSoonBanner` as the first child of `HeroSection`. Do not change the current H1, descriptive copy, `CommunityStats`, CTA row, destinations, or admin-only estimate behavior.

**Patterns to follow:** The existing document-order assertion in `components/home/__tests__/HeroSection.test.tsx`, which already protects the copy → stats → CTA sequence.

**Test scenarios:**

- Covers AE1. The webinar headline appears before the existing homepage H1 in document order.
- Covers AE4. The existing H1, community statistics, and public CTA links still render.
- The existing copy → statistics → first CTA order remains intact after the announcement is prepended.
- The admin and non-admin estimate CTA behavior remains unchanged.

**Verification:** The hero tests pass and a visual check at desktop and mobile widths confirms the announcement is first, compact, and does not alter later sections.

## Risks & Dependencies

- The existing “RSVP Webinar” CTA in `HeroSection:53` links to `/webinar-umroh-mandiri`, whose content
  still describes the June 2026 event. This plan preserves that CTA because the request excludes
  changes to other hero content — but the result is a page where a passive “registration coming soon”
  banner sits directly above an active RSVP button pointing at a stale event. The campaign owner
  should reconcile the CTA and route before treating the August registration flow as open.
- **That stale route is also why two tests fail on `main` today.** The date-dependent cases in
  `app/(public)/webinar-umroh-mandiri/__tests__/page.test.tsx` are the pre-existing failures every
  recent run has reported. They are not caused by this plan and are listed under deferred work, but
  anyone touching the webinar surface will meet them.

## Verification Contract

| Gate | Command | Applies to |
|---|---|---|
| Banner component coverage | `pnpm test components/home/__tests__/WebinarComingSoonBanner.test.tsx` | U1 |
| Hero regression coverage | `pnpm test components/home/__tests__/HeroSection.test.tsx` | U2 |
| Type and production integration | `pnpm build` | U1-U2 |

Manual design checks:

- At the supplied desktop reference width, the announcement is immediately visible and the start of the existing hero remains visible in the same viewport.
- At 320px, 375px, and 768px widths, copy does not clip, overflow, or become too small to read.
- The status reads as information rather than a disabled action.
- Tab navigation stops on exactly one element in the announcement: the registration CTA.
- The navbar, current hero content, recording promo, section cards, and featured stories show no visual or content changes.

## Definition of Done

- U1 satisfies the exact copy, semantic, and responsive requirements, carries exactly one interactive
  control, and matches treatments 1a/1b without carrying the design's inline styles or literal hex
  values into the code.
- U2 places the announcement first in the hero and preserves existing hero behavior.
- Scoped tests and the production build pass.
- Desktop and mobile visual checks pass against the supplied homepage and poster references.
- No unrelated homepage, navbar, or campaign code is changed. The webinar route **is** changed, by the
  Requirement reversal.
- No abandoned design experiment or unused asset remains in the diff.
