import { describe, it, expect } from "vitest"
import { calculateBudget } from "@/lib/budget/calculate"
import type { PricingConfig, EstimateParams } from "@/types"

const mockPricing: PricingConfig = {
  rates: { SAR: 4700, USD: 17300 },
  hotels: {
    MADINAH: {
      ECONOMY: { sarPerNight: 450, label: "Ekonomi Madinah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 650, label: "Standard Madinah", sublabel: "4★", monthlyPrices: { 3: 1200 } }, // month 3 Ramadan override
      PELATARAN: { sarPerNight: 2000, label: "Pelataran Nabawi", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 3500, label: "Premium Madinah", sublabel: "5★", monthlyPrices: {} },
    },
    MAKKAH: {
      ECONOMY: { sarPerNight: 800, label: "Ekonomi Makkah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 1300, label: "Safwa Tower 3", sublabel: "3★", monthlyPrices: { 3: 2500 } }, // month 3 Ramadan override
      PELATARAN: { sarPerNight: 3500, label: "Pelataran Haram", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 6000, label: "Premium Makkah", sublabel: "5★", monthlyPrices: {} },
    },
  },
  hotelOptions: {
    MADINAH: [
      { id: "madinah-economy", city: "MADINAH", tier: "ECONOMY", sarPerNight: 450, label: "Ekonomi Madinah", sublabel: "2-3★", monthlyPrices: {} },
      { id: "kayan-hotel", city: "MADINAH", tier: "STANDARD", sarPerNight: 700, label: "Kayan Hotel", sublabel: "4★", monthlyPrices: { 11: 900 } },
    ],
    MAKKAH: [
      { id: "makkah-standard", city: "MAKKAH", tier: "STANDARD", sarPerNight: 1300, label: "Safwa Tower 3", sublabel: "3★", monthlyPrices: {} },
      { id: "olayan-ajyad", city: "MAKKAH", tier: "STANDARD", sarPerNight: 950, label: "Olayan Ajyad", sublabel: "Ajyad standard", monthlyPrices: { 11: 1250 } },
    ],
  },
  airlines: {
    BUDGET: { idr: 12500000, label: "Lion Air", monthlyPrices: {} },
    STANDARD: { idr: 14500000, label: "Batik Air", monthlyPrices: { 2: 18500000 } },
    GARUDA: { idr: 17000000, label: "Garuda", monthlyPrices: {} },
    BUSINESS: { idr: 25000000, label: "Business", monthlyPrices: {} },
  },
  services: {
    VISA: { currency: "USD", amount: 165, label: "Visa Umroh Reguler", enabled: true, divideByPax: false },
    SISKOPATUH: { currency: "IDR", amount: 200000, label: "Siskopatuh", enabled: true, divideByPax: false },
    TASREH: { currency: "SAR", amount: 25, label: "Tasreh Raudhah", enabled: true, divideByPax: false },
    TRANSPORT: { currency: "SAR", amount: 325, label: "Transportasi", enabled: true, divideByPax: true },
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
  },
  // multiplier = this room type's nightly rate ÷ a quad room's rate (NOT a per-person uplift —
  // roomCount already carries the occupancy math). All 1.0 today: rooms cost the same whatever
  // the occupancy, so only the number of rooms differs.
  roomMultipliers: {
    QUINT: { paxPerRoom: 5, multiplier: 1.0 },
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.0 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.0 },
  },
}

const baseParams: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 4,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT"],
  fullboard: true,
}

