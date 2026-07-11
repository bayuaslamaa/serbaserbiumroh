import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({
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

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("drizzle-orm", () => ({ asc: vi.fn((field) => field) }))
vi.mock("@/lib/db/schema", () => ({
  hotelPrices: {
    city: "hotel_prices.city",
    tier: "hotel_prices.tier",
    label: "hotel_prices.label",
    sublabel: "hotel_prices.sublabel",
    distance: "hotel_prices.distance",
    sarPerNight: "hotel_prices.sar_per_night",
  },
  hotelListings: {
    city: "hotel_listings.city",
    tier: "hotel_listings.tier",
    name: "hotel_listings.name",
    slug: "hotel_listings.slug",
  },
}))

import { auth } from "@/auth"
import { db } from "@/lib/db"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockSelect = db.select as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
})

describe("GET /api/admin/hotel-booking-offers/import/template", () => {
  it("downloads a prefilled CSV from Hotel Nusuk pricing rows", async () => {
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              city: "MAKKAH",
              tier: "STANDARD",
              label: "Safwa Tower 3",
              sublabel: "Dekat Haram",
              distance: "250m",
              sarPerNight: 1450,
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([
          {
            city: "MAKKAH",
            tier: "STANDARD",
            name: "Safwa Tower 3",
            slug: "safwa-tower-3",
          },
        ]),
      })

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8")
    expect(response.headers.get("content-disposition")).toContain(
      "hotel-booking-offers-hotel-nusuk.csv"
    )
    expect(response.body).toContain(
      "MAKKAH,STANDARD,Safwa Tower 3,safwa-tower-3,,Standard Room,,,,,per kamar per malam,SAR,1450,,,1"
    )
  })

  it("rejects non-admin users before querying hotel data", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockSelect).not.toHaveBeenCalled()
  })
})
