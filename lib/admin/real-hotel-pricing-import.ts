import { parse } from "csv-parse/sync"
import type { DB } from "@/lib/db"
import { realHotelPrices } from "@/lib/db/schema"
import type { City, HotelTier } from "@/types"
import { MONTH_COLUMNS, normalizeHotelPricingImportKey } from "./hotel-pricing-import"

// Real-price catalogs are transcribed into the hotel-pricing CSV shape (city, tier, label, month
// columns), but interpreted differently from the estimate import: prices land in real_hotel_prices,
// rows attach to EXISTING hotels only (unmatched rows are reported, never created), every write
// carries a batch-level sourceLabel, and — unlike the estimate parser — only months whose cell is
// explicitly filled become real prices (no base back-fill), so U3's per-month fallback to the
// estimate stays meaningful for months a catalog doesn't cover.

const CITIES: City[] = ["MAKKAH", "MADINAH"]
const TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const REQUIRED_HEADERS = ["city", "tier", "label"] as const

export interface ExistingHotelRef {
  id: string
  city: City
  tier: HotelTier
  label: string
  importKey?: string | null
}

export interface RealPriceUpsert {
  hotelPriceId: string
  month: number
  sarPerNight: number
  sourceLabel: string
}

export interface RealPricingImportPlan {
  upserts: RealPriceUpsert[]
  hotelsMatched: number // distinct existing hotels that received ≥1 real month
  unmatched: Array<{ rowNumber: number; label: string }> // parsed rows with no existing hotel
  rowErrors: Array<{ rowNumber: number; errors: string[] }>
  fileErrors: string[]
}

const EMPTY_PLAN = (fileErrors: string[]): RealPricingImportPlan => ({
  upserts: [],
  hotelsMatched: 0,
  unmatched: [],
  rowErrors: [],
  fileErrors,
})

// Parse a transcribed real-price catalog CSV into a set of real_hotel_prices upserts. Pure: no DB.
export function parseRealHotelPricingCsv(
  csvText: string,
  existingHotels: ExistingHotelRef[],
  sourceLabel: string
): RealPricingImportPlan {
  const headers = new Set<string>()
  let records: Record<string, string>[]
  try {
    records = parse(csvText, {
      bom: true,
      columns: (raw: string[]) => {
        const trimmed = raw.map((h) => h.trim())
        for (const h of trimmed) headers.add(h)
        return trimmed
      },
      skip_empty_lines: true,
      trim: true,
    })
  } catch (error) {
    return EMPTY_PLAN([error instanceof Error ? error.message : "CSV could not be parsed"])
  }

  const fileErrors: string[] = []
  for (const header of REQUIRED_HEADERS) {
    if (!headers.has(header)) fileErrors.push(`Missing required header: ${header}`)
  }
  if (fileErrors.length > 0) return EMPTY_PLAN(fileErrors)

  const existingByKey = new Map<string, ExistingHotelRef>()
  for (const hotel of existingHotels) {
    existingByKey.set(hotel.importKey ?? normalizeHotelPricingImportKey(hotel), hotel)
  }

  const upserts: RealPriceUpsert[] = []
  const matched = new Set<string>()
  const unmatched: Array<{ rowNumber: number; label: string }> = []
  const rowErrors: Array<{ rowNumber: number; errors: string[] }> = []

  records.forEach((record, index) => {
    const rowNumber = index + 2 // header is row 1
    const city = (record.city ?? "").trim().toUpperCase() as City
    const tier = (record.tier ?? "").trim().toUpperCase() as HotelTier
    const label = (record.label ?? "").trim()

    const errors: string[] = []
    if (!CITIES.includes(city)) errors.push(`invalid city "${record.city ?? ""}"`)
    if (!TIERS.includes(tier)) errors.push(`invalid tier "${record.tier ?? ""}"`)
    if (!label) errors.push("label is required")
    if (errors.length > 0) {
      rowErrors.push({ rowNumber, errors })
      return
    }

    const existing = existingByKey.get(normalizeHotelPricingImportKey({ city, tier, label }))
    if (!existing) {
      unmatched.push({ rowNumber, label })
      return
    }

    let monthCount = 0
    for (const { month, column } of MONTH_COLUMNS) {
      const cell = (record[column] ?? "").trim()
      if (cell === "") continue // only explicitly-filled months become real prices
      const sar = Number(cell)
      if (!Number.isInteger(sar) || sar <= 0) {
        errors.push(`invalid ${column} "${cell}"`)
        continue
      }
      upserts.push({ hotelPriceId: existing.id, month, sarPerNight: sar, sourceLabel })
      matched.add(existing.id)
      monthCount++
    }

    if (errors.length > 0) rowErrors.push({ rowNumber, errors })
    else if (monthCount === 0) rowErrors.push({ rowNumber, errors: ["no real month prices provided"] })
  })

  return { upserts, hotelsMatched: matched.size, unmatched, rowErrors, fileErrors: [] }
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0]

// Apply the plan: upsert each (hotelPriceId, month) so overlapping catalogs update their own
// months without wiping the others. Returns the number of real rows written.
export async function applyRealHotelPricing(tx: Tx, plan: RealPricingImportPlan): Promise<number> {
  if (plan.upserts.length === 0) return 0
  const now = new Date()
  for (const u of plan.upserts) {
    await tx
      .insert(realHotelPrices)
      .values({
        hotelPriceId: u.hotelPriceId,
        month: u.month,
        sarPerNight: u.sarPerNight,
        sourceLabel: u.sourceLabel,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [realHotelPrices.hotelPriceId, realHotelPrices.month],
        set: { sarPerNight: u.sarPerNight, sourceLabel: u.sourceLabel, updatedAt: now },
      })
  }
  return plan.upserts.length
}
