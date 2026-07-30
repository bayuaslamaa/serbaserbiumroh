import { SERVICE_KEYS } from "@/types"
import type { City, HotelOptionConfig, HotelTier, PricingConfig, RoomType, ServiceKey, ServiceFeeConfig } from "@/types"

// A PricingConfig just complete enough for the tools, which only read `hotelOptions` and (through
// resolveHotelSar) each option's own rate maps. Shared by both tool suites so the two are asserting
// against the same catalogue.

const TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

function tierHotels(city: City) {
  return TIERS.reduce(
    (acc, tier) => {
      acc[tier] = {
        sarPerNight: 500,
        label: `${tier} ${city}`,
        sublabel: "tier fallback",
        monthlyPrices: {},
        realMonthlyPrices: {},
      }
      return acc
    },
    {} as PricingConfig["hotels"][City]
  )
}

export function makePricing(hotelOptions: Partial<Record<City, HotelOptionConfig[]>>): PricingConfig {
  return {
    rates: { SAR: 4700, USD: 17300 },
    hotels: { MADINAH: tierHotels("MADINAH"), MAKKAH: tierHotels("MAKKAH") },
    hotelOptions: { MADINAH: hotelOptions.MADINAH ?? [], MAKKAH: hotelOptions.MAKKAH ?? [] },
    airlines: {
      BUDGET: { idr: 12_500_000, label: "Lion Air" },
      STANDARD: { idr: 14_500_000, label: "Batik Air" },
      GARUDA: { idr: 17_000_000, label: "Garuda" },
      BUSINESS: { idr: 25_000_000, label: "Business" },
    },
    services: SERVICE_KEYS.reduce(
      (acc, key) => {
        acc[key] = { currency: "SAR", amount: 100, label: key, enabled: true, divideByPax: true }
        return acc
      },
      {} as Record<ServiceKey, ServiceFeeConfig>
    ),
    roomMultipliers: {
      QUINT: { paxPerRoom: 5, multiplier: 1.15 },
      QUAD: { paxPerRoom: 4, multiplier: 1 },
      TRIPLE: { paxPerRoom: 3, multiplier: 0.85 },
      DOUBLE: { paxPerRoom: 2, multiplier: 0.7 },
    },
  }
}

export function makeHotel(overrides: Partial<HotelOptionConfig> & Pick<HotelOptionConfig, "id">): HotelOptionConfig {
  return {
    city: "MADINAH",
    tier: "STANDARD",
    sarPerNight: 700,
    label: overrides.id,
    sublabel: "standard",
    distance: null,
    monthlyPrices: {},
    realMonthlyPrices: {},
    ...overrides,
  }
}

export function realPrices(
  entries: Record<number, Partial<Record<RoomType, [number, string]>>>
): NonNullable<HotelOptionConfig["realMonthlyPrices"]> {
  const out: NonNullable<HotelOptionConfig["realMonthlyPrices"]> = {}
  for (const [month, byRoom] of Object.entries(entries)) {
    const month_ = Number(month)
    out[month_] = {}
    for (const [roomType, value] of Object.entries(byRoom) as [RoomType, [number, string]][]) {
      out[month_]![roomType] = { sarPerNight: value[0], sourceLabel: value[1] }
    }
  }
  return out
}
