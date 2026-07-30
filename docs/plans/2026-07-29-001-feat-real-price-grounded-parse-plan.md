---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
type: feat
product_contract_source: ce-plan-bootstrap
title: Optional real-price-grounded estimate parsing
date: 2026-07-29
reviewed: 2026-07-29
---

# Optional real-price-grounded estimate parsing

## Goal Capsule

Add **one optional flow** to the existing estimate parser: when the operator turns it on, the
AI can query actual supplier rates from `real_hotel_prices` while choosing hotels, instead of
guessing from a static list.

Everything downstream is unchanged. Same `EstimateParams` output, same validation, same
deterministic corrections, same estimator, same WhatsApp export. With the toggle off, the parse
path is byte-identical to today.

The defect this fixes: `buildSystemPrompt` sends the model a `real=catalog` **boolean flag**
per hotel and nothing else (`lib/ai/prompt.ts:78-90`). Actual month × room-type rates are
resolved deterministically *after* the model has already picked (`lib/estimate/hotel-pricing.ts:25-46`).
So the model chooses hotels without ever seeing what they cost in the requested month — it can
prefer a catalogue-priced hotel, but it cannot prefer a *cheaper* one, or notice that the
operator's budget rules out its first choice.

## Product Contract

### Requirements

- **R1** — When enabled, the parser can look up real catalogue rates for a hotel by month and
  room type, and choose hotels using those numbers.
- **R2** — When enabled, the parser can shortlist hotels by the criteria operators actually
  state: city, tier, price ceiling, distance to Haram/Nabawi.
- **R3** — The operator turns this on per request, next to the existing parse button. Off is
  the default.
- **R4** — With the toggle off, `/api/estimate/parse` behaves exactly as today. Same output
  contract, same corrections, same latency.
- **R5** — The operator can see that the enhanced path ran and which prices it used, so a
  surprising hotel choice is explainable rather than mysterious.
- **R6** — The enhanced path's extra cost is logged and capped per user.

### Actors

- **A1 — Admin/CS operator.** Under time pressure, sharing quotes with serious customers over
  WhatsApp. Uses the fast path by default; reaches for the accurate one when the answer matters.

### Acceptance examples

- **AE1** — "hotel Madinah bintang 4 di bawah 900 SAR bulan Maret, jalan kaki ke Nabawi", toggle
  on → the chosen `madinahHotelId` is a hotel whose month-3 catalogue rate is actually under 900
  SAR, and the notes name the rate and its `source_label`.
- **AE2** — Same input, toggle off → today's behaviour, unchanged, at today's speed.
- **AE3** — A request whose month has no catalogue coverage → the parser still returns valid
  params, and a note says the choice used estimate rates, not catalogue rates.
- **AE4** — A budget no hotel satisfies → the parser says so in the notes rather than silently
  returning the cheapest available as if it qualified.

## Planning Contract

### KTD1 — The enhanced path is additive; the existing path is untouched

`parseEstimate` gains an option. When it is off, the function takes exactly the code path it
takes today — same prompt, same single-shot call, same model. The enhanced path is a branch, not
a rewrite, so R4's guarantee is structural rather than a promise to be careful.

**What stays shared and must not fork:** `validateParams`, `applyDeterministicCorrections`,
`dropImpossibleTransportLegs`, `extractTotalTripDays`, `expandRetiredServices`, and hotel-ID
validation all run on the result of either path (`lib/ai/parse.ts:182-322`). The enhanced path
produces the same `EstimateParams` shape and inherits every correction. This is the single
biggest reason this shape is better than a chat surface: those corrections assume one complete
params object from one input string, and here they still get exactly that.

### KTD2 — Tools replace the inline catalogue only on the enhanced path

Today `buildDynamicPricingBlock` inlines all 111 hotels (`lib/ai/prompt.ts:67-102`), uncached,
on every call. On the enhanced path the model instead calls `cari_hotel` / `harga_hotel`, which
is what makes month-specific rates reachable at all.

**The trade:** inline, the model sees all 111 rows at once and can reason over the whole set. Via
a capped tool it sees a slice — worse for superlatives ("the cheapest") unless the tool reports
that it truncated. U2 requires that reporting; without it, a confidently wrong "cheapest" is
indistinguishable from a correct one.

`lib/ai/prompt.ts` is not modified. The enhanced path gets its own prompt builder.

### KTD3 — `source_label` must be lifted into `PricingConfig`

`fetchPricingConfig` flattens real prices to `realByHotelId[hotelId][month][roomType] = sarPerNight`
— a bare number (`lib/budget/calculate.ts:226-238`) — while `sourceLabel` lives only on the
`real_hotel_prices` row (`lib/db/schema.ts:163`) and is dropped during assembly.

