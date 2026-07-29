import { FALLBACK_ROOM_TYPE } from "@/lib/estimate/room-types"
import type { HotelPriceConfig, RoomType } from "@/types"

// Resolve the SAR/night for a hotel + month + room type. Real prices are seasonal, so the real
// steps only fire when travelMonth is set. Four steps, and only the first one yields a rate that
// already encodes the room type:
//
//   1. the catalog's rate for THIS room type  -> use as-is, ratio must not be applied
//   2. the catalog's QUAD rate                -> authoritative, but quoted per quad room
//   3. the monthly estimate override          -> quad basis
//   4. the base estimate                      -> quad basis
//
// `roomTypePriced` is what tells the caller which case it got. Do NOT infer it from `source`: a
// quad real rate is also "real" but still needs the ratio, and conflating the two under-prices
// every non-quad quote by the ratio (a double would come out 30% low).
//
// This lives here rather than in lib/budget/calculate.ts so the estimator's pickers and the cost
// calculation resolve one rate from one ladder — the two must never disagree about what a hotel
// costs on a given night.
//
// One known gap: fallbackHotelOptions in lib/estimate/hotel-selection.ts builds tier-fallback
// options without realMonthlyPrices, so for those synthetic options the picker resolves on the
// estimate while the calculator (which reads pricing.hotels[city][tier]) can still find a real
// rate. Concrete hotels — the production path — carry the map and do agree.
export function resolveHotelSar(
  config: Pick<HotelPriceConfig, "sarPerNight" | "monthlyPrices" | "realMonthlyPrices">,
  roomType: RoomType,
  travelMonth?: number
): { sarPerNight: number; source: "real" | "estimate"; roomTypePriced: boolean } {
  if (travelMonth != null) {
    const realForMonth = config.realMonthlyPrices?.[travelMonth]

    const exact = realForMonth?.[roomType]
    if (exact != null) return { sarPerNight: exact, source: "real", roomTypePriced: true }

    // Any type the catalog omitted lands here. That is usually QUINT — most catalogs quote
    // DBL/TRPL/QUAD only — but a few (Saif Al Yamani, Al Manara) do print a 5-bed rate, and those
    // hit the step above like any other type. QUINT is not special-cased.
    const quad = realForMonth?.[FALLBACK_ROOM_TYPE]
    if (quad != null) return { sarPerNight: quad, source: "real", roomTypePriced: false }

    const monthly = config.monthlyPrices[travelMonth]
    if (monthly != null) return { sarPerNight: monthly, source: "estimate", roomTypePriced: false }
  }
  return { sarPerNight: config.sarPerNight, source: "estimate", roomTypePriced: false }
}

// Shared between ParamsPanel and HotelPicker so the "which SAR/night rate to show" resolution
// stays in one place — the two consumers must never diverge on this behavior. Returns the same
// figure the breakdown prints as its per-night rate, so the badge and the quote agree.
export function resolveMonthlyHotelSar(
  config: Pick<HotelPriceConfig, "sarPerNight" | "monthlyPrices" | "realMonthlyPrices">,
  month?: number,
  roomType: RoomType = FALLBACK_ROOM_TYPE
): number {
  return resolveHotelSar(config, roomType, month).sarPerNight
}

export function sarLabel(amount: number): string {
  return `SAR ${amount}/mlm`
}
