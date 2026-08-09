import type { City, HotelTier, RoomType } from "@/types"

/**
 * The pricelist's shared vocabulary, split out of lib/hotels/pricelist.ts so a
 * client component can reach it.
 *
 * The split is a bundling boundary, not a taste preference. pricelist.ts
 * value-imports `db`, which constructs a pg Pool at module scope; a "use client"
 * module importing anything from it -- even a single string constant -- pulls pg
 * into the browser graph and the build fails outright on `fs`/`net`/`dns`.
 * `serverComponentsExternalPackages: ["pg"]` does not help: it governs the
 * server compilation only.
 *
 * A type-only import would satisfy the compiler but still ship drizzle-orm and
 * the schema module to the client, so the runtime value SOURCE_LABEL_NOT_RECORDED
 * lives here rather than being re-imported as a type.
 *
 * Nothing in this file may import @/lib/db, directly or transitively. The R9
 * import scan in app/(dashboard)/pricelist-hotel/__tests__/page.test.tsx pins
 * that.
 */

/**
 * Shown in place of a blank source_label. Rows imported before that column
 * existed carry "" -- a live value, not a bug -- and rendering it raw leaves a
 * hole where the provenance should be. The sentinel says "we do not know",
 * which is the honest reading.
 */
export const SOURCE_LABEL_NOT_RECORDED = "Sumber tidak tercatat"

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
 * Price-ascending, the canonical sequence used by
 * components/hotel-nusuk/HotelPriceList.tsx. Alphabetical sorting would read
 * ECONOMY, PELATARAN, PREMIUM, STANDARD -- which puts the two dearest tiers in
 * the middle and contradicts every other hotel surface in the app.
 *
 * Exported so the composed sort order and the client's tier filter read the
 * same list; two copies that must agree with nothing binding them is how the
 * filter ends up offering a tier the pivot cannot order.
 */
export const TIER_ORDER: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

/** Makkah first, matching HotelFilters and HotelPriceList. */
export const CITY_ORDER: City[] = ["MAKKAH", "MADINAH"]
