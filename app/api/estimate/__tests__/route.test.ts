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

import type { EstimateParams } from "@/types"

const validParams: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT"],
  fullboard: true,
}

describe("Estimate params validation", () => {
  it("valid params pass validation shape", () => {
    const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
    const ROOM_TYPES = ["QUAD", "TRIPLE", "DOUBLE", "SINGLE"]
    const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"]
    const SERVICE_KEYS = ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"]

    function validateParams(p: unknown): p is EstimateParams {
      if (!p || typeof p !== "object") return false
      const o = p as Record<string, unknown>
      return (
        typeof o.nightsMadinah === "number" &&
        typeof o.nightsMakkah === "number" &&
        typeof o.pax === "number" &&
        HOTEL_TIERS.includes(o.hotelTier as string) &&
        ROOM_TYPES.includes(o.roomType as string) &&
        AIRLINE_TIERS.includes(o.airline as string) &&
        Array.isArray(o.services) &&
        (o.services as string[]).every((s) => SERVICE_KEYS.includes(s)) &&
        typeof o.fullboard === "boolean"
      )
    }

    expect(validateParams(validParams)).toBe(true)
    expect(validateParams({})).toBe(false)
    expect(validateParams({ ...validParams, hotelTier: "INVALID" })).toBe(false)
    expect(validateParams({ ...validParams, services: ["VISA", "UNKNOWN_KEY"] })).toBe(false)
    expect(validateParams({ ...validParams, pax: "one" })).toBe(false)
  })

  it("auto-title is generated correctly from hotelTier and nights", () => {
    const params = validParams
    const hotelTierLabel = params.hotelTier.charAt(0) + params.hotelTier.slice(1).toLowerCase()
    const title = `Estimasi ${hotelTierLabel} ${params.nightsMadinah}+${params.nightsMakkah} malam`
    expect(title).toBe("Estimasi Standard 4+9 malam")
  })

  it("auto-title for PELATARAN tier formats correctly", () => {
    const params = { ...validParams, hotelTier: "PELATARAN" as const, nightsMadinah: 3, nightsMakkah: 10 }
    const hotelTierLabel = params.hotelTier.charAt(0) + params.hotelTier.slice(1).toLowerCase()
    const title = `Estimasi ${hotelTierLabel} ${params.nightsMadinah}+${params.nightsMakkah} malam`
    expect(title).toBe("Estimasi Pelataran 3+10 malam")
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
