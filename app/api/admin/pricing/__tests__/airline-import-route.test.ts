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
  NextResponse: class {
    status: number
    body: unknown
    headers: Headers

    constructor(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
      this.status = init?.status ?? 200
      this.body = body
      this.headers = new Headers(init?.headers)
    }

    static json(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
      return {
        status: init?.status ?? 200,
        body,
        headers: new Headers(init?.headers),
      }
    }
  },
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}))

vi.mock("@/lib/db/schema", () => ({
  airlinePrices: {
    id: "airline_prices.id",
    tier: "airline_prices.tier",
  },
  airlineMonthlyPrices: {
    airlinePriceId: "airline_monthly_prices.airline_price_id",
  },
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { airlineMonthlyPrices, airlinePrices } from "@/lib/db/schema"
import { AIRLINE_PRICING_IMPORT_MAX_ROWS } from "@/lib/admin/airline-pricing-import"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

const existingAirline = {
  id: "airline-1",
  tier: "STANDARD",
  label: "Batik Air",
  importKey: "STANDARD:batik air",
  isDefault: true,
}

function request(csv: string) {
  return new NextRequest("http://localhost/api/admin/pricing/airline-import", {
    body: JSON.stringify({ csv }),
  })
}

function selectExisting(rows: unknown[]) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockResolvedValue(rows),
  })
}

function makeTx() {
  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set: updateSet })

  const monthlyValues = vi.fn().mockResolvedValue(undefined)
  const airlineReturning = vi.fn().mockResolvedValue([{ id: "new-airline" }])
  const airlineValues = vi.fn().mockReturnValue({ returning: airlineReturning })
  const insert = vi.fn((table) => {
    if (table === airlinePrices) return { values: airlineValues }
    if (table === airlineMonthlyPrices) return { values: monthlyValues }
    return { values: vi.fn().mockResolvedValue(undefined) }
  })

  const deleteWhere = vi.fn().mockResolvedValue(undefined)
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere })

  return {
    tx: {
      update,
      insert,
      delete: deleteFn,
    },
    spies: {
      update,
      updateSet,
      updateWhere,
      insert,
      airlineValues,
      airlineReturning,
      monthlyValues,
      deleteFn,
      deleteWhere,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
})

describe("POST /api/admin/pricing/airline-import/preview", () => {
  it("previews valid CSV without writing", async () => {
    selectExisting([])
    const { POST } = await import("../airline-import/preview/route")

    const res = await POST(
      request("tier,label,sublabel,base_idr_per_person\nSTANDARD,Batik Air,Standard,14500000\n")
    )

    expect(res.status).toBe(200)
    expect((res.body as any).preview.summary.create).toBe(1)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it("classifies matching rows as updates during preview", async () => {
    selectExisting([existingAirline])
    const { POST } = await import("../airline-import/preview/route")

    const res = await POST(
      request("tier,label,sublabel,base_idr_per_person\nSTANDARD,Batik Air,Standard,15000000\n")
    )

    expect((res.body as any).preview.summary.update).toBe(1)
    expect((res.body as any).preview.rows[0].existingAirlineId).toBe("airline-1")
  })

  it("requires admin auth", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { POST } = await import("../airline-import/preview/route")

    const res = await POST(request("tier,label,base_idr_per_person\nSTANDARD,Batik Air,14500000\n"))

    expect(res.status).toBe(403)
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("rejects CSVs with too many rows", async () => {
    selectExisting([])
    const { POST } = await import("../airline-import/preview/route")
    const rows = Array.from({ length: AIRLINE_PRICING_IMPORT_MAX_ROWS + 1 }, (_, i) =>
      `STANDARD,Airline ${i},Standard,14500000`
    )

    const res = await POST(request("tier,label,sublabel,base_idr_per_person\n" + rows.join("\n")))

    expect(res.status).toBe(413)
    expect((res.body as any).error).toContain("rows or fewer")
  })
})

describe("POST /api/admin/pricing/airline-import/confirm", () => {
  it("updates an existing airline and replaces monthly prices", async () => {
    selectExisting([existingAirline])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../airline-import/confirm/route")

    const res = await POST(
      request("tier,label,sublabel,base_idr_per_person,is_default\nSTANDARD,Batik Air,Standard,15000000,true\n")
    )

    expect(res.status).toBe(200)
    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows).toEqual([
      {
        rowNumber: 2,
        importKey: "STANDARD:batik air",
        status: "update",
        airlineId: "airline-1",
        monthlyRowCount: 12,
        isDefault: true,
      },
    ])
    expect(spies.update).toHaveBeenCalledWith(airlinePrices)
    expect(spies.airlineValues).not.toHaveBeenCalled()
    expect(spies.deleteFn).toHaveBeenCalledWith(airlineMonthlyPrices)
    expect(spies.monthlyValues.mock.calls[0][0]).toHaveLength(12)
  })

  it("creates a unique airline with 12 monthly rows", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../airline-import/confirm/route")

    const res = await POST(
      request("tier,label,sublabel,base_idr_per_person\nGARUDA,Garuda Indonesia,Direct,17000000\n")
    )

    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows[0]).toEqual(
      expect.objectContaining({
        rowNumber: 2,
        importKey: "GARUDA:garuda indonesia",
        status: "create",
        airlineId: "new-airline",
        monthlyRowCount: 12,
        isDefault: false,
      })
    )
    expect(spies.airlineValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "GARUDA",
        label: "Garuda Indonesia",
        importKey: "GARUDA:garuda indonesia",
      })
    )
    expect(spies.monthlyValues.mock.calls[0][0]).toHaveLength(12)
  })

  it("writes only valid rows from a mixed CSV", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../airline-import/confirm/route")

    const res = await POST(
      request(
        "tier,label,sublabel,base_idr_per_person\n" +
          "STANDARD,Batik Air,Standard,14500000\n" +
          "EMIRATES,Bad Row,Invalid,1000\n"
      )
    )

    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).preview.summary.invalid).toBe(1)
    expect(spies.airlineValues).toHaveBeenCalledTimes(1)
  })

  it("does not write duplicate rows from the same CSV", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../airline-import/confirm/route")

    const res = await POST(
      request(
        "tier,label,sublabel,base_idr_per_person\n" +
          "STANDARD,Batik Air,Standard,14500000\n" +
          "standard, Batik Air ,Standard,15000000\n"
      )
    )

    expect((res.body as any).applied).toBe(0)
    expect((res.body as any).preview.summary.conflict).toBe(2)
    expect(mockDb.transaction).not.toHaveBeenCalled()
    expect(spies.airlineValues).not.toHaveBeenCalled()
  })

  it("blocks unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("../airline-import/confirm/route")

    const res = await POST(request("tier,label,base_idr_per_person\nSTANDARD,Batik Air,14500000\n"))

    expect(res.status).toBe(401)
    expect(mockDb.select).not.toHaveBeenCalled()
  })
})
