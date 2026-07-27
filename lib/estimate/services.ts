import { SERVICE_KEYS, serviceRowKey } from "@/types"
import type { EstimateParams, ManualOverrides, RowOverride, ServiceKey } from "@/types"

// `estimates.params` is a JSONB snapshot re-costed at load, so it carries whatever service keys
// were valid the day it was written — including keys the catalogue has since retired. Postgres
// cannot drop an enum value either, so `service_key` still accepts them at the database layer.
// Both facts mean stored values must be resolved defensively rather than trusted, exactly as
// `resolveRoomMultiplier` does for the retired SINGLE room type.
//
// The danger is that this fails quietly: `calculateBudget` skips a key it cannot find in the
// pricing map without complaint, so an un-normalised TRANSPORT does not throw — it just silently
// drops the transport line out of the quote.

// A retired key expands to the keys that together mean what it used to mean. TRANSPORT was the
// "Full Rute" line, and the route its label implied is Makkah-first: land at Jeddah, go to Makkah,
// cross to Madinah, fly home from Jeddah. 400 + 550 + 550 = 1.500 SAR.
export const RETIRED_SERVICE_EXPANSIONS: Record<string, readonly ServiceKey[]> = {
  TRANSPORT: ["TRANSPORT_JED_MAKKAH", "TRANSPORT_MAKKAH_MADINAH", "TRANSPORT_MADINAH_JED"],
}

// The leg a retired composite's manual override lands on. The others are hidden rather than
// dropped so a hand-set transport price keeps meaning the same money (see below).
const OVERRIDE_TARGET_LEG: Record<string, ServiceKey> = {
  TRANSPORT: "TRANSPORT_JED_MAKKAH",
}

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === "string" && (SERVICE_KEYS as readonly string[]).includes(value)
}

// The per-leg road transfers, as opposed to the visa/ziyarah/muthowif services. Every leg key is
// named TRANSPORT_<FROM>_<TO> by construction, so the prefix is the definition rather than a
// guess — a service that is not a road leg must not be named that way.
export function isTransportLeg(value: unknown): value is ServiceKey {
  return isServiceKey(value) && value.startsWith("TRANSPORT_")
}

// A group flies into Jeddah once and out of Jeddah once, so one itinerary uses at most one arrival
// leg and at most one departure leg — never both alternatives from either pair. `TRANSPORT_MAKKAH_
// MADINAH` is the only inter-city leg and covers both directions, so it needs no pairing.
export const ARRIVAL_LEG_KEYS = ["TRANSPORT_JED_MAKKAH", "TRANSPORT_JED_MADINAH"] as const
export const DEPARTURE_LEG_KEYS = ["TRANSPORT_MAKKAH_JED", "TRANSPORT_MADINAH_JED"] as const

// Replace retired keys with what they stood for, and collapse duplicates so a list that already
// holds the legs passes through unchanged — applying this twice is a no-op. Everything else is
// left exactly as it was found, INCLUDING a value the catalogue has never known: at an input
// boundary that value must still reach the validator and be rejected there, because silently
// swallowing a typo'd key would drop a service out of a quote without anyone noticing.
export function expandRetiredServices(services: readonly unknown[] | undefined | null): unknown[] {
  if (!Array.isArray(services)) return []

  const out: unknown[] = []
  const seen = new Set<unknown>()
  const push = (key: unknown) => {
    if (seen.has(key)) return
    seen.add(key)
    out.push(key)
  }

  for (const raw of services) {
    const replacements = typeof raw === "string" ? RETIRED_SERVICE_EXPANSIONS[raw] : undefined
    if (replacements) {
      for (const replacement of replacements) push(replacement)
    } else {
      push(raw)
    }
  }

  return out
}

// The read-path version: expand retired keys, then drop anything the catalogue still does not
// know rather than throwing on it. A stored estimate is read-only history — it has to open and
// re-cost whatever it happens to contain, which is the same reason `resolveRoomMultiplier` falls
// back instead of failing. This is a general guard, not a TRANSPORT special case.
export function normaliseServices(services: readonly unknown[] | undefined | null): ServiceKey[] {
  return expandRetiredServices(services).filter(isServiceKey)
}

// Rewrite a stored params snapshot's service list for a read path. Typed params keep their type; a
// raw JSONB value that is not params-shaped is returned untouched, leaving validation to reject it.
export function normaliseStoredParams(params: EstimateParams): EstimateParams
export function normaliseStoredParams(params: unknown): unknown
export function normaliseStoredParams(params: unknown): unknown {
  return rewriteServices(params, normaliseServices)
}

// The input-boundary version: retired keys are rewritten, unknown ones are left in place for the
// validator that runs next.
export function expandRetiredStoredParams(params: EstimateParams): EstimateParams
export function expandRetiredStoredParams(params: unknown): unknown
export function expandRetiredStoredParams(params: unknown): unknown {
  return rewriteServices(params, expandRetiredServices)
}

function rewriteServices(params: unknown, rewrite: (services: unknown[]) => unknown[]): unknown {
  if (!params || typeof params !== "object" || Array.isArray(params)) return params
  const o = params as Record<string, unknown>
  if (!Array.isArray(o.services)) return params
  return { ...o, services: rewrite(o.services) }
}

// Manual override keys are `service:<KEY>` and validate against the same SERVICE_KEYS constant, so
// a stored `service:TRANSPORT` override would fail validation and its hand-set price would vanish
// from the quote without a word.
//
// The override moves onto the first leg rather than being discarded, because the money it carries
// is the operator's own figure. An override that sets an amount (or hides the row) also hides the
// other two legs: the retired key was ONE row with ONE price, so reproducing it as one priced leg
// plus two hidden ones keeps the displayed line and the total identical to what was saved. A
// label-only override carries no money, so it is copied across without touching the other legs.
export function normaliseStoredOverrides(overrides: ManualOverrides): ManualOverrides
export function normaliseStoredOverrides(overrides: unknown): unknown
export function normaliseStoredOverrides(overrides: unknown): unknown {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return overrides
  const o = overrides as Record<string, unknown>
  const map = o.overrides
  if (!map || typeof map !== "object" || Array.isArray(map)) return overrides

  const source = map as Record<string, RowOverride>
  const retired = Object.keys(source).filter(
    (key) => key.startsWith("service:") && OVERRIDE_TARGET_LEG[key.slice("service:".length)]
  )
  if (retired.length === 0) return overrides

  const next: Record<string, RowOverride> = { ...source }
  for (const key of retired) {
    const composite = key.slice("service:".length)
    const ov = next[key]
    delete next[key]
    if (!ov || typeof ov !== "object") continue

    // The leg already carries its own override, so the estimate has been edited since — the
    // retired entry is stale and the leg-level one wins. Nothing to hide.
    const targetKey = serviceRowKey(OVERRIDE_TARGET_LEG[composite])
    if (next[targetKey] !== undefined) continue
    next[targetKey] = ov

    const carriesMoney = ov.idr != null || ov.unitPrice != null || ov.hidden === true
    if (!carriesMoney) continue
    for (const leg of RETIRED_SERVICE_EXPANSIONS[composite] ?? []) {
      const legKey = serviceRowKey(leg)
      if (legKey === targetKey) continue
      if (next[legKey] === undefined) next[legKey] = { hidden: true }
    }
  }

  return { ...o, overrides: next }
}
