import {
  FLIGHT_ROW_KEY,
  HOTEL_MADINAH_ROW_KEY,
  HOTEL_MAKKAH_ROW_KEY,
  SERVICE_KEYS,
} from "@/types"
import type { ManualOverrides } from "@/types"

// Bounds on the client-supplied JSONB override object (stored raw in estimates.manual_overrides).
export const MAX_ROWS = 50
export const MAX_LABEL_LEN = 120
export const MAX_IDR = 2_147_483_647

export function arePersistableEstimateTotals(totalIdrPax: number, totalIdrGrp: number): boolean {
  return isValidIdr(totalIdrPax) && isValidIdr(totalIdrGrp)
}

const FIXED_ROW_KEYS = [HOTEL_MADINAH_ROW_KEY, HOTEL_MAKKAH_ROW_KEY, FLIGHT_ROW_KEY]
const OVERRIDE_FIELDS = new Set(["label", "idr", "unitPrice", "hidden", "autoIdrAtOverride"])
const CUSTOM_ROW_FIELDS = new Set(["id", "label", "idr"])
const TOP_LEVEL_FIELDS = new Set(["overrides", "customRows"])

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key))
}

function isCanonicalOverrideKey(key: string): boolean {
  if (FIXED_ROW_KEYS.includes(key)) return true
  if (key.startsWith("service:")) {
    return SERVICE_KEYS.includes(key.slice("service:".length) as (typeof SERVICE_KEYS)[number])
  }
  return false
}

function isValidIdr(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_IDR
}

function isValidLabel(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0 && v.length <= MAX_LABEL_LEN
}

function isValidRowOverride(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  if (!hasOnlyKeys(o, OVERRIDE_FIELDS)) return false
  if (o.label !== undefined && !isValidLabel(o.label)) return false
  if (o.idr !== undefined && !isValidIdr(o.idr)) return false
  if (o.unitPrice !== undefined && !isValidIdr(o.unitPrice)) return false
  // idr and unitPrice are mutually exclusive value sources (the UI clears one when setting the
  // other); reject a payload carrying both so a hand-crafted override can't desync the columns.
  if (o.idr !== undefined && o.unitPrice !== undefined) return false
  if (o.hidden !== undefined && typeof o.hidden !== "boolean") return false
  if (o.autoIdrAtOverride !== undefined && !isValidIdr(o.autoIdrAtOverride)) return false
  return true
}

function isValidCustomRow(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  return (
    hasOnlyKeys(o, CUSTOM_ROW_FIELDS) &&
    typeof o.id === "string" &&
    o.id.length > 0 &&
    o.id.length <= MAX_LABEL_LEN &&
    isValidLabel(o.label) &&
    isValidIdr(o.idr)
  )
}

// Validates the shape and bounds of a client-supplied override object at the API boundary.
// Mirrors validateEstimateParamsShape in ./params.ts.
export function validateManualOverrides(v: unknown): v is ManualOverrides {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  if (!hasOnlyKeys(o, TOP_LEVEL_FIELDS)) return false

  if (!o.overrides || typeof o.overrides !== "object" || Array.isArray(o.overrides)) return false
  if (!Array.isArray(o.customRows)) return false

  const overrideKeys = Object.keys(o.overrides as Record<string, unknown>)
  if (overrideKeys.length > MAX_ROWS) return false
  for (const key of overrideKeys) {
    if (!isCanonicalOverrideKey(key)) return false
    if (!isValidRowOverride((o.overrides as Record<string, unknown>)[key])) return false
  }

  const customRows = o.customRows as unknown[]
  if (customRows.length > MAX_ROWS) return false
  for (const row of customRows) {
    if (!isValidCustomRow(row)) return false
  }
  const ids = customRows.map((r) => (r as { id: string }).id)
  if (new Set(ids).size !== ids.length) return false // reject duplicate custom-row ids

  return true
}
