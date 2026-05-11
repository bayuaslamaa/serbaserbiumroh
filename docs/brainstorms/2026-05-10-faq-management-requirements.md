---
date: 2026-05-10
topic: faq-management
---

# FAQ Management

## Summary

Add one shared FAQ system for public visitors and logged-in users. Admins manage FAQ groups and Q&A items manually or through a safe CSV import workflow, the full FAQ page shows all published FAQs with grouping and search, and the dashboard shows a compact preview capped at seven published FAQs.

---

## Problem Frame

Umroh Planner already has guide content, stories, hotel listings, and a logged-in estimator dashboard, but quick recurring questions do not have a dedicated home. Visitors and users may need fast answers about umroh mandiri, estimates, pricing assumptions, hotels, visas, flights, and process expectations without reading a full guide page.

Admins also need a way to keep those answers current as pricing, policies, or operating assumptions change. Manual editing covers small changes, but bulk onboarding or refreshing a larger FAQ set should not require creating each Q&A item one at a time. The feature should stay lightweight: it is for question-and-answer content, not another long-form guide system.

---

## Actors

- A1. Public visitor: Reads FAQ content before signing in or creating an estimate.
- A2. Logged-in user: Sees a short FAQ preview on the dashboard and can open the full FAQ page for more answers.
- A3. Admin content manager: Creates, edits, imports, groups, orders, publishes, unpublishes, and deletes FAQ content.
- A4. Planning/implementation agent: Uses this document to plan the feature without inventing product behavior.

---

## Key Flows

- F1. Browse full FAQ page
  - **Trigger:** A public visitor or logged-in user wants quick answers.
  - **Actors:** A1, A2
  - **Steps:** User opens the FAQ page, sees published FAQs organized by admin-managed groups, optionally searches by keyword, expands or reads answers, and can clear or change the search.
  - **Outcome:** User can find relevant Q&A content without entering the estimator or reading full guide articles.
  - **Covered by:** R1, R2, R3, R4, R5, R6

- F2. Use dashboard FAQ preview
  - **Trigger:** A logged-in user lands on the dashboard.
  - **Actors:** A2
  - **Steps:** User sees up to seven published FAQs in a compact section, reads the most important answers, and can follow a link to the full FAQ page.
  - **Outcome:** Dashboard gives quick help without overwhelming the estimate history experience.
  - **Covered by:** R7, R8, R9

- F3. Manage FAQ groups
  - **Trigger:** Admin needs to organize FAQs into user-understandable sections.
  - **Actors:** A3
  - **Steps:** Admin creates or edits groups, orders groups, and uses groups to organize published FAQ items.
  - **Outcome:** Public FAQ content has meaningful structure without hardcoded group labels.
  - **Covered by:** R10, R11, R12

- F4. Manage FAQ items
  - **Trigger:** Admin needs to add or update a recurring answer.
  - **Actors:** A3
  - **Steps:** Admin creates or edits a question, writes a rich answer, assigns it to a group, chooses visibility, sets order, and saves.
  - **Outcome:** Published FAQ content updates intentionally, while drafts/unpublished items remain hidden from public and dashboard users.
  - **Covered by:** R13, R14, R15, R16, R17, R18

- F5. Import FAQ content from CSV
  - **Trigger:** Admin needs to create or refresh multiple FAQ items at once.
  - **Actors:** A3
  - **Steps:** Admin prepares a CSV with group names, questions, and answers, previews the import, reviews rows that will create groups, create FAQ items, update existing FAQ items, or fail validation, then confirms the valid import.
  - **Outcome:** Bulk FAQ content is applied safely without duplicate questions, while publish state and ordering remain managed in the admin UI.
  - **Covered by:** R19, R20, R21, R22, R23, R24, R25, R26

---

## Requirements

**Shared FAQ experience**
- R1. The FAQ content must be shared between public visitors and logged-in users.
- R2. The full FAQ page must be accessible to public visitors without requiring login.
- R3. The full FAQ page must show only published FAQ items to non-admin users.
- R4. The full FAQ page must display FAQ items grouped by admin-managed groups.
- R5. The full FAQ page must support search across published FAQ questions and answers.
- R6. Search results must preserve enough group context that users understand where matching FAQs belong.

**Dashboard preview**
- R7. The logged-in dashboard must include a compact FAQ preview section.
- R8. The dashboard preview must show no more than seven published FAQ items.
- R9. The dashboard preview must provide a clear path to the full FAQ page.

**FAQ groups**
- R10. Admins must be able to create, edit, delete, and reorder FAQ groups.
- R11. FAQ groups must have admin-controlled display names.
- R12. FAQ group ordering must influence the public FAQ page display order.

**FAQ items**
- R13. Admins must be able to create, edit, delete, and reorder FAQ items.
- R14. Each FAQ item must remain structurally limited to a question and answer, plus management metadata such as group, order, and publish state.
- R15. Admins must be able to publish and unpublish FAQ items.
- R16. Unpublished FAQ items must not appear on the public FAQ page or dashboard preview.
- R17. FAQ answers may use rich formatting while remaining part of a single Q&A item.
- R18. FAQ item ordering must influence both the full FAQ page and the dashboard preview.

