import { resolveHotelSar } from "@/shared/estimate/hotel-pricing"
import { FALLBACK_ROOM_TYPE, ROOM_TYPES } from "@/shared/estimate/room-types"
import type { City, HotelOptionConfig, HotelPriceConfig, HotelTier, PricingConfig, RoomType } from "@/shared/types"

// `harga_hotel`: read the actual SAR/night for ONE hotel across the months and room types the
// model asks about. Pure — it reads an already-built PricingConfig and never touches the database,
// so the tool loop costs one function call, not one query per lookup.
//
// Field names are snake_case because this shape crosses the model boundary as JSON in both
// directions; the plan names `source_label`, `total_matches` and `truncated` that way, and mixing
// conventions inside one payload is how a model ends up guessing at a key.
export const HARGA_HOTEL_TOOL_NAME = "harga_hotel"

// The three outcomes of resolveHotelSar's ladder that KTD4 says must stay distinguishable:
//
//   catalogue_exact         the catalogue quoted THIS room type. room_type_priced is true, so the
//                           global room multiplier must NOT be applied (lib/budget/calculate.ts:87).
//   catalogue_quad_fallback the asked room type had no row and the QUAD rate stood in. Still a real
//                           catalogue number, but quoted per quad room — the multiplier still
//                           applies. Never present this as the asked type's rate.
//   estimate                no catalogue rate for that month at all. Not catalogue-backed; there is
//                           no source_label because there is no catalogue behind it.
export type PriceBasis = "catalogue_exact" | "catalogue_quad_fallback" | "estimate"

export interface ToolRate {
  /** Absent when no month was asked for — the base estimate is not a month's rate. */
  month?: number
  /** The room type that was asked for. */
  room_type: RoomType
  /** The room type the returned rate actually describes — QUAD on a fallback, else `room_type`. */
  priced_room_type: RoomType
  sar_per_night: number
  basis: PriceBasis
  /** Passthrough of resolveHotelSar: which pricing layer produced the rate. */
  source: "real" | "estimate"
  /**
   * Passthrough of resolveHotelSar. True only for `catalogue_exact`. The flag calculate.ts reads to
   * decide whether the room multiplier applies — do NOT infer it from `source`.
   */
  room_type_priced: boolean
  /** The catalogue behind a real rate. "" for estimates and for pre-source_label catalogue rows. */
  source_label: string
}

export interface HargaHotelInput {
  /** Hotel id (as returned by cari_hotel) or a free-text label. */
  hotel: string
  months: number[]
  /** Defaults to QUAD — the basis `sarPerNight` is quoted in. */
  room_types?: RoomType[]
  /** Optional narrowing when the same label exists in both cities. */
  city?: City
}

export interface HargaHotelResult {
  found: boolean
  hotel?: {
    id: string
    city: City
    tier: HotelTier
    label: string
    sublabel: string
    distance: string
  }
  rates: ToolRate[]
  /** Set when `found` is false, so the model can say what it could not price. */
  not_found_reason?: string
}

// The single derivation point for both tools. It calls resolveHotelSar and re-labels its answer —
// it never re-derives a rate. That is deliberate: the tool's number for a (hotel, month, roomType)
// has to be byte-identical to what lib/budget/calculate.ts will charge for the same inputs, or the
// model grounds its choice in a price the quote then contradicts.
export function resolveToolRate(
  config: Pick<HotelPriceConfig, "sarPerNight" | "monthlyPrices" | "realMonthlyPrices">,
  roomType: RoomType,
  month?: number
): ToolRate {
  const resolved = resolveHotelSar(config, roomType, month)

  const basis: PriceBasis =
    resolved.source === "estimate"
      ? "estimate"
      : resolved.roomTypePriced
        ? "catalogue_exact"
        : "catalogue_quad_fallback"

  return {
    ...(month != null ? { month } : {}),
    room_type: roomType,
    priced_room_type: basis === "catalogue_quad_fallback" ? FALLBACK_ROOM_TYPE : roomType,
    sar_per_night: resolved.sarPerNight,
    basis,
    source: resolved.source,
    room_type_priced: resolved.roomTypePriced,
    source_label: resolved.sourceLabel,
  }
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// Only concrete hotelOptions rows are addressable. The synthetic tier options that
// fallbackHotelOptions builds carry no realMonthlyPrices by construction (see the note at
// lib/estimate/hotel-pricing.ts:21-24), so pricing one here would return an estimate dressed as a
// catalogue lookup — exactly what D3 forbids.
function findHotel(pricing: PricingConfig, input: HargaHotelInput): HotelOptionConfig | undefined {
  const cities: City[] = input.city ? [input.city] : ["MADINAH", "MAKKAH"]
  const candidates = cities.flatMap((city) => pricing.hotelOptions?.[city] ?? [])

  const byId = candidates.find((hotel) => hotel.id === input.hotel)
  if (byId) return byId

  const needle = normalize(input.hotel)
  if (!needle) return undefined
  return candidates.find((hotel) => {
    const haystack = normalize(`${hotel.label} ${hotel.sublabel}`)
    return haystack.includes(needle) || needle.includes(normalize(hotel.label))
  })
}

// The model supplies months as free JSON, so anything outside 1-12 (or a float) is dropped rather
// than passed to resolveHotelSar, where it would silently miss every map and return the base
// estimate as though the month simply had no catalogue coverage.
export function isValidMonth(month: number | undefined): month is number {
  return month != null && Number.isInteger(month) && month >= 1 && month <= 12
}

function validMonths(months: number[] | undefined): number[] {
  const seen = new Set<number>()
  for (const month of months ?? []) {
    if (isValidMonth(month)) seen.add(month)
  }
  return [...seen].sort((a, b) => a - b)
}

function validRoomTypes(roomTypes: RoomType[] | undefined): RoomType[] {
  const seen = new Set<RoomType>()
  for (const roomType of roomTypes ?? []) {
    if (ROOM_TYPES.includes(roomType)) seen.add(roomType)
  }
  return seen.size > 0 ? [...seen] : [FALLBACK_ROOM_TYPE]
}

export function hargaHotel(pricing: PricingConfig, input: HargaHotelInput): HargaHotelResult {
  const hotel = findHotel(pricing, input)
  if (!hotel) {
    return {
      found: false,
      rates: [],
      not_found_reason: `Hotel "${input.hotel}" tidak ada di katalog${input.city ? ` ${input.city}` : ""}.`,
    }
  }

  const months = validMonths(input.months)
  const roomTypes = validRoomTypes(input.room_types)
  const rates = months.flatMap((month) => roomTypes.map((roomType) => resolveToolRate(hotel, roomType, month)))

  return {
    found: true,
    hotel: {
      id: hotel.id,
      city: hotel.city,
      tier: hotel.tier,
      label: hotel.label,
      sublabel: hotel.sublabel,
      distance: hotel.distance ?? "",
    },
    rates,
  }
}
