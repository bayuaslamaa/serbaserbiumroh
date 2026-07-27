import { describe, it, expect } from "vitest"
import { resolveHotelSelection } from "@/lib/estimate/hotel-selection"
import type { PricingConfig } from "@/types"

// Same mock pricing shape as components/estimator/__tests__/EstimatorPreFill.test.tsx,
// so this test and that one provably exercise the same behavior.
const mockPricing: PricingConfig = {
  rates: { SAR: 4700, USD: 17300 },
  hotels: {
    MADINAH: {
      ECONOMY: { sarPerNight: 450, label: "Ekonomi Madinah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 650, label: "Standard Madinah", sublabel: "4★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 2000, label: "Pelataran Nabawi", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 3500, label: "Premium Madinah", sublabel: "5★", monthlyPrices: {} },
    },
    MAKKAH: {
      ECONOMY: { sarPerNight: 800, label: "Ekonomi Makkah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 1300, label: "Safwa Tower 3", sublabel: "3★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 3500, label: "Pelataran Haram", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 6000, label: "Premium Makkah", sublabel: "5★", monthlyPrices: {} },
    },
  },
  hotelOptions: {
    MADINAH: [
      { id: "kayan-hotel", city: "MADINAH", tier: "STANDARD", sarPerNight: 700, label: "Kayan Hotel", sublabel: "standard Madinah", monthlyPrices: { 11: 900 } },
      { id: "dallah-taiba", city: "MADINAH", tier: "PREMIUM", sarPerNight: 1600, label: "Dallah Taiba", sublabel: "premium Madinah", monthlyPrices: {} },
    ],
    MAKKAH: [
      { id: "olayan-ajyad", city: "MAKKAH", tier: "STANDARD", sarPerNight: 950, label: "Olayan Ajyad", sublabel: "standard Ajyad", monthlyPrices: { 11: 1250 } },
      { id: "voco-makkah", city: "MAKKAH", tier: "PREMIUM", sarPerNight: 600, label: "Voco", sublabel: "upper Makkah shuttle", monthlyPrices: {} },
    ],
  },
  airlines: {
    BUDGET: { idr: 12500000, label: "Lion Air" },
    STANDARD: { idr: 14500000, label: "Batik Air" },
    GARUDA: { idr: 17000000, label: "Garuda" },
    BUSINESS: { idr: 25000000, label: "Business" },
  },
  services: {
    VISA: { currency: "USD", amount: 165, label: "Visa Umroh Reguler", enabled: true, divideByPax: false },
    SISKOPATUH: { currency: "IDR", amount: 200000, label: "Siskopatuh", enabled: true, divideByPax: false },
    TASREH: { currency: "SAR", amount: 25, label: "Tasreh Raudhah", enabled: true, divideByPax: false },
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
    TRANSPORT_JED_MAKKAH: { currency: "SAR", amount: 400, label: "Transportasi Jeddah → Makkah", enabled: true, divideByPax: true },
    TRANSPORT_JED_MADINAH: { currency: "SAR", amount: 650, label: "Transportasi Jeddah → Madinah", enabled: true, divideByPax: true },
    TRANSPORT_MAKKAH_MADINAH: { currency: "SAR", amount: 550, label: "Transportasi Makkah ↔ Madinah", enabled: true, divideByPax: true },
    TRANSPORT_MAKKAH_JED: { currency: "SAR", amount: 300, label: "Transportasi Makkah → Jeddah", enabled: true, divideByPax: true },
    TRANSPORT_MADINAH_JED: { currency: "SAR", amount: 550, label: "Transportasi Madinah → Jeddah", enabled: true, divideByPax: true },
    MUTHOWIF: { currency: "SAR", amount: 0, label: "Muthowif", enabled: false, divideByPax: true },
  },
  roomMultipliers: {
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.0 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.0 },
    QUINT: { paxPerRoom: 5, multiplier: 1.0 },
  },
}

describe("resolveHotelSelection", () => {
  it("returns hotelTier + city hotel id for a concrete hotel option", () => {
    expect(resolveHotelSelection("MAKKAH", "olayan-ajyad", mockPricing)).toEqual({
      hotelTier: "STANDARD",
      makkahHotelId: "olayan-ajyad",
    })
  })

  it("returns hotelTier + madinahHotelId for a concrete Madinah hotel option", () => {
    expect(resolveHotelSelection("MADINAH", "kayan-hotel", mockPricing)).toEqual({
      hotelTier: "STANDARD",
      madinahHotelId: "kayan-hotel",
    })
  })

  it("leaves the city hotel-id field undefined for a fallback tier-only option", () => {
    const pricingWithoutOptions: PricingConfig = {
      ...mockPricing,
      hotelOptions: { MADINAH: [], MAKKAH: [] },
    }
    const patch = resolveHotelSelection("MAKKAH", "MAKKAH:PREMIUM", pricingWithoutOptions)
    expect(patch).toEqual({ hotelTier: "PREMIUM", makkahHotelId: undefined })
  })

  it("returns undefined when the hotel id does not resolve to any option", () => {
    expect(resolveHotelSelection("MAKKAH", "not-a-real-id", mockPricing)).toBeUndefined()
  })
})
