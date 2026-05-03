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
    TRANSPORT: { currency: "SAR", amount: 325, label: "Transportasi", enabled: true, divideByPax: true },
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
  },
  roomMultipliers: {
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.25 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.5 },
    SINGLE: { paxPerRoom: 1, multiplier: 2.8 },
  },
}

const baseParams: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
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

    it("SINGLE room (paxPerRoom=1, mult=2.8), ECONOMY Makkah 9 nights → 94,752,000", () => {
      // 800 × 9 × 2.8 / 1 = 20160 SAR × 4700 = 94,752,000
      const params = { ...baseParams, hotelTier: "ECONOMY" as const, roomType: "SINGLE" as const }
      const result = calculateBudget(params, mockPricing)
      expect(result.hotelMakkahIdr).toBe(94_752_000)
    })

    it("TRIPLE room (paxPerRoom=3, mult=1.25), STANDARD Madinah 4 nights", () => {
      // 650 × 4 × 1.25 / 3 = 1083.33... SAR → Math.round(1083.33 × 4700) = Math.round(5,091,666.66) = 5,091,667
      const params = { ...baseParams, roomType: "TRIPLE" as const }
      const result = calculateBudget(params, mockPricing)
      expect(result.hotelMadinahIdr).toBe(Math.round((650 * 4 * 1.25 / 3) * 4700))
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
      const result = calculateBudget({ ...baseParams, services: ["TRANSPORT"] }, mockPricing)
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
  })

  describe("exchange rates in output", () => {
    it("returns sarRate and usdRate from pricing", () => {
      const result = calculateBudget(baseParams, mockPricing)
      expect(result.sarRate).toBe(4700)
      expect(result.usdRate).toBe(17300)
    })
  })
})