R5 and AE1 both need that label, so widen the map to carry `{sarPerNight, sourceLabel}` per
`(month, roomType)` and have `resolveHotelSar` return it too. Doing this in `PricingConfig`
rather than a second query is what keeps tools and calculator on one shape — a separate query
would be free to drift.

### KTD4 — `roomTypePriced`, not `source`, is the flag that matters

`resolveHotelSar` returns both (`lib/estimate/hotel-pricing.ts:25-46`). A catalogue rate already
encodes its room type, so `calculate.ts:87-88` sets the multiplier to 1 when `roomTypePriced` is
true — applying the global ratio on top would double-price it (a DOUBLE would come out ~30% low).

Three outcomes must stay distinguishable: an exact `(month, roomType)` hit, a QUAD fallback, and
an estimate-only rate. The tool returns the distinction and the notes must carry it — a flag the
operator never sees is the same as no flag.

### KTD5 — The SDK upgrade is a prerequisite

`@anthropic-ai/sdk@0.36.3` is installed; `0.115.0` is current, and
`node_modules/@anthropic-ai/sdk/helpers/` does not exist — no tool runner, no `betaZodTool`.
The existing code already works around the age of the types with a `@ts-expect-error` at
`lib/ai/parse.ts:339`. A ~79-minor-version jump can move the surface `parse.ts` depends on, so
it is sequenced first with its own verification.

### KTD6 — Latency is the real risk, and it is bounded by the toggle

The enhanced path runs a tool loop, so it is slower than today's single call — plausibly tens of
seconds against ~3-5s. No streaming is added: the request/response shape is unchanged, and the
UI already has a loading state on the parse button.

What this needs instead of streaming is honesty about the ceiling. Bound the tool-loop iteration
count, keep the operator's expectation set at the toggle (Q1 fixes the copy), and confirm the
deployed path tolerates the longer request — production is `output: 'standalone'` in Docker
behind Dokploy's Traefik proxy, where an idle timeout, not the handler, decides.

Web search is deliberately absent. Public listings are retail prices; they cannot become a line
in a quote, so they would add trust-boundary machinery (untrusted content in the same context as
supplier pricing) for no reachable benefit.

## Implementation Units

### U1. Upgrade the Anthropic SDK

**Goal:** Move `@anthropic-ai/sdk` from `0.36.3` to `0.115.x` without regressing the estimator.
**Requirements:** prerequisite for R1-R2 (per KTD5); constrained by R4. **Dependencies:** none.
**Files:**
- `package.json`, `pnpm-lock.yaml`
- `lib/ai/parse.ts` (drop the `@ts-expect-error` at `:339`)
- `lib/ai/__tests__/parse.test.ts` (the SDK is mocked — confirm the mock still matches)

**Approach:** Upgrade, then reconcile `parse.ts`. `budget_tokens` is **removed** on current
models (400 if sent); `thinking: {type: "disabled"}` is still valid on `claude-sonnet-5`, which
is what `parse.ts` already passes — so the call should survive, but the types around it change.
Do not change the model or add thinking in this unit.

**Test scenarios:**
- The full existing parse suite passes unchanged — the regression gate for R4.
- `node_modules/@anthropic-ai/sdk/helpers/beta/zod` resolves (proves the tool-runner surface
  landed, rather than assuming the version bump implies it).
- Before removal, `npx tsc --noEmit` flags the `@ts-expect-error` at `lib/ai/parse.ts:339` as
  **unused** — that error is the signal the types caught up. After removing it, `tsc` reports no
  error in the file.

**Verification:** `npx vitest run` at the pre-existing baseline; `npx tsc --noEmit` with no new
error sources. One live `/api/estimate/parse` call — the SDK mock cannot catch a wire-format
change.

### U2. Price-lookup tools over the real-price layer

**Goal:** Two tools that let the model search the catalogue and read actual month × room-type rates.
**Requirements:** R1, R2. **Dependencies:** U1.
**Files:**
- `lib/ai/tools/hotel-search.ts`, `lib/ai/tools/hotel-price.ts` (new)
- `lib/budget/calculate.ts` (`fetchPricingConfig` carries `sourceLabel` — KTD3)
- `lib/estimate/hotel-pricing.ts` (`resolveHotelSar` returns `sourceLabel`)
- `types/index.ts` (`realMonthlyPrices` value shape)
- `lib/ai/parse.ts` (**export** `distanceScore` and its `extractDistanceMeters` helper, or
  extract both to a shared module — they are currently module-private)
