import { asc, eq } from "drizzle-orm"

import { db, type DB } from "@/shared/db"
import { hotelPrices, realHotelPrices } from "@/shared/db/schema"
import { ROOM_TYPES } from "@/shared/estimate/room-types"
import {
  CITY_ORDER,
  SOURCE_LABEL_NOT_RECORDED,
  TIER_ORDER,
  type PricelistHotel,
  type PricelistRow,
} from "@/shared/hotels/pricelist-types"
import type { RoomType } from "@/shared/types"

/**
 * The query half of the pricelist, plus the pure pivot over its rows.
 *
 * This module is server-only in effect: `db` is a value import, so anything
 * that reaches it drags pg into the graph. The shared vocabulary lives in
 * lib/hotels/pricelist-types.ts precisely so a "use client" module can import
 * the sentinel and the interfaces without that.
 *
 * Deliberately no re-export of those symbols. This file used to forward them,
 * which gave every one of them two import paths -- and the hazardous path was
 * the shorter, more obvious name. The client-boundary scan in
 * app/(dashboard)/pricelist-hotel/__tests__/page.test.tsx walks one file named
 * by a string literal, so it would not have caught the next client component
 * that reached for them here. One home per symbol is what actually holds the
 * split: pricelist-types.ts for the vocabulary, this file for the query and
 * the pivot.
 */

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
