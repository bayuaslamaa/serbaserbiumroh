import { asc, eq } from "drizzle-orm"

import { db, type DB } from "@/lib/db"
import { hotelPrices, realHotelPrices } from "@/lib/db/schema"
import { ROOM_TYPES } from "@/lib/estimate/room-types"
import type { City, HotelTier, RoomType } from "@/types"

/**
 * Shown in place of a blank source_label. Rows imported before that column
 * existed carry "" -- a live value, not a bug -- and rendering it raw leaves a
 * hole where the provenance should be. The sentinel says "we do not know",
 * which is the honest reading.
 */
export const SOURCE_LABEL_NOT_RECORDED = "Sumber tidak tercatat"

/**
 * Price-ascending, the canonical sequence used by
 * components/hotel-nusuk/HotelPriceList.tsx. Alphabetical sorting would read
 * ECONOMY, PELATARAN, PREMIUM, STANDARD -- which puts the two dearest tiers in
 * the middle and contradicts every other hotel surface in the app.
 */
const TIER_ORDER: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

/** Makkah first, matching HotelFilters and HotelPriceList. */
const CITY_ORDER: City[] = ["MAKKAH", "MADINAH"]

/** One catalogue rate, verbatim from real_hotel_prices. */
export interface PricelistRate {
  sarPerNight: number
  sourceLabel: string
}

/**
 * A joined catalogue row: the hotel's identity plus one rate.
 *
 * Deliberately carries no hotel_prices.sarPerNight. That column is the
 * estimate base, and this page promises catalogue figures only (R3) -- keeping
 * it out of the row type means a later widening of the select has to change
 * this contract first.
 */
export interface PricelistRow {
  hotelPriceId: string
  city: City
  tier: HotelTier
  label: string
  sublabel: string
  distance: string | null
  slug: string | null
  month: number
  roomType: string
  sarPerNight: number
  sourceLabel: string
  updatedAt: Date
}

export interface PricelistHotel {
  hotelPriceId: string
  city: City
  tier: HotelTier
  label: string
  sublabel: string
  distance: string | null
  slug: string | null
  /**
   * month (1-12) -> room type -> rate. Sparse on purpose: a month or a room
   * type with no catalogue row is ABSENT, never zero and never an empty
   * string. The page renders a miss as its empty-cell treatment (R4), so
   * anything that fabricates a value here defeats that.
   *
   * A plain object rather than a Map so the whole structure survives the
   * server-to-client boundary in U2 without a conversion step.
   */
  rates: Record<number, Partial<Record<RoomType, PricelistRate>>>
  /** Distinct labels present on this hotel's rates, for the legend (R5). */
  sourceLabels: string[]
  /** Newest updatedAt across this hotel's rows -- when it was last imported (R7). */
  updatedAt: Date
}

/**
 * Pivots joined catalogue rows into one entry per hotel.
 *
 * Pure, and kept apart from the query so the whole pivot -- the sparseness,
 * the tier order, the room-type guard -- is testable without a database, the
 * same split lib/hotels/detail.ts uses.
 */
export function composePricelist(rows: PricelistRow[]): PricelistHotel[] {
  const byHotel = new Map<string, PricelistHotel>()

  for (const row of rows) {
    // room_type is plain text, not a pgEnum, so a row can carry a value this
    // build does not know (a retired type, or a hand-inserted typo). Drop it
    // rather than publishing a column nothing can render -- same posture as
    // the real-price pivot in lib/budget/calculate.ts.
    const roomType = row.roomType as RoomType
    if (!ROOM_TYPES.includes(roomType)) continue

    // month is a plain integer column with no check constraint.
    if (!Number.isInteger(row.month) || row.month < 1 || row.month > 12) continue

    let hotel = byHotel.get(row.hotelPriceId)
    if (!hotel) {
      hotel = {
        hotelPriceId: row.hotelPriceId,
        city: row.city,
        tier: row.tier,
        label: row.label,
        sublabel: row.sublabel,
        distance: row.distance,
        slug: row.slug,
        rates: {},
        sourceLabels: [],
        updatedAt: row.updatedAt,
      }
      byHotel.set(row.hotelPriceId, hotel)
    }

    const sourceLabel = row.sourceLabel.trim() || SOURCE_LABEL_NOT_RECORDED

    // unique(hotelPriceId, month, roomType) at lib/db/schema.ts:166 means this
    // slot can only be written once per hotel.
    if (!hotel.rates[row.month]) hotel.rates[row.month] = {}
    hotel.rates[row.month][roomType] = { sarPerNight: row.sarPerNight, sourceLabel }

    if (!hotel.sourceLabels.includes(sourceLabel)) hotel.sourceLabels.push(sourceLabel)
    if (row.updatedAt > hotel.updatedAt) hotel.updatedAt = row.updatedAt
  }

  const hotels = [...byHotel.values()]
  for (const hotel of hotels) hotel.sourceLabels.sort((a, b) => a.localeCompare(b, "id-ID"))

  return hotels.sort(
    (a, b) =>
      CITY_ORDER.indexOf(a.city) - CITY_ORDER.indexOf(b.city) ||
      TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
      a.label.localeCompare(b.label, "id-ID")
  )
}

/**
 * Every catalogue rate, joined to the hotel it belongs to.
 *
 * Inner join, so a hotel with no rows in real_hotel_prices never reaches the
 * page (R2). The select is narrow by intent: hotel_prices.sarPerNight and
 * hotel_monthly_prices are the estimate layer, and the join is exactly how
 * they would leak onto a page that promises catalogue figures (R3).
 */
export async function fetchPricelistRows(database: DB = db): Promise<PricelistRow[]> {
  return database
    .select({
      hotelPriceId: hotelPrices.id,
      city: hotelPrices.city,
      tier: hotelPrices.tier,
      label: hotelPrices.label,
      sublabel: hotelPrices.sublabel,
      distance: hotelPrices.distance,
      slug: hotelPrices.slug,
      month: realHotelPrices.month,
      roomType: realHotelPrices.roomType,
      sarPerNight: realHotelPrices.sarPerNight,
      sourceLabel: realHotelPrices.sourceLabel,
      updatedAt: realHotelPrices.updatedAt,
    })
    .from(realHotelPrices)
    .innerJoin(hotelPrices, eq(realHotelPrices.hotelPriceId, hotelPrices.id))
    .orderBy(asc(hotelPrices.label), asc(realHotelPrices.month))
}
