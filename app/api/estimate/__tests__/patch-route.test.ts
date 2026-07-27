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
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}))

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn() } }))
vi.mock("@/lib/db/schema", () => ({ estimates: {} }))
vi.mock("@/lib/budget/calculate", () => ({ fetchPricingConfig: vi.fn(), calculateBudget: vi.fn() }))
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => ({ conditions })),
  eq: vi.fn((a, b) => ({ a, b })),
  gte: vi.fn((a, b) => ({ a, b, operator: "gte" })),
  lt: vi.fn((a, b) => ({ a, b, operator: "lt" })),
}))
vi.mock("@/lib/logging/activity-log", () => ({
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  logActivity: vi.fn(),
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { calculateBudget, fetchPricingConfig } from "@/lib/budget/calculate"
import { logActivity } from "@/lib/logging/activity-log"
import type { BudgetBreakdown, EstimateParams } from "@/types"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
const mockFetchPricing = fetchPricingConfig as ReturnType<typeof vi.fn>
const mockCalc = calculateBudget as ReturnType<typeof vi.fn>
const mockLogActivity = logActivity as ReturnType<typeof vi.fn>

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }
const params: EstimateParams = {
  nightsMadinah: 4, nightsMakkah: 8, pax: 2, hotelTier: "STANDARD",
  roomType: "QUAD", airline: "STANDARD", services: ["VISA"], fullboard: true,
}
const detail = { label: "Hotel X", tier: "STANDARD" as const, sarPerNight: 650, nights: 4, roomPax: 4, roomCount: 1, totalPax: 2, roomMultiplier: 1 }
const breakdown: BudgetBreakdown = {
  hotelMadinahIdr: 5_000_000, hotelMakkahIdr: 10_000_000, hotelMadinahDetail: detail, hotelMakkahDetail: detail,
  servicesIdr: 5_000_000, serviceItems: [{ key: "VISA", label: "Visa", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 5_000_000, divideByPax: false }],
  flightIdr: 5_000_000, totalIdrPax: 25_000_000, totalIdrGrp: 50_000_000, sarRate: 4700, usdRate: 17300,
}
const updatedAt = new Date("2026-07-12T00:00:00.000Z")

function req(body: unknown) {
  const value = body as Record<string, unknown>
  const withVersion = { expectedUpdatedAt: updatedAt.toISOString(), ...value }
  return new NextRequest("http://localhost/api/estimate/e1", { body: JSON.stringify(withVersion) })
}
const ctx = { params: Promise.resolve({ id: "e1" }) }

function mockExisting(row: unknown) {
  mockDb.select.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ updatedAt, ...(row as Record<string, unknown>) }]),
    })),
  })
}
function mockUpdate(returnedRows: unknown[] = [{ id: "e1" }]) {
  const set = vi.fn((_updates: Record<string, unknown>) => ({
    where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(returnedRows) })),
  }))
  mockDb.update.mockReturnValue({ set })
  return set
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
  mockFetchPricing.mockResolvedValue({ hotelOptions: { MADINAH: [], MAKKAH: [] } })
  mockCalc.mockReturnValue(breakdown)
})

