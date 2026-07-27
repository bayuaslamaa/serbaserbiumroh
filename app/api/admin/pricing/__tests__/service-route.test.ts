import { beforeEach, describe, expect, it, vi } from "vitest"

// PATCH /api/admin/pricing/service is the surface that prices a service key. It used to keep its
// own hardcoded copy of the key list, so a key added to the estimator stayed unpriceable here
// until someone remembered this file. These tests drive the real route to prove the copy is gone.

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

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column, value) => ({ column, value })),
  and: vi.fn((...parts) => ({ and: parts })),
}))

vi.mock("@/lib/db/schema", () => ({
  exchangeRates: { currency: "exchange_rates.currency" },
  hotelPrices: { id: "hotel_prices.id" },
  airlinePrices: { id: "airline_prices.id" },
  serviceFees: { key: "service_fees.key" },
  hotelMonthlyPrices: { id: "hotel_monthly_prices.id" },
  airlineMonthlyPrices: { id: "airline_monthly_prices.id" },
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { SERVICE_KEYS } from "@/types"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { update: ReturnType<typeof vi.fn> }

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/pricing/service", { body: JSON.stringify(body) })
}

const ctx = { params: Promise.resolve({ category: "service" }) }

// Captures what the route asked the database to write, and answers with a row so the route
// reaches its success branch.
function captureUpdate() {
  const returning = vi.fn().mockResolvedValue([{ key: "stub", amount: 0 }])
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  mockDb.update.mockReturnValue({ set })
  return { set, where, returning }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
})

describe("PATCH /api/admin/pricing/service", () => {
  it("prices MUTHOWIF — the key seeded disabled, waiting for its real figure", async () => {
    const spies = captureUpdate()
    const { PATCH } = await import("../[category]/route")

    const res = await PATCH(request({ key: "MUTHOWIF", amount: 100, enabled: true }), ctx)

    expect(res.status).toBe(200)
    expect(spies.set).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, enabled: true }))
  })

  it("prices a transport leg", async () => {
    const spies = captureUpdate()
    const { PATCH } = await import("../[category]/route")

    const res = await PATCH(request({ key: "TRANSPORT_JED_MAKKAH", amount: 425 }), ctx)

    expect(res.status).toBe(200)
    expect(spies.set).toHaveBeenCalledWith(expect.objectContaining({ amount: 425 }))
  })

  it("accepts every key the estimator can offer", async () => {
    const { PATCH } = await import("../[category]/route")

    for (const key of SERVICE_KEYS) {
      captureUpdate()
      const res = await PATCH(request({ key, amount: 100 }), ctx)
      expect(res.status, `key ${key} was rejected`).toBe(200)
    }
  })

  it("rejects a key outside the catalogue", async () => {
    const spies = captureUpdate()
    const { PATCH } = await import("../[category]/route")

    const res = await PATCH(request({ key: "TRANSPORT_JED_TAIF", amount: 100 }), ctx)

    expect(res.status).toBe(400)
    expect(spies.set).not.toHaveBeenCalled()
  })

  it("rejects a non-positive amount", async () => {
    const spies = captureUpdate()
    const { PATCH } = await import("../[category]/route")

    const res = await PATCH(request({ key: "MUTHOWIF", amount: 0 }), ctx)

    expect(res.status).toBe(400)
    expect(spies.set).not.toHaveBeenCalled()
  })

  it("404s when the key has no row yet", async () => {
    const returning = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ returning })
    mockDb.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where }) })
    const { PATCH } = await import("../[category]/route")

    const res = await PATCH(request({ key: "MUTHOWIF", amount: 100 }), ctx)

    expect(res.status).toBe(404)
  })

  it("requires an admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    const spies = captureUpdate()
    const { PATCH } = await import("../[category]/route")

    const res = await PATCH(request({ key: "MUTHOWIF", amount: 100 }), ctx)

    expect(res.status).toBe(403)
    expect(spies.set).not.toHaveBeenCalled()
  })
})