describe("calculateBudget", () => {
  describe("hotel calculation (PRD §7)", () => {
    it("STANDARD hotel, QUAD room, 4 nights Madinah → hotelMadinahIdr = 3,055,000", () => {
      // 650 SAR × 4 nights × 1.0 / 4 pax = 650 SAR/pax × 4700 = 3,055,000
      const result = calculateBudget(baseParams, mockPricing)
      expect(result.hotelMadinahIdr).toBe(3_055_000)
    })

    it("STANDARD hotel, QUAD room, 9 nights Makkah → hotelMakkahIdr = 13,747,500", () => {
      // 1300 SAR × 9 nights × 1.0 / 4 pax = 2925 SAR/pax × 4700 = 13,747,500
      const result = calculateBudget(baseParams, mockPricing)
      expect(result.hotelMakkahIdr).toBe(13_747_500)
    })

    it("QUINT room (5/room) houses a 5-person group in one room, ECONOMY Makkah 9 nights", () => {
      // 800 SAR × 9 nights × 1 room × 4700, split 5 ways.
      const params = { ...baseParams, pax: 5, hotelTier: "ECONOMY" as const, roomType: "QUINT" as const }
      const result = calculateBudget(params, mockPricing)
      expect(result.hotelMakkahDetail.roomCount).toBe(1)
      expect(result.hotelMakkahIdr).toBe(Math.round((800 * 9 * 1 * 4700) / 5))
    })

    it("TRIPLE room (3/room), STANDARD Madinah 4 nights", () => {
      // 3 pax fit one triple room: 650 × 4 × 1 room × 4700, split 3 ways.
      const params = { ...baseParams, pax: 3, roomType: "TRIPLE" as const }
      const result = calculateBudget(params, mockPricing)
      expect(result.hotelMadinahIdr).toBe(Math.round((650 * 4 * 1 * 4700) / 3))
    })

    // Regression guard for the double-counting bug: roomMultiplier used to hold a per-person
    // uplift (triple 1.25 / double 1.5 / single 2.8) applied on top of roomCount, scaling the
    // same axis twice — double came out 50% high, single 180% high. Cost must be driven by how
    // many rooms the group needs, nothing else.
    it("prices every room type as rooms-needed × room rate, with no second scaling", () => {
      const quad = calculateBudget({ ...baseParams, pax: 4, roomType: "QUAD" as const }, mockPricing)
      const triple = calculateBudget({ ...baseParams, pax: 4, roomType: "TRIPLE" as const }, mockPricing)
      const double = calculateBudget({ ...baseParams, pax: 4, roomType: "DOUBLE" as const }, mockPricing)

      expect(quad.hotelMadinahDetail.roomCount).toBe(1)
      expect(triple.hotelMadinahDetail.roomCount).toBe(2)
      expect(double.hotelMadinahDetail.roomCount).toBe(2)

      // Two rooms for the same group is exactly twice one room — not 2.5× or 3× as the old
      // multipliers made it.
      expect(triple.hotelMadinahIdr).toBe(quad.hotelMadinahIdr * 2)
      expect(double.hotelMadinahIdr).toBe(quad.hotelMadinahIdr * 2)

      // Five sharing one quint room beats five spread across two quad rooms.
      const quint5 = calculateBudget({ ...baseParams, pax: 5, roomType: "QUINT" as const }, mockPricing)
      const quad5 = calculateBudget({ ...baseParams, pax: 5, roomType: "QUAD" as const }, mockPricing)
      expect(quint5.hotelMadinahIdr).toBeLessThan(quad5.hotelMadinahIdr)
    })

    it("rounds hotel room count up from pax and divides total room cost per person", () => {
      const result = calculateBudget({ ...baseParams, pax: 5, roomType: "QUAD" }, mockPricing)

      expect(result.hotelMadinahDetail.roomCount).toBe(2)
      expect(result.hotelMadinahIdr).toBe(Math.round((650 * 4 * 1.0 * 2 * 4700) / 5))
      expect(result.hotelMakkahDetail.roomCount).toBe(2)
      expect(result.hotelMakkahIdr).toBe(Math.round((1300 * 9 * 1.0 * 2 * 4700) / 5))
    })

    it("keeps per-person hotel cost stable when pax exactly fills additional rooms", () => {
      const fourPax = calculateBudget({ ...baseParams, pax: 4, roomType: "QUAD" }, mockPricing)
      const eightPax = calculateBudget({ ...baseParams, pax: 8, roomType: "QUAD" }, mockPricing)

      expect(fourPax.hotelMadinahDetail.roomCount).toBe(1)
      expect(eightPax.hotelMadinahDetail.roomCount).toBe(2)
      expect(eightPax.hotelMadinahIdr).toBe(fourPax.hotelMadinahIdr)
      expect(eightPax.hotelMakkahIdr).toBe(fourPax.hotelMakkahIdr)
    })

    it("selected city hotel IDs override the shared tier fallback", () => {
      const result = calculateBudget(
        { ...baseParams, madinahHotelId: "kayan-hotel", makkahHotelId: "olayan-ajyad" },
        mockPricing
      )

      expect(result.hotelMadinahIdr).toBe(Math.round(700 * 4 / 4 * 4700))
      expect(result.hotelMakkahIdr).toBe(Math.round(950 * 9 / 4 * 4700))
      expect(result.hotelMadinahDetail.label).toBe("Kayan Hotel")
      expect(result.hotelMakkahDetail.label).toBe("Olayan Ajyad")
    })

    it("unknown selected hotel IDs fall back to the tier price", () => {
      const result = calculateBudget(
        { ...baseParams, madinahHotelId: "missing", makkahHotelId: "missing" },
        mockPricing
      )

      expect(result.hotelMadinahIdr).toBe(3_055_000)
      expect(result.hotelMakkahIdr).toBe(13_747_500)
      expect(result.hotelMadinahDetail.label).toBe("Standard Madinah")
      expect(result.hotelMakkahDetail.label).toBe("Safwa Tower 3")
    })
  })

  describe("service calculation (PRD §7, §15)", () => {
    it("VISA (USD 165, rate 17300) → 2,854,500 IDR", () => {
      const result = calculateBudget({ ...baseParams, services: ["VISA"] }, mockPricing)
      expect(result.servicesIdr).toBe(2_854_500) // Math.round(165 * 17300)
      expect(result.serviceItems[0].amountDisplay).toBe("$165")
    })

    it("SISKOPATUH (IDR 200,000) → no conversion", () => {
      const result = calculateBudget({ ...baseParams, services: ["SISKOPATUH"] }, mockPricing)
      expect(result.servicesIdr).toBe(200_000)
      expect(result.serviceItems[0].amountDisplay).toBe("Rp 200.000")
    })

    it("TRANSPORT (SAR 325, rate 4700) → 1,527,500 IDR for pax=1", () => {
      const result = calculateBudget({ ...baseParams, pax: 1, services: ["TRANSPORT"] }, mockPricing)
      expect(result.servicesIdr).toBe(1_527_500) // Math.round(325 * 4700)
      expect(result.serviceItems[0].amountDisplay).toBe("SAR 325")
      expect(result.serviceItems[0].divideByPax).toBe(true)
    })

    it("TRANSPORT divideByPax=true: pax=10 → per-person cost is 1/10th of total", () => {
      const result = calculateBudget({ ...baseParams, pax: 10, services: ["TRANSPORT"] }, mockPricing)
      // 325 SAR × 4700 = 1,527,500 total ÷ 10 pax = 152,750 per person
      expect(result.servicesIdr).toBe(Math.round(1_527_500 / 10))
    })

    it("VISA divideByPax=false: pax=10 → full per-person cost unchanged", () => {
      const result = calculateBudget({ ...baseParams, pax: 10, services: ["VISA"] }, mockPricing)
      expect(result.servicesIdr).toBe(2_854_500) // same as pax=1
    })

    it("empty services array → servicesIdr = 0, serviceItems = []", () => {
      const result = calculateBudget({ ...baseParams, services: [] }, mockPricing)
      expect(result.servicesIdr).toBe(0)
      expect(result.serviceItems).toHaveLength(0)
    })

    it("disabled service is excluded from calculation", () => {
      const pricingWithDisabledVisa = {
        ...mockPricing,
        services: {
          ...mockPricing.services,
          VISA: { ...mockPricing.services.VISA, enabled: false },
        },
      }
      const result = calculateBudget(
        { ...baseParams, services: ["VISA", "SISKOPATUH"] },
        pricingWithDisabledVisa
      )
      // VISA disabled, only SISKOPATUH counted
      expect(result.servicesIdr).toBe(200_000)
      expect(result.serviceItems).toHaveLength(1)
      expect(result.serviceItems[0].key).toBe("SISKOPATUH")
    })
  })

  describe("totals and group calculation", () => {
    it("totalIdrPax = sum of hotel + services + flight", () => {
      const result = calculateBudget(baseParams, mockPricing)
      const expected =
        result.hotelMadinahIdr +
        result.hotelMakkahIdr +
        result.servicesIdr +
        result.flightIdr
      expect(result.totalIdrPax).toBe(expected)
    })

    it("totalIdrGrp = totalIdrPax × pax (pax=10)", () => {
      const result = calculateBudget({ ...baseParams, pax: 10 }, mockPricing)
      expect(result.totalIdrGrp).toBe(result.totalIdrPax * 10)
    })

    it("pax=1 → totalIdrGrp === totalIdrPax", () => {
      const result = calculateBudget({ ...baseParams, pax: 1 }, mockPricing)
      expect(result.totalIdrGrp).toBe(result.totalIdrPax)
    })

    it("flight IDR comes directly from pricing (STANDARD = 14,500,000)", () => {
      const result = calculateBudget(baseParams, mockPricing)
      expect(result.flightIdr).toBe(14_500_000)
    })

    it("GARUDA airline → flightIdr = 17,000,000", () => {
      const result = calculateBudget({ ...baseParams, airline: "GARUDA" }, mockPricing)
      expect(result.flightIdr).toBe(17_000_000)
    })

    it("NONE airline → flightIdr = 0", () => {
      const result = calculateBudget({ ...baseParams, airline: "NONE" }, mockPricing)
      expect(result.flightIdr).toBe(0)
    })

    it("travelMonth with airline monthly override → flightIdr uses monthly IDR", () => {
      const result = calculateBudget({ ...baseParams, travelMonth: 2 }, mockPricing)
      expect(result.flightIdr).toBe(18_500_000)
    })

    it("travelMonth without airline monthly override → flightIdr falls back to base IDR", () => {
      const result = calculateBudget({ ...baseParams, airline: "GARUDA", travelMonth: 2 }, mockPricing)
      expect(result.flightIdr).toBe(17_000_000)
    })
  })

  describe("monthly hotel pricing (Approach B)", () => {
    it("travelMonth=undefined → uses base sarPerNight", () => {
      const result = calculateBudget({ ...baseParams, travelMonth: undefined }, mockPricing)
      // STANDARD Makkah base = 1300 SAR, 9 nights, QUAD (mult=1/pax=4): 1300×9×1/4×4700
      expect(result.hotelMakkahIdr).toBe(13_747_500)
    })

    it("travelMonth=3 (Ramadan mock) → uses monthly override for both cities", () => {
      const result = calculateBudget({ ...baseParams, travelMonth: 3 }, mockPricing)
      // Makkah STANDARD month 3 = 2500 SAR: 2500×9×1/4×4700 = 26,437,500
      expect(result.hotelMakkahIdr).toBe(Math.round(2500 * 9 * 1.0 / 4 * 4700))
      // Madinah STANDARD month 3 = 1200 SAR: 1200×4×1/4×4700 = 5,640,000
      expect(result.hotelMadinahIdr).toBe(Math.round(1200 * 4 * 1.0 / 4 * 4700))
    })

    it("travelMonth for a hotel with no monthly override → falls back to base price", () => {
      // ECONOMY has empty monthlyPrices
      const result = calculateBudget({ ...baseParams, hotelTier: "ECONOMY", travelMonth: 3 }, mockPricing)
      expect(result.hotelMakkahIdr).toBe(Math.round(800 * 9 * 1.0 / 4 * 4700))
    })

    it("travelMonth applies monthly overrides for selected hotel IDs", () => {
      const result = calculateBudget(
        { ...baseParams, travelMonth: 11, madinahHotelId: "kayan-hotel", makkahHotelId: "olayan-ajyad" },
        mockPricing
      )

      expect(result.hotelMadinahIdr).toBe(Math.round(900 * 4 / 4 * 4700))
      expect(result.hotelMakkahIdr).toBe(Math.round(1250 * 9 / 4 * 4700))
      expect(result.hotelMadinahDetail.sarPerNight).toBe(900)
      expect(result.hotelMakkahDetail.sarPerNight).toBe(1250)
    })
  })

  describe("exchange rates in output", () => {
    it("returns sarRate and usdRate from pricing", () => {
      const result = calculateBudget(baseParams, mockPricing)
      expect(result.sarRate).toBe(4700)
      expect(result.usdRate).toBe(17300)
    })
  })

  describe("real price layer (U3)", () => {
    function withReal(city: "MADINAH" | "MAKKAH", real: Record<number, number>): PricingConfig {
      return {
        ...mockPricing,
        hotels: {
          ...mockPricing.hotels,
          [city]: {
            ...mockPricing.hotels[city],
            STANDARD: { ...mockPricing.hotels[city].STANDARD, realMonthlyPrices: real },
          },
        },
      }
    }

    it("prefers the real price for the requested month", () => {
      const r = calculateBudget({ ...baseParams, travelMonth: 2 }, withReal("MADINAH", { 2: 900 }))
      expect(r.hotelMadinahDetail.sarPerNight).toBe(900)
      expect(r.hotelMadinahDetail.priceSource).toBe("real")
      // 900 SAR × 4 nights ÷ 4 pax × 4700 = 4,230,000
      expect(r.hotelMadinahIdr).toBe(4_230_000)
    })

    it("falls back to the estimate when no real price covers that month", () => {
      const r = calculateBudget({ ...baseParams, travelMonth: 5 }, withReal("MADINAH", { 2: 900 }))
      expect(r.hotelMadinahIdr).toBe(3_055_000) // base 650 estimate
      expect(r.hotelMadinahDetail.priceSource).toBe("estimate")
    })

    it("ignores real prices when travelMonth is unset (real is seasonal)", () => {
      const r = calculateBudget(baseParams, withReal("MADINAH", { 2: 900 }))
      expect(r.hotelMadinahIdr).toBe(3_055_000)
      expect(r.hotelMadinahDetail.priceSource).toBe("estimate")
    })

    it("resolves each city's price source independently", () => {
      const r = calculateBudget({ ...baseParams, travelMonth: 6 }, withReal("MAKKAH", { 6: 1500 }))
      expect(r.hotelMakkahDetail.priceSource).toBe("real")
      // 1500 SAR × 9 nights ÷ 4 pax × 4700 = 15,862,500
      expect(r.hotelMakkahIdr).toBe(15_862_500)
      expect(r.hotelMadinahDetail.priceSource).toBe("estimate")
    })

    it("labels a monthly estimate override as estimate, not real", () => {
      const r = calculateBudget({ ...baseParams, travelMonth: 3 }, mockPricing)
      expect(r.hotelMadinahDetail.priceSource).toBe("estimate")
    })
  })
})
