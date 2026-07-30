import { distanceScore } from "@/lib/estimate/hotel-distance"
import { FALLBACK_ROOM_TYPE, ROOM_TYPES } from "@/lib/estimate/room-types"
import { isValidMonth, resolveToolRate, type PriceBasis } from "@/lib/ai/tools/hotel-price"
import type { City, HotelTier, PricingConfig, RoomType } from "@/types"

// `cari_hotel`: shortlist hotels by the criteria an operator actually states — city, tier, a SAR
// ceiling, closeness to the Haram/Nabawi. Pure: it reads an already-built PricingConfig.
//
// Every row carries the rate it was filtered on plus its source_label, so the model can answer
// "hotel Madinah bintang 4 di bawah 900 SAR bulan Maret" from one call. A shortlist of bare names
// would force a second round-trip per candidate and lose the number the filter was applied to.
export const CARI_HOTEL_TOOL_NAME = "cari_hotel"

// A shortlist longer than this is not useful to the model and burns tokens. The cap is why the
// result also reports total_matches and truncated: a silently truncated list lets the model claim
// "the cheapest is X" with total confidence and no way for anyone to notice it was wrong.
export const CARI_HOTEL_DEFAULT_LIMIT = 8
export const CARI_HOTEL_MAX_LIMIT = 25

export interface CariHotelInput {
  city: City
  /** Priced for this month. Omit and rows fall back to the base estimate rate. */
  month?: number
  /** Defaults to QUAD. */
  room_type?: RoomType
  tier?: HotelTier
  /** Ceiling applied to the RESOLVED rate for the month, not to the base sarPerNight. */
  max_sar_per_night?: number
  /** Metres, compared against the parsed free-text distance. */
  max_distance_meters?: number
  /** Keep only hotels with a catalogue rate for the month (basis is not "estimate"). */
  require_real_price?: boolean
  limit?: number
}

export interface CariHotelRow {
  id: string
  label: string
  sublabel: string
  tier: HotelTier
  /** The raw catalogue text ("1.2 km shuttle"), so the model can quote it back verbatim. */
  distance: string
  /** distanceScore's comparable metres — the figure the ranking and the ceiling actually used. */
  distance_meters: number
  sar_per_night: number
  room_type: RoomType
  priced_room_type: RoomType
  basis: PriceBasis
  source: "real" | "estimate"
  room_type_priced: boolean
  source_label: string
}

export interface CariHotelResult {
  city: City
  month?: number
  room_type: RoomType
  /** Matches before the cap. Compare against rows.length before making any superlative claim. */
  total_matches: number
  truncated: boolean
  rows: CariHotelRow[]
}

export function cariHotel(pricing: PricingConfig, input: CariHotelInput): CariHotelResult {
  const roomType = input.room_type && ROOM_TYPES.includes(input.room_type) ? input.room_type : FALLBACK_ROOM_TYPE
  const month = isValidMonth(input.month) ? input.month : undefined
  const limit = Math.min(
    Math.max(Math.trunc(input.limit ?? CARI_HOTEL_DEFAULT_LIMIT), 1),
    CARI_HOTEL_MAX_LIMIT
  )

  // hotelOptions only — deliberately NOT resolveCityHotelOptions. That helper substitutes
  // fallbackHotelOptions for a city with no concrete hotels, and those synthetic tier options have
  // no realMonthlyPrices by construction (lib/estimate/hotel-pricing.ts:21-24). A tool whose whole
  // purpose is grounding in catalogue rates must not hand back an option that can never have one;
  // an empty result tells the caller to fall back to tier selection explicitly (D3).
  const options = pricing.hotelOptions?.[input.city] ?? []

  const matches = options
    .filter((hotel) => (input.tier ? hotel.tier === input.tier : true))
    .map((hotel) => {
      const rate = resolveToolRate(hotel, roomType, month)
      const row: CariHotelRow = {
        id: hotel.id,
        label: hotel.label,
        sublabel: hotel.sublabel,
        tier: hotel.tier,
        distance: hotel.distance ?? "",
        distance_meters: distanceScore(hotel),
        sar_per_night: rate.sar_per_night,
        room_type: rate.room_type,
        priced_room_type: rate.priced_room_type,
        basis: rate.basis,
        source: rate.source,
        room_type_priced: rate.room_type_priced,
        source_label: rate.source_label,
      }
      return row
    })
    .filter((row) => (input.max_sar_per_night != null ? row.sar_per_night <= input.max_sar_per_night : true))
    .filter((row) => (input.max_distance_meters != null ? row.distance_meters <= input.max_distance_meters : true))
    .filter((row) => (input.require_real_price ? row.basis !== "estimate" : true))
    // Cheapest first, closer wins a tie, then id for a stable order. Price leads so that truncation
    // cannot invalidate the one superlative the model is most likely to reach for: the head of the
    // list is the cheapest match whether or not the tail was cut.
    .sort((a, b) => {
      if (a.sar_per_night !== b.sar_per_night) return a.sar_per_night - b.sar_per_night
      if (a.distance_meters !== b.distance_meters) return a.distance_meters - b.distance_meters
      return a.id.localeCompare(b.id)
    })

  return {
    city: input.city,
    ...(month != null ? { month } : {}),
    room_type: roomType,
    total_matches: matches.length,
    truncated: matches.length > limit,
    rows: matches.slice(0, limit),
  }
}