describe("PATCH /api/estimate/[id] manual overrides", () => {
  it("admin: persists overrides with override-aware totals", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const overrides = { overrides: { hotelMakkah: { idr: 12_000_000 } }, customRows: [] }
    const res = await PATCH(req({ manualOverrides: overrides }), ctx)

    expect(res.status).toBe(200)
    // 25M - 10M + 12M = 27M/person, x2 = 54M
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ manualOverrides: overrides, totalIdrPax: 27_000_000, totalIdrGrp: 54_000_000 })
    )
  })

  it("clears overrides (empty) back to null and restores raw totals", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: { overrides: { hotelMakkah: { idr: 99 } }, customRows: [] } })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ manualOverrides: { overrides: {}, customRows: [] } }), ctx)

    expect(res.status).toBe(200)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ manualOverrides: null, totalIdrPax: 25_000_000, totalIdrGrp: 50_000_000 })
    )
  })

  it("absent overrides: leaves the column untouched while recomputing with existing overrides", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: { overrides: { hotelMakkah: { idr: 12_000_000 } }, customRows: [] } })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ params: { ...params, nightsMakkah: 9 } }), ctx)

    expect(res.status).toBe(200)
    const arg = set.mock.calls[0][0] as Record<string, unknown>
    expect("manualOverrides" in arg).toBe(false) // column left unchanged
    expect(arg.totalIdrPax).toBe(27_000_000) // existing override still applied
  })

  it("rejects non-admin overrides with 403", async () => {
    mockAuth.mockResolvedValue(userSession)
    mockExisting({ id: "e1", userId: "user-1", params, manualOverrides: null })
    mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ manualOverrides: { overrides: { flight: { idr: 1 } }, customRows: [] } }), ctx)

    expect(res.status).toBe(403)
    expect((res as unknown as { body: { error: string } }).body.error).toBe("manual overrides require admin")
  })

  it.each([
    null,
    { overrides: {}, customRows: [] },
  ])("rejects a non-admin clearing overrides with %j", async (manualOverrides) => {
    mockAuth.mockResolvedValue(userSession)
    mockExisting({
      id: "e1",
      userId: "user-1",
      params,
      manualOverrides: { overrides: { flight: { idr: 1 } }, customRows: [] },
    })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ manualOverrides }), ctx)

    expect(res.status).toBe(403)
    expect(set).not.toHaveBeenCalled()
  })

  it("rejects aggregate totals that exceed the database integer range", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({
      manualOverrides: {
        overrides: { flight: { idr: 2_147_483_647 } },
        customRows: [],
      },
    }), ctx)

    expect(res.status).toBe(400)
    expect(set).not.toHaveBeenCalled()
  })

  it("rejects a stale override snapshot with 409", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const request = new NextRequest("http://localhost/api/estimate/e1", {
      body: JSON.stringify({
        manualOverrides: { overrides: { flight: { idr: 1 } }, customRows: [] },
        expectedUpdatedAt: "2026-07-11T00:00:00.000Z",
      }),
    })
    const res = await PATCH(request, ctx)

    expect(res.status).toBe(409)
    expect(set).not.toHaveBeenCalled()
  })

  it("requires a version precondition for parameter updates", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const request = new NextRequest("http://localhost/api/estimate/e1", {
      body: JSON.stringify({ params: { ...params, nightsMakkah: 9 } }),
    })
    const res = await PATCH(request, ctx)

    expect(res.status).toBe(428)
    expect(set).not.toHaveBeenCalled()
  })

  it("rejects an empty update instead of touching updatedAt without a version", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const request = new NextRequest("http://localhost/api/estimate/e1", { body: JSON.stringify({}) })
    const res = await PATCH(request, ctx)

    expect(res.status).toBe(400)
    expect(set).not.toHaveBeenCalled()
  })

  it("returns 409 when the atomic versioned update loses a race", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    mockUpdate([])
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({
      manualOverrides: { overrides: { flight: { idr: 1 } }, customRows: [] },
    }), ctx)

    expect(res.status).toBe(409)
  })

  it("rejects malformed admin overrides before updating", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ manualOverrides: { overrides: { bogus: { idr: 1 } }, customRows: [] } }), ctx)

    expect(res.status).toBe(400)
    expect(set).not.toHaveBeenCalled()
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "ERROR",
        error: "manual overrides invalid",
        metadata: { stage: "validation" },
      }),
    )
  })
})

describe("PATCH /api/estimate/[id] with a stored estimate that names a retired service key", () => {
  // The estimator seeds its reducer from the stored snapshot and posts it straight back on save.
  // If the retired key is only handled at the pricing boundary, the quote looks right on screen
  // and the save comes back a 400 — which is why this asserts on the re-save, not on the total.
  const legacyParams = { ...params, services: ["VISA", "TRANSPORT"] } as unknown as EstimateParams

  it("re-saves without a 400 and persists the legs in place of the retired key", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params: legacyParams, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ params: legacyParams }), ctx)

    expect(res.status).toBe(200)
    const written = set.mock.calls[0][0] as { params: EstimateParams }
    expect(written.params.services).toEqual([
      "VISA",
      "TRANSPORT_JED_MAKKAH",
      "TRANSPORT_MAKKAH_MADINAH",
      "TRANSPORT_MADINAH_JED",
    ])
  })

  it("re-costs against the legs when only the title changes and params come from the stored row", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params: legacyParams, manualOverrides: null })
    mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ params: legacyParams, title: "Judul Baru" }), ctx)

    expect(res.status).toBe(200)
    const costed = mockCalc.mock.calls[0][0] as EstimateParams
    expect(costed.services).not.toContain("TRANSPORT")
    expect(costed.services).toContain("TRANSPORT_MADINAH_JED")
  })

  it("still rejects a genuinely unknown service key", async () => {
    mockExisting({ id: "e1", userId: "admin-1", params, manualOverrides: null })
    const set = mockUpdate()
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(req({ params: { ...params, services: ["VISA", "NOT_A_SERVICE"] } }), ctx)

    expect(res.status).toBe(400)
    expect(set).not.toHaveBeenCalled()
  })
})