- `lib/ai/tools/__tests__/hotel-search.test.ts`, `.../hotel-price.test.ts` (new)

**Approach:** Both tools read the widened `PricingConfig`, so neither needs its own query once
KTD3 lands.

`cari_hotel` filters `pricing.hotelOptions[city]` by tier, SAR ceiling, distance, and
has-real-price-for-month. **Each returned row carries its resolved rate for the requested month
plus `source_label`** — AE1 needs that on the shortlist itself. Reuse `distanceScore` rather than
re-parsing the free-text `distance` strings; it already handles km/m/minutes-walk plus the
`pelataran`/`ring 1` keyword floors, and a second parser would drift. Exporting it touches
`parse.ts`, so the existing parse suite is the R4 guard on that refactor.

Cap result size and **return `total_matches` and `truncated: boolean`** (KTD2).

`harga_hotel` resolves one hotel across requested months and room types, returning KTD4's three
outcomes explicitly plus `source_label`.

**Patterns to follow:** `lib/estimate/hotel-pricing.ts` (`resolveHotelSar`'s four-step ladder and
`roomTypePriced` semantics); `lib/ai/parse.ts:59-106` (`distanceScore`, `pickPreferringReal`).

**Test scenarios:**
- A hotel with a real price for the asked month and room type returns it, tagged `source: "real"`
  with its `source_label` (Covers R1).
- A hotel with only a QUAD real price, asked for TRIPLE, returns the QUAD rate **flagged as a
  fallback** — not silently as the TRIPLE rate. The KTD4 guard.
- A hotel with no real price for that month returns the estimate rate marked as not
  catalogue-backed (Covers AE3).
- The tool's price for a given (hotel, month, roomType) equals what `resolveHotelSar` returns —
  the anti-divergence guard.
- A multi-criteria search returns rows each carrying month rate and `source_label` (Covers R2, AE1).
- An over-cap query sets `truncated: true` with a `total_matches` above the row count.
- `cari_hotel` respects the SAR ceiling and tier filter, and ranks a walking-distance hotel above
  a shuttle hotel at equal price.
- A city/tier served only by synthetic `fallbackHotelOptions` returns `total_matches: 0` rather
  than a synthetic option — the D3 guard, and the reason an unpriced choice can't slip through.

**Verification:** unit tests over a `PricingConfig` fixture; no live API. Plus the existing parse
suite, which guards the `distanceScore` export refactor.

### U3. The enhanced parse path

**Goal:** `parseEstimate` gains a tool-enabled branch, off by default.
**Requirements:** R1, R2, R4, R6. **Dependencies:** U1, U2.
**Files:**
- `lib/ai/parse.ts` (the branch)
- `lib/ai/enhanced-prompt.ts` (new — separate from `lib/ai/prompt.ts`, per KTD2)
- `lib/ai/parse-usage.ts` (new — cap query + `activityLogs` write)
- `app/api/estimate/parse/route.ts` (accept and gate the flag)
- `lib/ai/__tests__/enhanced-parse.test.ts` (new)

**Approach:** `parseEstimate(input, pricing, { enhanced })`. When `enhanced` is false the
function takes today's path unchanged — same prompt builder, same single-shot call. When true it
uses the tool runner with U2's tools and `lib/ai/enhanced-prompt.ts`, then hands the result to
the **same** `validateParams` → `applyDeterministicCorrections` pipeline (KTD1).

**Model config for the enhanced branch (per D1):** `claude-sonnet-5`,
`thinking: {type: "adaptive"}`, `output_config: {effort: "medium"}`, `max_tokens: 8000`. Three
traps here, all silent:
- The normal path passes `thinking: {type: "disabled"}`. The enhanced branch **must not inherit
  it** — Sonnet 5 with thinking off is measurably less willing to call tools, which would leave
  the branch running the expensive path and producing the cheap path's answer.
- `max_tokens` caps thinking *plus* text, so the normal path's 1024 truncates mid-JSON once
  adaptive thinking is on. The failure looks like a parse error, not a token limit.
- `cari_hotel` returning `total_matches: 0` is a real answer (per D3), not an error — the prompt
  must require the model to say so and fall back to tier selection with a note.

Bound the tool loop with a maximum iteration count (KTD6). Handle `stop_reason: "refusal"` before
reading `content`.

**Auth: the enhanced flag needs an ADMIN check at the route.** Today
`app/api/estimate/parse/route.ts:9-12` gates on *any signed-in user* while the page hides the
estimator behind an admin check — an asymmetry that is harmless for the cheap path and not for
the expensive one. Do **not** use `lib/auth.ts`'s `requireAdmin()`: it calls `redirect()`, which
in a route handler produces a 307. Use the local status-returning pattern from
`app/api/admin/hotels/route.ts`.

