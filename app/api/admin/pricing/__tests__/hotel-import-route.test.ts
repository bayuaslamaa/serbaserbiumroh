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
  hotelPrices: {
    id: "hotel_prices.id",
    slug: "hotel_prices.slug",
  },
  hotelMonthlyPrices: {
    hotelPriceId: "hotel_monthly_prices.hotel_price_id",
  },
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelMonthlyPrices, hotelPrices } from "@/lib/db/schema"
import {
  HOTEL_PRICING_IMPORT_MAX_ROWS,
  HOTEL_PRICING_IMPORT_TEMPLATE,
} from "@/lib/admin/hotel-pricing-import"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

const existingHotel = {
  id: "hotel-1",
  city: "MAKKAH",
  tier: "STANDARD",
  label: "Safwa Tower 3",
  importKey: "MAKKAH:STANDARD:safwa tower 3",
}

function request(csv: string) {
  return new NextRequest("http://localhost/api/admin/pricing/hotel-import", {
    body: JSON.stringify({ csv }),
  })
}

function selectExisting(rows: unknown[]) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockResolvedValue(rows),
  })
}

function makeTx(existingSlugs: Array<{ slug: string | null }> = []) {
  // The confirm route reads taken slugs inside the transaction before each
  // insert, so rows created earlier in the same import cannot collide.
  const selectFrom = vi.fn().mockResolvedValue(existingSlugs)
  const select = vi.fn().mockReturnValue({ from: selectFrom })

  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set: updateSet })

  const monthlyValues = vi.fn().mockResolvedValue(undefined)
  const hotelReturning = vi.fn().mockResolvedValue([{ id: "new-hotel" }])
  const hotelValues = vi.fn().mockReturnValue({ returning: hotelReturning })
  const insert = vi.fn((table) => {
    if (table === hotelPrices) return { values: hotelValues }
    if (table === hotelMonthlyPrices) return { values: monthlyValues }
    return { values: vi.fn().mockResolvedValue(undefined) }
  })

  const deleteWhere = vi.fn().mockResolvedValue(undefined)
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere })

  return {
    tx: {
      select,
      update,
      insert,
      delete: deleteFn,
    },
    spies: {
      select,
      update,
      updateSet,
      updateWhere,
      insert,
      hotelValues,
      hotelReturning,
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

describe("POST /api/admin/pricing/hotel-import/preview", () => {
  it("previews valid CSV without writing", async () => {
    selectExisting([])
    const { POST } = await import("../hotel-import/preview/route")

    const res = await POST(
      request("city,tier,label,sublabel,base_sar_per_night\nMAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300\n")
    )

    expect(res.status).toBe(200)
    expect((res.body as any).preview.summary.create).toBe(1)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it("classifies matching rows as updates during preview", async () => {
    selectExisting([existingHotel])
    const { POST } = await import("../hotel-import/preview/route")

    const res = await POST(
      request("city,tier,label,sublabel,base_sar_per_night\nMAKKAH,STANDARD,Safwa Tower 3,Near Haram,1400\n")
    )

    expect((res.body as any).preview.summary.update).toBe(1)
    expect((res.body as any).preview.rows[0].existingHotelId).toBe("hotel-1")
  })

  it("requires admin auth", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { POST } = await import("../hotel-import/preview/route")

    const res = await POST(request("city,tier,label,base_sar_per_night\nMAKKAH,STANDARD,Safwa,1300\n"))

    expect(res.status).toBe(403)
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("rejects CSVs with too many rows", async () => {
    selectExisting([])
    const { POST } = await import("../hotel-import/preview/route")
    const rows = Array.from({ length: HOTEL_PRICING_IMPORT_MAX_ROWS + 1 }, (_, i) =>
      `MAKKAH,STANDARD,Hotel ${i},Near Haram,1300`
    )

    const res = await POST(request("city,tier,label,sublabel,base_sar_per_night\n" + rows.join("\n")))

    expect(res.status).toBe(413)
    expect((res.body as any).error).toContain("rows or fewer")
  })
})

describe("POST /api/admin/pricing/hotel-import/confirm", () => {
  it("updates an existing hotel and replaces monthly prices", async () => {
    selectExisting([existingHotel])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    const res = await POST(
      request(
        "city,tier,label,sublabel,distance,agoda_url,bookingcom_url,tripcom_url,booking_url,base_sar_per_night\n" +
          "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,250m jalan kaki,https://www.agoda.com/safwa,https://www.booking.com/safwa,https://www.trip.com/safwa,https://example.com/book/safwa,1400\n"
      )
    )

    expect(res.status).toBe(200)
    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows).toEqual([
      {
        rowNumber: 2,
        importKey: "MAKKAH:STANDARD:safwa tower 3",
        status: "update",
        hotelId: "hotel-1",
        monthlyRowCount: 12,
      },
    ])
    expect(spies.update).toHaveBeenCalledWith(hotelPrices)
    expect(spies.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        distance: "250m jalan kaki",
        agodaUrl: "https://www.agoda.com/safwa",
        bookingcomUrl: "https://www.booking.com/safwa",
        tripcomUrl: "https://www.trip.com/safwa",
        bookingUrl: "https://example.com/book/safwa",
      })
    )
    expect(spies.hotelValues).not.toHaveBeenCalled()
    expect(spies.deleteFn).toHaveBeenCalledWith(hotelMonthlyPrices)
    expect(spies.monthlyValues.mock.calls[0][0]).toHaveLength(12)
  })

  it("creates a unique hotel with 12 monthly rows", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    const res = await POST(
      request("city,tier,label,sublabel,distance,base_sar_per_night\nMADINAH,PREMIUM,Hotel Royal,Near Nabawi,ring 1 dekat Nabawi,3500\n")
    )

    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows[0]).toEqual(
      expect.objectContaining({
        rowNumber: 2,
        importKey: "MADINAH:PREMIUM:hotel royal",
        status: "create",
        hotelId: "new-hotel",
        monthlyRowCount: 12,
      })
    )
    expect(spies.hotelValues).toHaveBeenCalledWith(
      expect.objectContaining({
        city: "MADINAH",
        tier: "PREMIUM",
        label: "Hotel Royal",
        distance: "ring 1 dekat Nabawi",
        importKey: "MADINAH:PREMIUM:hotel royal",
        slug: "hotel-royal",
      })
    )
    expect(spies.monthlyValues.mock.calls[0][0]).toHaveLength(12)
  })

  it("gives an imported hotel a slug that dodges the ones already taken", async () => {
    selectExisting([])
    const { tx, spies } = makeTx([{ slug: "hotel-royal" }, { slug: "hotel-royal-2" }])
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    await POST(
      request("city,tier,label,sublabel,distance,base_sar_per_night\nMADINAH,PREMIUM,Hotel Royal,Near Nabawi,ring 1,3500\n")
    )

    expect(spies.hotelValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "hotel-royal-3" }),
    )
  })

  it("leaves the slug alone when re-importing an existing hotel", async () => {
    // Renaming a hotel through a re-import must not move its indexed URL.
    selectExisting([existingHotel])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    await POST(
      request("city,tier,label,sublabel,base_sar_per_night\nMAKKAH,STANDARD,Safwa Tower 3,Renamed Wing,1400\n")
    )

    expect(spies.updateSet).toHaveBeenCalled()
    expect(spies.updateSet.mock.calls[0][0]).not.toHaveProperty("slug")
    expect(spies.hotelValues).not.toHaveBeenCalled()
  })

  it("writes only valid rows from a mixed CSV", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    const res = await POST(
      request(
        "city,tier,label,sublabel,base_sar_per_night\n" +
          "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300\n" +
          "ISTANBUL,STANDARD,Bad Row,Invalid,1000\n"
      )
    )

    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).preview.summary.invalid).toBe(1)
    expect(spies.hotelValues).toHaveBeenCalledTimes(1)
  })

  it("skips invalid rows with malformed booking URLs", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    const res = await POST(
      request(
        "city,tier,label,sublabel,agoda_url,base_sar_per_night\n" +
          "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,notaurl,1300\n"
      )
    )

    expect((res.body as any).applied).toBe(0)
    expect((res.body as any).preview.summary.invalid).toBe(1)
    expect(spies.hotelValues).not.toHaveBeenCalled()
  })

  it("does not write duplicate rows from the same CSV", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../hotel-import/confirm/route")

    const res = await POST(
      request(
        "city,tier,label,sublabel,base_sar_per_night\n" +
          "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300\n" +
          "makkah,standard, Safwa Tower 3 ,Near Haram,1400\n"
      )
    )

    expect((res.body as any).applied).toBe(0)
    expect((res.body as any).preview.summary.conflict).toBe(2)
    expect(mockDb.transaction).not.toHaveBeenCalled()
    expect(spies.hotelValues).not.toHaveBeenCalled()
  })

  it("blocks unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("../hotel-import/confirm/route")

    const res = await POST(request("city,tier,label,base_sar_per_night\nMAKKAH,STANDARD,Safwa,1300\n"))

    expect(res.status).toBe(401)
    expect(mockDb.select).not.toHaveBeenCalled()
  })
})

describe("GET /api/admin/pricing/hotel-import/template", () => {
  it("returns the canonical CSV template for admins", async () => {
    const { GET } = await import("../hotel-import/template/route")

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.body).toBe(HOTEL_PRICING_IMPORT_TEMPLATE)
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="hotel-pricing-import-template.csv"')
  })

  it("blocks non-admin template downloads", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { GET } = await import("../hotel-import/template/route")

    const res = await GET()

    expect(res.status).toBe(403)
  })

  it("blocks unauthenticated template downloads", async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import("../hotel-import/template/route")

    const res = await GET()

    expect(res.status).toBe(401)
  })
})
