import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({
  NextRequest: class {
    private body: unknown

    constructor(_url: string, init?: { body?: string }) {
      this.body = init?.body ? JSON.parse(init.body) : {}
    }

    async json() {
      return this.body
    }
  },
  NextResponse: class {
    static json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        body,
      }
    }
  },
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
  eq: vi.fn((field, value) => ({ field, value })),
}))

vi.mock("@/lib/db/schema", () => ({
  hotelBookingOffers: {
    id: "hotel_booking_offers.id",
  },
  hotelListings: {
    id: "hotel_listings.id",
    slug: "hotel_listings.slug",
  },
}))

import { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { db } from "@/lib/db"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>

function request(csv: string) {
  return new NextRequest("http://localhost/api/admin/hotel-booking-offers/import/confirm", {
    body: JSON.stringify({ csv }),
  })
}

function mockSelectRows(existingOffers: unknown[] = [], listings: unknown[] = []) {
  mockDb.select
    .mockReturnValueOnce({
      from: vi.fn().mockResolvedValue(existingOffers),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockResolvedValue(listings),
    })
}

function makeTx() {
  const returning = vi.fn().mockResolvedValue([{ id: "offer-1" }])
  const values = vi.fn().mockReturnValue({ returning })
  const insert = vi.fn().mockReturnValue({ values })
  return { insert, update: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
})

describe("POST /api/admin/hotel-booking-offers/import/confirm", () => {
  it("revalidates /pesan-hotel after applying writable import rows", async () => {
    mockSelectRows()
    const tx = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../confirm/route")

    const response = await POST(
      request(
        "city,tier,hotel_name,period_start,period_end,room_basis,currency,price_amount,status\n" +
          "MAKKAH,STANDARD,Safwa Tower 3,2026-02-15,2026-03-05,per kamar per malam,SAR,1450,ACTIVE\n"
      )
    )

    expect(response.status).toBe(200)
    expect((response.body as any).applied).toBe(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/pesan-hotel")
  })

  it("does not revalidate for preview-only invalid import rows", async () => {
    mockSelectRows()
    const { POST } = await import("../confirm/route")

    const response = await POST(
      request(
        "city,tier,hotel_name,period_start,period_end,room_basis,currency,price_amount,status\n" +
          "MAKKAH,STANDARD,Safwa Tower 3,2026-03-10,2026-03-05,per kamar per malam,SAR,0,ACTIVE\n"
      )
    )

    expect(response.status).toBe(200)
    expect((response.body as any).applied).toBe(0)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