**Cap and log.** Count the user's enhanced-parse `activityLogs` rows for the current UTC day — no
new table, and it survives container churn as an in-memory counter would not (there is no Redis
in `package.json`). **25 per operator per day** (D2). Write the usage row on success *and* on
error, matching the route's existing both-paths logging.

**Patterns to follow:** `app/api/estimate/parse/route.ts` (auth gate, 5000-char input cap,
`activityLogs` write on both paths); `app/api/admin/hotels/route.ts` (status-returning guard).

**Test scenarios:**
- With the flag off, the enhanced code path is never entered and output matches today's
  (Covers R4, AE2). This is the regression gate.
- With the flag on, a params object that came from tools still passes through
  `applyDeterministicCorrections` — e.g. an impossible five-leg transport answer is still reduced
  to three (Covers KTD1).
- A non-admin signed-in user requesting `enhanced: true` gets **403** — not 200, not a redirect.
- A non-admin requesting the normal path still gets 200 (the existing contract is not tightened).
- A user over the cap is rejected before the API call, and the refusal is logged.
- An errored enhanced call still writes a usage row.
- The tool loop terminates at its iteration bound rather than running unbounded.
- The enhanced prompt contains no hotel list — the KTD2 guard.
- The enhanced branch sends `thinking: {type: "adaptive"}` and `max_tokens` well above 1024 —
  it must not inherit the normal path's `disabled`/1024, which would silently produce a
  no-tool answer or a truncated one (D1).
- A search returning `total_matches: 0` still yields valid params plus a note saying the choice
  used estimate rates, not catalogue rates (Covers AE3, D3).

**Verification:** unit tests with a mocked SDK, plus route tests following
`app/api/admin/pricing/__tests__/service-route.test.ts` (drives the real handler). Then one live
enhanced parse and one live normal parse, compared.

### U4. The toggle and its explanation

**Goal:** The operator can turn the path on and see what it did.
**Requirements:** R3, R5. **Dependencies:** U3.
**Files:**
- `components/estimator/InputPanel.tsx` (the toggle)
- `components/estimator/EstimatorClient.tsx` (thread the flag through `handleParse` at `:293`)
- `components/estimator/__tests__/InputPanel.test.tsx`

**Approach:** A checkbox beside the existing parse button, off by default. Copy is settled in D4:
label **"Pakai harga katalog (lebih lambat)"**, helper **"Hotel dipilih dari tarif katalog asli
untuk bulan yang diminta. Berguna saat ada batas budget atau bulan tertentu. Perlu ~15-20
detik."** The seconds are in the label deliberately — an operator who does not expect a longer
wait reads it as a hang and reloads, which costs a capped call for nothing.

**R5 rides on the existing notes channel.** The parser already returns `notes` that the estimator
displays, so the enhanced path adds notes naming the rate it used and its `source_label`, plus
KTD4's fallback wording when a QUAD rate stood in for the asked room type. No new UI surface —
which also means no new place for the provenance to be dropped.

Do not put the flag in the estimator's reducer state alongside params: it is a request option,
not part of the estimate.

**Patterns to follow:** `components/estimator/InputPanel.tsx` (existing example chips and the
⌘/Ctrl+Enter submit path); `components/estimator/BudgetBreakdown.tsx` (provenance badge tones, if
the notes need visual weight).

**Test scenarios:**
- The toggle is off on first render, and a parse with it off sends no flag (Covers R3).
- Turning it on sends `enhanced: true` to the route.
- Enhanced notes naming a rate and `source_label` render in the existing notes area (Covers R5).
- A QUAD-fallback note renders its substitution wording rather than a bare rate (Covers KTD4).
- The toggle is absent for non-admins (the page already gates at
  `app/(dashboard)/estimate/new/page.tsx:41-45`; this asserts the gate still holds).

**Verification:** component tests, then a manual pass through AE1-AE4 against the live model.

## Verification Contract

| Unit | Gate |
|---|---|
| U1 | Existing parse suite green; `helpers/beta/zod` resolves; one live estimator call |
| U2 | Tool price == `resolveHotelSar` price for the same inputs; truncation reported |
| U3 | Flag off ⇒ output identical to today; non-admin with flag on gets **403** |
| U3 (deployed) | An enhanced parse completes on the VPS behind Traefik without an idle timeout |
| U4 | Toggle off by default; `source_label` reaches the notes the operator reads |

