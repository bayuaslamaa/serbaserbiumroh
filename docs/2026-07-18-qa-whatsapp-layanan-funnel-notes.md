# QA Notes — WhatsApp / Layanan Funnel UX

**Date:** 2026-07-18
**Scope:** Guest (logged-out) walkthrough of the public site on `localhost:3000`, focused on conversion into WhatsApp and Layanan.
**Method:** BrowserAct guest session — Home, Layanan dropdown, Visa, Transportasi, Komunitas + code cross-check.

## Funnel surfaces observed

| Surface | Destination | Notes |
|---|---|---|
| Floating WhatsApp button (all public pages) | `wa.me/6285161134844` (Admin Nurul) | Tooltip "Tanya Admin SSU". **No prefilled message.** |
| Nav "Layanan" dropdown | Visa Umroh, Sewa Transportasi | Hotel Nusuk is a **separate** top-level item, not under Layanan |
| Home hero CTAs | Cerita Jamaah, Komunitas, Webinar, ~~Estimasi~~ | Estimasi button is disabled/dead |
| Home "Mulai Perencanaan" cards | Panduan, Cerita, Hotel, Visa, Komunitas, ~~Estimasi~~ | 6 cards; Estimasi carries "Coming Soon" badge |
| Visa page | `visa.serbaserbiumroh.id` (primary) + WhatsApp (secondary) + per-Layanan CTAs | Layanan 1 (USD 165), Layanan 2 (USD 190), Siskopatuh add-on (Rp200.000) |
| Transportasi | Green "PESAN VIA WHATSAPP" per route + admin picker (Nurul/Bayu) | Live SAR→IDR calculator, rich prefilled messages |
| Komunitas | Lead-capture form → then group/admin WhatsApp buttons | WhatsApp gated behind form |

Overall the site is polished and the funnel is genuinely good in places (Transportasi is the model to copy). The items below are the gaps.

## Prioritized improvements

### P0 — high impact
1. **Estimator is a prominent dead-end CTA.** "Buat Estimasi (Coming Soon)" appears in the nav, hero, home cards, dashboard, and story detail as a fully `disabled` button (`components/home/HeroSection.tsx:47`, `components/nav/NavBar.tsx:109`, `components/home/SectionCards.tsx:43`, etc.). It is one of the most prominent CTAs on the site and does nothing — reads as broken and wastes the strongest top-of-funnel intent. **Fix:** replace the dead button with a capture — either a "Notify me / Bantu hitung estimasi via WhatsApp" that opens `wa.me/...?text=...`, or a waitlist input. Never ship a prominent disabled CTA.

2. **Inconsistent WhatsApp CTA styling.** Transportasi uses WhatsApp-green buttons with the glyph (high recognition, high intent); Visa, hero, and Komunitas use gold/outline. **Fix:** standardize one recognizable "WhatsApp button" component (green + glyph) across all Layanan pages.

3. **WhatsApp is the only human conversion channel but is often secondary / below the fold.** On Visa, the primary gold button goes to an external app; WhatsApp is the secondary outline button — yet the page copy says everything "masih dilakukan melalui WhatsApp ini." **Fix:** make WhatsApp co-primary on Layanan pages, and consider a sticky per-service WhatsApp CTA on mobile.

### P1 — medium
4. **Floating button and some CTAs send context-free messages.** The floating button is `https://wa.me/6285161134844` with no `?text=` (`components/ui/WhatsAppFloatingButton.tsx`), so admin receives a cold "Hi" with no idea which page/service the lead came from. Transportasi does this right (rich prefilled message). **Fix:** add a page-aware `?text=` to the floating button and any bare WhatsApp links.

5. **Layanan taxonomy is fragmented.** The "Layanan" dropdown lists only Visa + Transportasi, while Hotel Nusuk (also a service) sits as a separate top-level nav item. A guest scanning "Layanan" won't discover Hotel. **Fix:** group monetizable services under Layanan, or add Hotel to the dropdown.

6. **Komunitas funnel friction.** WhatsApp buttons are hidden until the form is submitted ("Simpan dan Lanjutkan"). Good for lead capture, but consider requiring only Nomor HP (Username/Alasan already optional) and/or offering an ungated "Gabung Grup" option. Also verify inline validation + a success/error toast after submit (not observed — did not submit test data to avoid polluting the DB).

### P2 — polish
7. **Social proof placement.** Trust badges (3.500+ Komunitas, 3.000+ Jamaah, 7.719+ Pengunjung) live only in the nav. Surface them near WhatsApp CTAs on Layanan pages to lift conversion at the point of action.
8. **Single source of truth for "Coming Soon."** The estimator's disabled state is duplicated across 6 components. When it launches, ensure one flag flips all of them.
9. **Mobile pass needed.** This QA was desktop-only. Majority of umroh traffic is mobile — re-check the floating button, the gated Komunitas form, and the wide Transportasi cards on a phone viewport.

## To verify (not fully tested)
- External visa app link `visa.serbaserbiumroh.id` — confirm it is live and the handoff isn't a dead link.
- Komunitas form submit → reveal-buttons flow end-to-end (skipped to avoid writing test data to the DB).
- Two admin numbers in use — Nurul `6285161134844` (floating/Visa/Komunitas) and Bayu `6285172117757` (Transportasi). Confirm this routing is intentional.