**FAQ CSV import**
- R19. Admins must be able to import FAQ content from CSV.
- R20. The CSV import must support group name, question, and answer as the content-bearing fields.
- R21. Uploading or submitting a CSV must produce a preview before any FAQ content is written.
- R22. The preview must distinguish rows that will create new groups, create new FAQ items, update existing FAQ items, or fail validation.
- R23. If a CSV row references a group name that does not exist, confirming the import must create that group.
- R24. If a CSV row matches an existing FAQ item, confirming the import must update that existing FAQ item instead of creating a duplicate.
- R25. Imported new FAQ items must not become publicly visible until an admin publishes them through the admin UI.
- R26. CSV import must not control FAQ publish state or display ordering.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a visitor is not logged in, when they open the full FAQ page, they can read published FAQ items and cannot see unpublished FAQ items.
- AE2. **Covers R4, R5, R6.** Given published FAQs exist in multiple groups, when a user searches for a keyword, matching Q&A items are shown with their group context.
- AE3. **Covers R7, R8, R9.** Given more than seven FAQs are published, when a logged-in user opens the dashboard, only the first seven published FAQs appear and a link to the full FAQ page is available.
- AE4. **Covers R10, R11, R12.** Given an admin changes group names or ordering, when users view the FAQ page, the group labels and ordering reflect the admin's changes.
- AE5. **Covers R13, R14, R15, R16.** Given an admin creates a FAQ item but leaves it unpublished, when public visitors or logged-in users browse FAQs, that item does not appear until it is published.
- AE6. **Covers R17.** Given an admin writes an answer with rich formatting, when users view the FAQ, the answer renders as formatted content inside the Q&A item rather than as a separate article.
- AE7. **Covers R18.** Given an admin reorders published FAQ items, when users view the FAQ page or dashboard preview, the visible item order follows the admin-defined order.
- AE8. **Covers R19, R20, R21, R22.** Given an admin submits a CSV with valid and invalid FAQ rows, when they preview the import, no FAQ content is written and the preview shows which rows can be created, updated, or need correction.
- AE9. **Covers R23.** Given a valid CSV row references a new group name, when the admin confirms the import, that group is created and the imported FAQ item is assigned to it.
- AE10. **Covers R24.** Given a CSV row matches an existing FAQ item, when the admin confirms the import, the existing item is updated instead of creating a duplicate FAQ.
- AE11. **Covers R25, R26.** Given a CSV creates a new FAQ item, when the import is confirmed, the item remains hidden from the public FAQ page and dashboard preview until an admin publishes it manually.

---

## Success Criteria

- Public visitors and logged-in users can find short recurring answers without needing to browse full guide content.
- Admins can keep FAQ content current through simple group and Q&A management with publish control.
- Admins can bulk onboard or refresh FAQ content through CSV without manually creating each item.
- The dashboard gains useful help content without crowding out estimate history and primary estimate actions.
- Planning can proceed without inventing whether FAQs are public, whether dashboard content is capped, whether grouping is fixed or admin-managed, whether answers are rich, whether FAQ items become article pages, or how CSV import should affect groups, duplicates, publish state, and ordering.

---

## Scope Boundaries

- No user-submitted questions.
- No per-user personalized FAQ content.
- No separate FAQ detail/article pages.
- No FAQ analytics, voting, or "was this helpful?" feedback.
- No separate FAQ sets for public visitors and logged-in users.
- No replacement of existing Panduan guide content.
- No requirement for images, embeds, or guide-style long-form layouts in FAQ answers.
- No XLSX import in the first version; CSV is enough.
- No AI-generated FAQ creation as part of import.
- No bulk delete, archive, or unpublish behavior through CSV.
- No CSV-controlled publish status or sort order.

---

## Key Decisions

- Use one shared FAQ set: Public visitors and logged-in users should see the same published answers to avoid content drift.
- Cap dashboard preview at seven: The dashboard should provide fast help while keeping estimate history and estimate creation as the primary focus.
- Make groups admin-managed: The content structure may evolve with real user questions, so fixed categories are too rigid.
- Keep FAQ items structurally Q&A-only: Rich formatting is allowed inside answers, but the product should not become a second guide/article system.
- Include publish control: Admins need to draft or temporarily hide answers without deleting them.
- Use preview before confirm for CSV import: Bulk writes are risky enough that admins need a safety step before content changes.
- Let CSV create missing groups: Admins should be able to define FAQ structure while importing a larger content set.
- Update matching FAQ items on import: Repeated imports should refresh existing answers instead of creating duplicate questions.
- Keep publish state and ordering out of CSV: Visibility and display priority should remain intentional admin UI actions after import.

---

## Dependencies / Assumptions

- Admin-only access control remains available for content management.
- Rich answer formatting should be safe for public rendering and constrained enough to preserve the Q&A experience.
- The implementation can choose the exact search behavior as long as it covers questions and answers and remains understandable with grouped results.
- The implementation can choose the exact duplicate matching rule as long as repeated imports update the intended FAQ item instead of creating duplicate questions.
- Imported groups can receive default ordering until admins reorder them manually.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5, R6][Technical] Should search happen client-side for the loaded FAQ list or server-side through a query path?
- [Affects R10, R13, R18][Technical] How should ordering work when a FAQ group is deleted or a FAQ item moves between groups?
- [Affects R17][Technical] What rich formatting mechanism best fits the existing content and security constraints?
- [Affects R19, R21, R22][Technical] What is the clearest preview UI shape within the existing FAQ admin page?
- [Affects R24][Technical] Should duplicate matching use normalized question globally, normalized question within group, or another stable identity?
