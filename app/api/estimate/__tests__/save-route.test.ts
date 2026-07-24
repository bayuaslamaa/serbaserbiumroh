import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({
  NextRequest: class {
    url: string
    private body: unknown

    constructor(url: string, init?: { body?: string }) {
      this.url = url
      this.body = init?.body ? JSON.parse(init.body) : {}
    }

    async json() {
      return this.body
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

vi.mock("@/lib/db/schema", () => ({
  estimates: {},
}))

vi.mock("@/lib/budget/calculate", () => ({
  fetchPricingConfig: vi.fn(),
  calculateBudget: vi.fn(),
}))

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count"),
  desc: vi.fn((value) => value),
  eq: vi.fn((a, b) => ({ a, b })),
}))

vi.mock("@/lib/logging/activity-log", () => ({
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  logActivity: vi.fn(),
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { calculateBudget, fetchPricingConfig } from "@/lib/budget/calculate"
import { logActivity } from "@/lib/logging/activity-log"
import type { BudgetBreakdown, EstimateParams } from "@/types"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  insert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
}
const mockFetchPricingConfig = fetchPricingConfig as ReturnType<typeof vi.fn>
const mockCalculateBudget = calculateBudget as ReturnType<typeof vi.fn>
const mockLogActivity = logActivity as ReturnType<typeof vi.fn>

const session = { user: { id: "user-1", role: "USER" } }
const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 8,
  pax: 2,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT"],
  fullboard: true,
}
// Full breakdown fixture so the real applyOverrides can run. Rows sum to 25M/person.
const detail = {
  label: "Hotel X", tier: "STANDARD" as const, sarPerNight: 650, nights: 4,
  roomPax: 4, roomCount: 1, totalPax: 2, roomMultiplier: 1,
}
const breakdown: BudgetBreakdown = {
  hotelMadinahIdr: 5_000_000,
  hotelMakkahIdr: 10_000_000,
  hotelMadinahDetail: detail,
  hotelMakkahDetail: detail,
  servicesIdr: 5_000_000,
  serviceItems: [{ key: "VISA", label: "Visa", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 5_000_000, divideByPax: false }],
  flightIdr: 5_000_000,
  totalIdrPax: 25_000_000,
  totalIdrGrp: 50_000_000,
  sarRate: 4700,
  usdRate: 17300,
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/estimate", {
    body: JSON.stringify(body),
  })
}

function mockInsertReturning(value: unknown) {
  const returning = vi.fn().mockResolvedValue([value])
  const values = vi.fn().mockReturnValue({ returning })
  mockDb.insert.mockReturnValue({ values })
  return { values, returning }
}

function mockSourceEstimate(value: unknown) {
  mockDb.select.mockReturnValue({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([value]) })),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(session)
  mockFetchPricingConfig.mockResolvedValue({ hotelOptions: { MADINAH: [], MAKKAH: [] } })
  mockCalculateBudget.mockReturnValue(breakdown)
})

describe("POST /api/estimate logging", () => {
  it("logs saved estimates with totals and estimate id", async () => {
    mockInsertReturning({ id: "estimate-1", userId: "user-1" })
    const { POST } = await import("../route")

    const res = await POST(request({ rawInput: "umroh 2 pax", params, aiNotes: "parsed" }))

    expect(res.status).toBe(201)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        flow: "estimate",
        event: "estimate_save",
        status: "SUCCESS",
        entityType: "estimate",
        entityId: "estimate-1",
        output: expect.objectContaining({
          estimateId: "estimate-1",
          totalIdrPax: 25000000,
          totalIdrGrp: 50000000,
        }),
      })
    )
  })

  it("logs validation failures before returning an error", async () => {
    const { POST } = await import("../route")

    const res = await POST(request({ rawInput: "", params }))

    expect(res.status).toBe(400)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        flow: "estimate",
        event: "estimate_save",
        status: "ERROR",
        error: "rawInput is required",
        metadata: { stage: "validation" },
      })
    )
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})

describe("POST /api/estimate manual overrides", () => {
  it("allows an owner to duplicate persisted admin-authored overrides", async () => {
    const manualOverrides = {
      overrides: { flight: { idr: 12_000_000 } },
      customRows: [{ id: "c1", label: "Manasik", idr: 300_000 }],
    }
    mockSourceEstimate({
      id: "source-1",
      userId: "user-1",
      rawInput: "umroh",
      params,
      aiNotes: null,
      title: "Estimasi Asli",
      manualOverrides,
    })
    const { values } = mockInsertReturning({ id: "copy-1", userId: "user-1" })
    const { POST } = await import("../route")

    const res = await POST(request({ sourceEstimateId: "source-1" }))

    expect(res.status).toBe(201)
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      title: "Duplikat — Estimasi Asli",
      manualOverrides,
      totalIdrPax: 32_300_000,
      totalIdrGrp: 64_600_000,
    }))
  })

  it("rejects duplicating another user's estimate", async () => {
    mockSourceEstimate({
      id: "source-2",
      userId: "other-user",
      rawInput: "umroh",
      params,
      aiNotes: null,
      title: "Estimasi Orang Lain",
      manualOverrides: null,
    })
    const { POST } = await import("../route")

    const res = await POST(request({ sourceEstimateId: "source-2" }))

    expect(res.status).toBe(403)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("stores null overrides and raw totals when none are provided", async () => {
    const { values } = mockInsertReturning({ id: "estimate-1", userId: "user-1" })
    const { POST } = await import("../route")

    const res = await POST(request({ rawInput: "umroh", params }))

    expect(res.status).toBe(201)
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ manualOverrides: null, totalIdrPax: 25_000_000, totalIdrGrp: 50_000_000 })
    )
  })

  it("admin: persists overrides and override-aware totals", async () => {
    mockAuth.mockResolvedValue(adminSession)
    const { values } = mockInsertReturning({ id: "estimate-2", userId: "admin-1" })
    const { POST } = await import("../route")

    const manualOverrides = { overrides: { hotelMakkah: { idr: 12_000_000 } }, customRows: [] }
    const res = await POST(request({ rawInput: "umroh", params, manualOverrides }))

    expect(res.status).toBe(201)
    // 25M base - 10M makkah + 12M override = 27M/person, x2 pax = 54M
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ manualOverrides, totalIdrPax: 27_000_000, totalIdrGrp: 54_000_000 })
    )
  })

  it("rejects malformed overrides with 400 and does not insert", async () => {
    mockAuth.mockResolvedValue(adminSession)
    const { POST } = await import("../route")

    const res = await POST(request({ rawInput: "umroh", params, manualOverrides: { overrides: { bogus: { idr: 1 } }, customRows: [] } }))

    expect(res.status).toBe(400)
    expect((res as unknown as { body: { error: string } }).body.error).toBe("manual overrides invalid")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("rejects non-admin overrides with 403", async () => {
    const { POST } = await import("../route")

    const res = await POST(request({ rawInput: "umroh", params, manualOverrides: { overrides: { flight: { idr: 1_000_000 } }, customRows: [] } }))

    expect(res.status).toBe(403)
    expect((res as unknown as { body: { error: string } }).body.error).toBe("manual overrides require admin")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("rejects totals that exceed the database integer range", async () => {
    mockAuth.mockResolvedValue(adminSession)
    const { POST } = await import("../route")

    const res = await POST(request({
      rawInput: "umroh",
      params,
      manualOverrides: {
        overrides: { flight: { idr: 2_147_483_647 } },
        customRows: [],
      },
    }))

    expect(res.status).toBe(400)
    expect((res as unknown as { body: { error: string } }).body.error).toBe("estimate total exceeds supported range")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