Suite baseline at planning time: **980 passed / 3 failed** — the 3 pre-existing failures are
2 date-dependent tests in `app/(public)/webinar-umroh-mandiri/` and 1 in `middleware.test.ts`.
Pre-existing `tsc` error sources: `app/api/admin/hotels/__tests__`, `app/api/admin/stories/__tests__`,
`lib/stats/__tests__/visitor-count.test.ts`, `.next/types/app/`.

## Definition of Done

- AE1-AE4 pass against the live model.
- With the toggle off, the existing parse suite passes unchanged and a live parse returns
  equivalent params (R4).
- An enhanced parse's hotel choice is explained in the notes by a rate and its `source_label` (R5).
- Enhanced calls are logged with token usage — including errored ones — and capped per user (R6).
- An enhanced parse completes on the deployed VPS, not only in dev.

## Scope Boundaries

Explicitly **not** in this plan:

- **A chat surface.** Considered and rejected: the operator's output is a quote, and a
  conversational surface would have required streaming, conversation state, and a second UI
  while still needing the answer retyped into the estimator to become one.
- **Web search.** Public listings are retail prices and cannot become a quote line, so the
  trust-boundary machinery they would require buys nothing here.
- **Changing `lib/ai/prompt.ts` or the existing single-shot path.** R4.
- **A usage dashboard.** Capping and logging live in U3, which is what R6 requires. A read-back
  UI is deferred until logged volume justifies it.
- **Persisting anything new.** No schema change; the cap counts existing `activityLogs` rows.

## Resolved Decisions

These were open at review time and are now settled. Each records the reasoning, because the
reasoning is what a later reader needs in order to overturn one responsibly.

### D1 — Model, thinking, and effort for the enhanced path

**`claude-sonnet-5`, `thinking: {type: "adaptive"}`, `output_config: {effort: "medium"}`,
`max_tokens: 8000`.**

Same model as the normal path. Choosing hotels from a shortlist under a budget constraint is
constrained selection over a few tool calls, not frontier reasoning; Opus 5 costs 1.7× on both
input and output for capability this task does not use.

**Thinking must be on, and this is not optional.** Sonnet 5 with thinking disabled is measurably
less willing to reach for tools — and tool use is the entire value of this path. The normal path
keeps `thinking: {type: "disabled"}`; the enhanced path must not inherit it.

**`max_tokens` must rise from 1024 to ~8000.** `max_tokens` caps thinking *plus* response text,
so leaving it at the normal path's value truncates the answer mid-JSON with adaptive thinking on.

Effort `medium` rather than the `high` default: latency is the operator-facing cost here, and
`medium` on Sonnet 5 is roughly Sonnet 4.6 at `high`. **Latency ceiling: 20 seconds.** If the
enhanced parse consistently exceeds it, drop to `effort: "low"` or tighten the tool-loop bound
before reaching for a larger model.

### D2 — Cap: 25 enhanced parses per operator per day

Rough per-call cost at D1's settings: the normal path is ~Rp 560; the enhanced path ~Rp 1.700,
so 3-5×. Expected real use is 5-15 enhanced parses a day, so 25 leaves 2-5× headroom while
bounding a runaway at ~Rp 42.000 per operator per day.

**This is a runaway guard, not a budget.** It exists so a stuck tool loop or an accidental
repeated submit cannot drain the account — not to ration normal work. Revisit from `activityLogs`
after two weeks of real use; if operators are hitting it during ordinary work, the number is
wrong, not their behaviour.

### D3 — The tool never returns synthetic tier options

`fallbackHotelOptions` (`lib/estimate/hotel-selection.ts`) builds synthetic options without
`realMonthlyPrices` (documented at `lib/estimate/hotel-pricing.ts:21-24`). Such an option has no
catalogue price *by construction*, so a path whose whole purpose is grounding in real rates must
not pick one silently.

`cari_hotel` returns only hotels from `hotelOptions`. When nothing matches it returns
`total_matches: 0`, and the enhanced prompt requires the model to say so and fall back to tier
selection with an explicit note. The existing pricing ladder still prices the estimate correctly;
what changes is that the gap becomes visible in the notes instead of disappearing.

### D4 — Toggle copy

Label: **"Pakai harga katalog (lebih lambat)"**

Helper text: **"Hotel dipilih dari tarif katalog asli untuk bulan yang diminta. Berguna saat ada
batas budget atau bulan tertentu. Perlu ~15-20 detik."**

It names what the path does rather than the mechanism, states the cost in seconds up front so a
longer wait reads as expected rather than as a hang, and says when it helps — without implying
the default path is wrong, because it usually is not.

## Open Questions

None blocking. Revisit D2's number after two weeks of logged use.
