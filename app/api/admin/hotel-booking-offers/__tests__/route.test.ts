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
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("drizzle-orm", () => ({
  desc: vi.fn((field) => field),
  eq: vi.fn((field, value) => ({ field, value })),
}))

vi.mock("@/lib/db/schema", () => ({
  hotelBookingOffers: {
    id: "hotel_booking_offers.id",
    updatedAt: "hotel_booking_offers.updated_at",
  },
}))

import { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { db } from "@/lib/db"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }

const validPayload = {
  city: "MAKKAH",
  tier: "STANDARD",
  hotelName: "Safwa Tower 3",
  periodStart: "2026-02-15",
  periodEnd: "2026-03-05",
  roomBasis: "per kamar per malam",
  currency: "SAR",
  priceAmount: 1450,
  status: "ACTIVE",
}

const existingOffer = {
  id: "offer-1",
  city: "MAKKAH",
  tier: "STANDARD",
  hotelName: "Safwa Tower 3",
  hotelListingId: null,
  offerLabel: "",
  periodStart: new Date("2026-02-15T00:00:00.000Z"),
  periodEnd: new Date("2026-03-05T00:00:00.000Z"),
  periodLabel: "",
  roomBasis: "per kamar per malam",
  currency: "SAR",
  priceAmount: 1450,
  status: "ACTIVE",
  notes: "",
  terms: "",
  importKey: "MAKKAH:STANDARD:safwa tower 3:2026-02-15:2026-03-05:per kamar per malam:",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
}

function request(body: Record<string, unknown> = validPayload) {
  return new NextRequest("http://localhost/api/admin/hotel-booking-offers", {
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
})

describe("admin hotel booking offer routes", () => {
  it("revalidates /pesan-hotel after creating an offer", async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...existingOffer, id: "offer-new" }]),
      }),
    })
    const { POST } = await import("../route")

    const response = await POST(request())

    expect(response.status).toBe(201)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/pesan-hotel")
  })

  it("revalidates /pesan-hotel after updating an offer", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existingOffer]),
        }),
      }),
    })
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...existingOffer, priceAmount: 1500 }]),
        }),
      }),
    })
    const { PUT } = await import("../[id]/route")

    const response = await PUT(request({ priceAmount: 1500 }), { params: Promise.resolve({ id: "offer-1" }) })

    expect(response.status).toBe(200)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/pesan-hotel")
  })

  it("revalidates /pesan-hotel after deleting an offer", async () => {
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([existingOffer]),
      }),
    })
    const { DELETE } = await import("../[id]/route")

    const response = await DELETE(request(), { params: Promise.resolve({ id: "offer-1" }) })

    expect(response.status).toBe(200)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/pesan-hotel")
  })
})
