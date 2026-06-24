---
date: 2026-06-23
topic: manual-hotel-booking-catalog
---

# Manual Hotel Booking Catalog

## Summary

Add an OTA-like hotel booking catalog on top of the existing Hotel Nusuk experience. Jamaah can browse hotels by period and price, choose an offer, and send a booking request to WhatsApp; payment, final availability checking, and confirmation remain manual in v1.

---

## Problem Frame

The product already recommends hotels through `/hotel-nusuk`, and the visa flow points jamaah toward checking hotel options before buying. Some relevant hotels are not bookable through OTA apps, so jamaah need help booking directly with hotels. Because the team is based in Makkah and Madinah, it can bridge this local booking gap better than a generic marketplace.

---

## Key Decisions

- **Catalog first, checkout later.** The v1 experience should feel close to browsing Agoda or Booking.com, but stop at a booking request instead of collecting payment online.
- **Displayed offers are current team-maintained offers.** Prices and periods should represent what the team is actively offering, while final room availability is still checked manually after request.
- **Hybrid admin maintenance.** Admins need manual editing for small corrections and spreadsheet import for larger periodic refreshes.
- **Reuse the hotel recommendation surface.** The feature should extend the Hotel Nusuk journey instead of creating an unrelated hotel marketplace.

---

## Actors

- A1. Jamaah: Browses hotel offers and submits a booking request.
- A2. Admin booking operator: Maintains offer periods/prices and follows up through WhatsApp.
- A3. Hotel contact: Confirms final room availability, booking terms, and payment instructions outside the app.

---

## Key Flows

- F1. Browse bookable hotel offers
  - **Trigger:** Jamaah opens the hotel catalog from the Hotel Nusuk journey.
  - **Actors:** A1
  - **Steps:** Jamaah filters or searches hotels, reviews available periods, sees the displayed price, and compares relevant hotel information.
  - **Outcome:** Jamaah can identify a hotel offer worth requesting.
  - **Covered by:** R1, R2, R3, R4

- F2. Submit booking request to WhatsApp
  - **Trigger:** Jamaah chooses a hotel offer and starts booking.
  - **Actors:** A1, A2
  - **Steps:** The app carries the selected hotel, period, price, and request context into WhatsApp so the admin can continue the process manually.
  - **Outcome:** Admin receives enough context to check availability and continue payment or confirmation outside the app.
  - **Covered by:** R5, R6, R7

- F3. Maintain hotel offers
  - **Trigger:** Admin needs to refresh hotel periods, prices, or offer status.
  - **Actors:** A2
  - **Steps:** Admin updates individual offers manually or imports a spreadsheet for bulk changes.
  - **Outcome:** Jamaah see current bookable periods and prices without requiring live hotel inventory integration.
  - **Covered by:** R8, R9, R10

---

## Requirements

**Catalog experience**
- R1. The catalog must show hotels with bookable periods and prices that are maintained by the team.
- R2. Each offer must make the hotel, city, period, and price clear enough for jamaah to compare choices.
- R3. The catalog must distinguish current offers from general hotel recommendations when a hotel has no active bookable period.
- R4. The experience must avoid implying that displayed offers are live guaranteed inventory.

**Booking request handoff**
- R5. Jamaah must be able to start a booking request from a specific hotel offer.
- R6. The WhatsApp handoff must include the selected hotel, period, displayed price, and enough context for admin follow-up.
- R7. The handoff must communicate that payment, final availability checking, and confirmation continue manually.

**Admin maintenance**
- R8. Admins must be able to add, edit, disable, or mark hotel offers as unavailable.
- R9. Admins must be able to refresh many hotel offers through a spreadsheet import path.
- R10. Manual edits and imports must support periodic price and availability updates without forcing a full product deployment.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given a hotel has an active offer for a specific period, when jamaah view the catalog, they can see the hotel, city, period, and displayed price.
- AE2. **Covers R3, R4.** Given a recommended hotel has no active bookable period, when jamaah view the hotel, the page does not present it as immediately bookable.
- AE3. **Covers R5, R6, R7.** Given jamaah click booking on an active offer, when WhatsApp opens, the message includes the selected hotel and offer details and frames the next step as manual follow-up.
- AE4. **Covers R8, R10.** Given an admin learns an offer is no longer valid, when they disable or mark it unavailable, jamaah no longer see it as bookable.
- AE5. **Covers R9, R10.** Given many hotel periods and prices change, when admin imports an updated spreadsheet, the catalog can be refreshed without editing each offer one by one.

---

## Success Criteria

- Jamaah can browse hotel offers with enough clarity to choose one before contacting admin.
- Admin receives WhatsApp requests with the hotel and offer context already included.
- The team can keep hotel periods and prices current through a hybrid manual edit and import workflow.
- The v1 product avoids support confusion by making final availability, payment, and confirmation manual.

---

## Scope Boundaries

- Do not collect payment inside the app in v1.
- Do not provide automated booking confirmation, cancellation, refund, or voucher issuance.
- Do not integrate with hotel inventory APIs or OTA systems.
- Do not guarantee room availability at click time.
- Do not replace the manual WhatsApp follow-up process.

---

## Dependencies / Assumptions

- The team has an operational process for checking final hotel availability with hotel contacts after a request arrives.
- Offer prices and periods are reliable only if the admin maintenance workflow is used consistently.
- Existing Hotel Nusuk and visa flows remain the main discovery context for this feature.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R2, R8][Product] What minimum fields should an admin provide for a hotel offer so jamaah can compare it confidently?
- [Affects R6, R7][Product] What exact wording should the WhatsApp handoff use so jamaah understand the request is not yet a confirmed booking?
- [Affects R8, R9, R10][Technical] How should manual edits and spreadsheet imports resolve conflicts when both update the same hotel offer?

---

## Sources / Research

- `app/(public)/hotel-nusuk/page.tsx`: Existing public Hotel Nusuk directory surface.
- `components/hotel-nusuk/HotelPriceList.tsx`: Existing hotel search, filters, monthly price display, and admin contact CTA.
- `app/(public)/visa/page.tsx`: Existing visa flow tells jamaah to check Hotel Nusuk and consult before buying hotels.
- `lib/db/schema.ts`: Existing hotel price, monthly price, and hotel listing concepts.
- `docs/brainstorms/2026-05-08-hotel-pricing-csv-import-requirements.md`: Prior requirements for bulk hotel pricing imports.
