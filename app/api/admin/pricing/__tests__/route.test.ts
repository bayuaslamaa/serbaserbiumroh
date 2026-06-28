import { describe, it, expect } from "vitest"

// Unit tests for admin pricing validation logic — no DB or auth needed
const CITIES = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"]
const SERVICE_KEYS = ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"]

function validateRates(body: unknown): string | null {
  const b = body as Record<string, unknown>
  if (typeof b.currency !== "string") return "currency required"
  if (typeof b.rateToIdr !== "number" || (b.rateToIdr as number) <= 0) return "rateToIdr must be a positive number"
  return null
}

function validateHotel(body: unknown): string | null {
  const b = body as Record<string, unknown>
  if (!CITIES.includes(b.city as string)) return "invalid city"
  if (!HOTEL_TIERS.includes(b.tier as string)) return "invalid tier"
  if (typeof b.sarPerNight !== "number" || (b.sarPerNight as number) <= 0) return "sarPerNight must be a positive number"
  return null
}

function validateAirline(body: unknown): string | null {
  const b = body as Record<string, unknown>
  if (!AIRLINE_TIERS.includes(b.tier as string)) return "invalid tier"
  if (typeof b.idr !== "number" || (b.idr as number) <= 0) return "idr must be a positive number"
  return null
}

function validateService(body: unknown): string | null {
  const b = body as Record<string, unknown>
  if (!SERVICE_KEYS.includes(b.key as string)) return "invalid key"
  if (b.amount !== undefined && (typeof b.amount !== "number" || (b.amount as number) <= 0)) {
    return "amount must be a positive number"
  }
  return null
}

describe("Admin pricing validation", () => {
  describe("rates", () => {
    it("valid rates body passes", () => {
      expect(validateRates({ currency: "SAR", rateToIdr: 4850 })).toBeNull()
    })

    it("missing currency → error", () => {
      expect(validateRates({ rateToIdr: 4850 })).toBeTruthy()
    })

    it("negative rateToIdr → error", () => {
      expect(validateRates({ currency: "SAR", rateToIdr: -100 })).toBeTruthy()
    })

    it("zero rateToIdr → error", () => {
      expect(validateRates({ currency: "SAR", rateToIdr: 0 })).toBeTruthy()
    })
  })

  describe("hotel", () => {
    it("valid hotel body passes", () => {
      expect(validateHotel({ city: "MAKKAH", tier: "STANDARD", sarPerNight: 1500 })).toBeNull()
    })

    it("invalid city → error", () => {
      expect(validateHotel({ city: "ISTANBUL", tier: "STANDARD", sarPerNight: 1500 })).toBeTruthy()
    })

    it("invalid tier → error", () => {
      expect(validateHotel({ city: "MAKKAH", tier: "ULTRA", sarPerNight: 1500 })).toBeTruthy()
    })
  })

  describe("airline", () => {
    it("valid airline body passes", () => {
      expect(validateAirline({ tier: "GARUDA", idr: 18000000 })).toBeNull()
    })

    it("invalid tier → error", () => {
      expect(validateAirline({ tier: "EMIRATES", idr: 18000000 })).toBeTruthy()
    })

    it("zero idr → error", () => {
      expect(validateAirline({ tier: "GARUDA", idr: 0 })).toBeTruthy()
    })
  })

  describe("service", () => {
    it("valid service body with enabled flag passes", () => {
      expect(validateService({ key: "VISA", enabled: false })).toBeNull()
    })

    it("valid service body with amount passes", () => {
      expect(validateService({ key: "TRANSPORT", amount: 350 })).toBeNull()
    })

    it("invalid key → error", () => {
      expect(validateService({ key: "INVALID_KEY" })).toBeTruthy()
    })

    it("negative amount → error", () => {
      expect(validateService({ key: "VISA", amount: -10 })).toBeTruthy()
    })
  })
})
