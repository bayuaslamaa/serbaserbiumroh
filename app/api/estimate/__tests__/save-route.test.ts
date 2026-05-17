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
import type { EstimateParams } from "@/types"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  insert: ReturnType<typeof vi.fn>
}
const mockFetchPricingConfig = fetchPricingConfig as ReturnType<typeof vi.fn>
const mockCalculateBudget = calculateBudget as ReturnType<typeof vi.fn>
const mockLogActivity = logActivity as ReturnType<typeof vi.fn>

const session = { user: { id: "user-1", role: "USER" } }
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
const breakdown = { totalIdrPax: 25000000, totalIdrGrp: 50000000 }

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
