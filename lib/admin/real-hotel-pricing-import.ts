import { parse } from "csv-parse/sync"
import type { DB } from "@/lib/db"
import { realHotelPrices } from "@/lib/db/schema"
import { ROOM_TYPES } from "@/lib/estimate/room-types"
import type { City, HotelTier, RoomType } from "@/types"
import { MONTH_COLUMNS, normalizeHotelPricingImportKey, parsePositiveInteger } from "./hotel-pricing-import"

// Real-price catalogs are transcribed into the hotel-pricing CSV shape (city, tier, label, month
// columns), but interpreted differently from the estimate import: prices land in real_hotel_prices,
// rows attach to EXISTING hotels only (unmatched rows are reported, never created), every write
// carries a batch-level sourceLabel, and — unlike the estimate parser — only months whose cell is
// explicitly filled become real prices (no base back-fill), so U3's per-month fallback to the
// estimate stays meaningful for months a catalog doesn't cover.

const CITIES: City[] = ["MAKKAH", "MADINAH"]
const TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const REQUIRED_HEADERS = ["city", "tier", "label"] as const

// `room_type` is deliberately NOT required. Catalogs transcribed before room-type pricing existed
// (and the shipped template) carry no such column, and must keep importing unchanged — an omitted
// or empty cell means QUAD, the basis every earlier real price was quoted in.
const DEFAULT_ROOM_TYPE: RoomType = "QUAD"

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
  roomType: RoomType
  sarPerNight: number
  sourceLabel: string
}

export interface RealPricingImportPlan {
  rowsParsed: number // data rows read from the CSV (excludes header) — lets callers enforce a row cap
  upserts: RealPriceUpsert[]
  hotelsMatched: number // distinct existing hotels that received ≥1 real month
  unmatched: Array<{ rowNumber: number; label: string }> // parsed rows with no existing hotel
  rowErrors: Array<{ rowNumber: number; errors: string[] }>
  fileErrors: string[]
}

const EMPTY_PLAN = (fileErrors: string[]): RealPricingImportPlan => ({
  rowsParsed: 0,
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

  // Keyed by (hotel, month, roomType) so a catalog listing the same room twice resolves to one
  // write instead of two upserts racing on the same unique key. Last row wins, matching the
  // upsert semantics in applyRealHotelPricing.
  const upsertsByKey = new Map<string, RealPriceUpsert>()
  const matched = new Set<string>()
  const unmatched: Array<{ rowNumber: number; label: string }> = []
  const rowErrors: Array<{ rowNumber: number; errors: string[] }> = []

  records.forEach((record, index) => {
    const rowNumber = index + 2 // header is row 1
    const city = (record.city ?? "").trim().toUpperCase() as City
    const tier = (record.tier ?? "").trim().toUpperCase() as HotelTier
    const label = (record.label ?? "").trim()
    const rawRoomType = (record.room_type ?? "").trim()

    const errors: string[] = []
    if (!CITIES.includes(city)) errors.push(`invalid city "${record.city ?? ""}"`)
    if (!TIERS.includes(tier)) errors.push(`invalid tier "${record.tier ?? ""}"`)
    if (!label) errors.push("label is required")

    // An unrecognised abbreviation (the catalogs print "DBL"/"TRPL") must surface as an error —
    // coercing it to the default would silently overwrite the hotel's quad rate with a double one.
    const roomType = rawRoomType === "" ? DEFAULT_ROOM_TYPE : (rawRoomType.toUpperCase() as RoomType)
    if (!ROOM_TYPES.includes(roomType)) errors.push(`invalid room_type "${rawRoomType}"`)

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
      // Reuse the estimate importer's parser so the admin's familiar CSV conventions hold:
      // thousands separators accepted ("1,300" → 1300), non-plain-integer formats rejected.
      const sar = parsePositiveInteger(cell)
      if (sar == null) {
        errors.push(`invalid ${column} "${cell}"`)
        continue
      }
      upsertsByKey.set(`${existing.id}:${month}:${roomType}`, {
        hotelPriceId: existing.id,
        month,
        roomType,
        sarPerNight: sar,
        sourceLabel,
      })
      matched.add(existing.id)
      monthCount++
    }

    if (errors.length > 0) rowErrors.push({ rowNumber, errors })
    else if (monthCount === 0) rowErrors.push({ rowNumber, errors: ["no real month prices provided"] })
  })

  return {
    rowsParsed: records.length,
    upserts: [...upsertsByKey.values()],
    hotelsMatched: matched.size,
    unmatched,
    rowErrors,
    fileErrors: [],
  }
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0]

// Apply the plan: upsert each (hotelPriceId, month, roomType) so overlapping catalogs update their
// own months without wiping the others, and a catalog covering only DOUBLE leaves the hotel's QUAD
// rates intact. Returns the number of real rows written.
export async function applyRealHotelPricing(tx: Tx, plan: RealPricingImportPlan): Promise<number> {
  if (plan.upserts.length === 0) return 0
  const now = new Date()
  for (const u of plan.upserts) {
    await tx
      .insert(realHotelPrices)
      .values({
        hotelPriceId: u.hotelPriceId,
        month: u.month,
        roomType: u.roomType,
        sarPerNight: u.sarPerNight,
        sourceLabel: u.sourceLabel,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [realHotelPrices.hotelPriceId, realHotelPrices.month, realHotelPrices.roomType],
        set: { sarPerNight: u.sarPerNight, sourceLabel: u.sourceLabel, updatedAt: now },
      })
  }
  return plan.upserts.length
}
