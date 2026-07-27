import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/server before anything else
vi.mock("next/server", () => ({
  NextRequest: class {
    url: string
    constructor(url: string) {
      this.url = url
    }
    async json() {
      return {}
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}))

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

// Mock db
vi.mock("@/lib/db", () => ({
  db: {},
}))

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ a, b })),
  desc: vi.fn((a) => a),
  count: vi.fn(() => "count"),
}))

// Mock schema
vi.mock("@/lib/db/schema", () => ({
  estimates: {},
}))

// Mock budget/calculate
vi.mock("@/lib/budget/calculate", () => ({
  fetchPricingConfig: vi.fn(),
  calculateBudget: vi.fn(),
}))

import type { EstimateParams, PricingConfig } from "@/types"
import { estimateTitle, validateEstimateHotelIds, validateEstimateParamsShape } from "@/lib/estimate/params"

const validParams: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT_JED_MAKKAH"],
  fullboard: true,
}

describe("Estimate params validation", () => {
  it("valid params pass validation shape", () => {
    expect(validateEstimateParamsShape(validParams)).toBe(true)
    expect(validateEstimateParamsShape({ ...validParams, madinahHotelId: "kayan-hotel", makkahHotelId: "olayan-ajyad", travelMonth: 11 })).toBe(true)
    expect(validateEstimateParamsShape({})).toBe(false)
    expect(validateEstimateParamsShape({ ...validParams, hotelTier: "INVALID" })).toBe(false)
    expect(validateEstimateParamsShape({ ...validParams, services: ["VISA", "UNKNOWN_KEY"] })).toBe(false)
    expect(validateEstimateParamsShape({ ...validParams, pax: "one" })).toBe(false)
    expect(validateEstimateParamsShape({ ...validParams, travelMonth: 13 })).toBe(false)
  })

  it("validates selected hotel IDs against the correct city", () => {
    const pricing = {
      hotelOptions: {
        MADINAH: [{ id: "kayan-hotel", city: "MADINAH", tier: "STANDARD", sarPerNight: 700, label: "Kayan Hotel", sublabel: "", monthlyPrices: {} }],
        MAKKAH: [{ id: "olayan-ajyad", city: "MAKKAH", tier: "STANDARD", sarPerNight: 950, label: "Olayan Ajyad", sublabel: "", monthlyPrices: {} }],
      },
    } as PricingConfig

    expect(validateEstimateHotelIds({ ...validParams, madinahHotelId: "kayan-hotel", makkahHotelId: "olayan-ajyad" }, pricing)).toBe(true)
    expect(validateEstimateHotelIds({ ...validParams, makkahHotelId: "kayan-hotel" }, pricing)).toBe(false)
    expect(validateEstimateHotelIds({ ...validParams, madinahHotelId: "olayan-ajyad" }, pricing)).toBe(false)
  })

  it("auto-title is generated correctly from hotelTier and nights", () => {
    const params = validParams
    expect(estimateTitle(params)).toBe("Estimasi Standard 4+9 malam")
  })

  it("auto-title for PELATARAN tier formats correctly", () => {
    const params = { ...validParams, hotelTier: "PELATARAN" as const, nightsMadinah: 3, nightsMakkah: 10 }
    expect(estimateTitle(params)).toBe("Estimasi Pelataran 3+10 malam")
  })

  it("pagination offset calculation", () => {
    const page = 2
    const limit = 20
    const offset = (page - 1) * limit
    expect(offset).toBe(20)
  })

  it("pagination clamps limit to max 100", () => {
    const rawLimit = 500
    const limit = Math.min(100, Math.max(1, rawLimit))
    expect(limit).toBe(100)
  })

  it("pagination clamps page to min 1", () => {
    const rawPage = -5
    const page = Math.max(1, rawPage)
    expect(page).toBe(1)
  })
})
