import { SERVICE_KEYS } from "@/types"
import { expandRetiredStoredParams } from "./services"
import type { City, EstimateParams, PricingConfig } from "@/types"

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const ROOM_TYPES = ["QUINT", "QUAD", "TRIPLE", "DOUBLE"]
const AIRLINE_TIERS = ["NONE", "BUDGET", "STANDARD", "GARUDA", "BUSINESS"]

export function validateEstimateParamsShape(p: unknown): p is EstimateParams {
  if (!p || typeof p !== "object") return false
  const o = p as Record<string, unknown>

  const travelMonthValid =
    o.travelMonth === undefined ||
    (typeof o.travelMonth === "number" &&
      Number.isInteger(o.travelMonth) &&
      o.travelMonth >= 1 &&
      o.travelMonth <= 12)

  return (
    typeof o.nightsMadinah === "number" &&
    typeof o.nightsMakkah === "number" &&
    typeof o.pax === "number" &&
    HOTEL_TIERS.includes(o.hotelTier as string) &&
    (o.madinahHotelId === undefined || typeof o.madinahHotelId === "string") &&
    (o.makkahHotelId === undefined || typeof o.makkahHotelId === "string") &&
    ROOM_TYPES.includes(o.roomType as string) &&
    AIRLINE_TIERS.includes(o.airline as string) &&
    Array.isArray(o.services) &&
    (o.services as string[]).every((s) => SERVICE_KEYS.includes(s as (typeof SERVICE_KEYS)[number])) &&
    typeof o.fullboard === "boolean" &&
    travelMonthValid
  )
}

// The boundary version: rewrite retired keys, then validate. `validateEstimateParamsShape` stays
// strict — a retired key is not valid input — but a saved estimate that still names one has to be
// able to come back through the API when it is re-saved or duplicated, so it is expanded to its
// replacements before the strict check runs. Only *known retired* keys are rewritten: a key the
// catalogue has never heard of still fails validation rather than being quietly discarded from a
// request. Returns the params to persist, or null to reject.
export function normaliseAndValidateEstimateParams(p: unknown): EstimateParams | null {
  const expanded = expandRetiredStoredParams(p)
  return validateEstimateParamsShape(expanded) ? expanded : null
}

function hotelIdBelongsToCity(pricing: PricingConfig, city: City, hotelId?: string): boolean {
  if (!hotelId) return true
  return pricing.hotelOptions?.[city]?.some((hotel) => hotel.id === hotelId) ?? false
}

export function validateEstimateHotelIds(params: EstimateParams, pricing: PricingConfig): boolean {
  return (
    hotelIdBelongsToCity(pricing, "MADINAH", params.madinahHotelId) &&
    hotelIdBelongsToCity(pricing, "MAKKAH", params.makkahHotelId)
  )
}

export function estimateTitle(params: EstimateParams): string {
  const hotelTierLabel = params.hotelTier.charAt(0) + params.hotelTier.slice(1).toLowerCase()
  return `Estimasi ${hotelTierLabel} ${params.nightsMadinah}+${params.nightsMakkah} malam`
}
