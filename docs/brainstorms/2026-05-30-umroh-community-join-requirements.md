---
date: 2026-05-30
topic: umroh-community-join
---

# Umroh Community Join Requirements

## Summary

Build a dedicated public page for joining the managed Umroh Mandiri WhatsApp community. The page captures a lightweight request, then guides the user to request the WhatsApp group and optionally chat admin while using the same identity so admin can manually match the request.

---

## Problem Frame

Prospective independent umroh learners may come from social media, WhatsApp, or the existing app and need a simple way to join the community. Directly exposing a group link without context can make moderation and matching harder, while forcing account login would add too much friction for early interest.

The desired flow keeps the public entry point easy, but gives admin enough data to verify that a WhatsApp request matches a real submitted form.

---

## Key Decisions

- **Manual admin review stays central.** WhatsApp group approval is not automated in v1 because admin needs to match the submitted form with the incoming WhatsApp request.
- **Dedicated public page with homepage entry.** The full form lives on a shareable community page, while the homepage only links or routes interested users to it.
- **Minimal form with optional intent.** The form asks only for required contact identity plus optional context, keeping it friendly for social-media traffic.
- **No explicit consent checkbox in v1.** The first version does not block submission with a required checkbox, though the page may still present clear expectations in copy.

---

## Actors

- A1. **Prospective community member** submits their information and requests to join the WhatsApp group.
- A2. **Admin** reviews submitted requests, compares them with WhatsApp join requests or chats, and updates internal status.
- A3. **Logged-in user** is a prospective member who may already have an app account; their request can be associated with the account without requiring login.

---

## Requirements

**Public join experience**

- R1. The system provides a dedicated public community join page that can be shared directly.
- R2. The homepage includes a clear link or call-to-action that routes users to the dedicated community join page.
- R3. The join form collects nama lengkap and nomor HP as required fields.
- R4. The join form allows username sosial media as an optional field.
- R5. The join form allows an optional short join intent so users can explain why they want to join.
- R6. The form can be submitted by anonymous visitors without requiring login.
- R7. When the submitter is logged in, the request can be associated with the existing user account.

**Post-submit guidance**

- R8. After submit, the user sees a success state confirming that their data has been recorded.
- R9. The success state provides both a WhatsApp group request link and a WhatsApp admin chat link.
- R10. The success state clearly instructs the user to use the same name and phone number on WhatsApp so admin can match the request.
- R11. The success state should set expectations that joining the group still depends on admin review.

**Admin review**

- R12. Admin can view submitted community join requests.
- R13. Admin can see contact identity, optional social username, optional intent, submission date, status, and internal notes.
- R14. Admin can update request status at minimum across baru, sudah dicocokkan, and ditolak.
- R15. Admin can add or edit an internal note for manual matching context.
- R16. The system flags possible duplicates using nomor HP and username sosial media when available.
- R17. Duplicate detection is advisory only; admin makes the final decision.

---

## Key Flows

- F1. Public community request
  - **Trigger:** A visitor opens the community join page from a shared link or homepage CTA.
  - **Actors:** A1, A3
  - **Steps:** User fills the required identity fields, optionally adds social username and intent, then submits.
  - **Outcome:** The request is saved and the user sees the success state with WhatsApp next steps.
  - **Covered by:** R1, R3, R4, R5, R6, R7, R8

- F2. WhatsApp follow-through
  - **Trigger:** A user has submitted the form and reaches the success state.
  - **Actors:** A1, A2
  - **Steps:** User taps the group request link or admin chat link, then uses matching identity details on WhatsApp.
  - **Outcome:** Admin can compare the WhatsApp request with the saved form entry.
  - **Covered by:** R9, R10, R11

- F3. Admin matching
  - **Trigger:** Admin reviews incoming WhatsApp requests or chats against submitted entries.
  - **Actors:** A2
  - **Steps:** Admin opens the request list, reviews identity and intent, checks duplicate indicators, updates status, and adds internal notes when useful.
  - **Outcome:** The request has an internal review state that reflects the manual matching result.
  - **Covered by:** R12, R13, R14, R15, R16, R17

---

## Acceptance Examples

- AE1. **Covers R3, R4, R5, R8.**
  - **Given:** A public visitor provides nama lengkap and nomor HP, leaves social username and intent empty, and submits.
  - **When:** The request is accepted.
  - **Then:** The request is saved and the visitor sees the success state.

- AE2. **Covers R9, R10, R11.**
  - **Given:** A user has just submitted the join form.
  - **When:** The success state is shown.
  - **Then:** The user sees both WhatsApp options and instruction to use matching name and phone number for admin verification.

- AE3. **Covers R16, R17.**
  - **Given:** A new request uses a phone number or social username already present on another request.
  - **When:** Admin views the request.
  - **Then:** The system marks it as a possible duplicate without automatically rejecting it.

- AE4. **Covers R14, R15.**
  - **Given:** Admin has checked a WhatsApp request against a saved entry.
  - **When:** Admin updates status and adds a note.
  - **Then:** The status and note remain visible for future admin review.

---

## Success Criteria

- Users can submit a community request without logging in.
- Users understand the next WhatsApp step and know to use matching identity details.
- Admin can reliably review and track requests without relying only on WhatsApp chat history.
- Duplicate indicators reduce manual confusion without blocking legitimate users.

---

## Scope Boundaries

- Automatic WhatsApp approval or WhatsApp bot verification is not part of v1.
- Required consent checkbox is not part of v1.
- The homepage does not contain the full join form in v1; it only routes users to the dedicated page.
- Advanced segmentation, broadcast messaging, CRM automation, or community analytics are deferred.

---

## Dependencies / Assumptions

- A WhatsApp group request link exists or will be provided.
- A WhatsApp admin chat target exists or will be provided.
- Admins are willing to manually match form submissions against WhatsApp activity.
- Duplicate detection can use normalized phone numbers and social usernames, but exact normalization rules can be decided during planning.
