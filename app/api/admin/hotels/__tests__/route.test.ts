import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/server before anything else
vi.mock("next/server", () => ({
  NextRequest: class {
    url: string
    _body: unknown
    constructor(url: string, init?: { body?: string }) {
      this.url = url
      try {
        this._body = init?.body ? JSON.parse(init.body) : {}
      } catch {
        this._body = {}
      }
    }
    async json() {
      return this._body
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
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ a, b })),
  desc: vi.fn((a) => a),
}))

// Mock schema
vi.mock("@/lib/db/schema", () => ({
  hotelListings: {
    id: "id",
    isPublished: "is_published",
    createdAt: "created_at",
  },
}))

// Mock cuid2
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "test-id"),
}))

import { auth } from "@/auth"
import { db } from "@/lib/db"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as Record<string, ReturnType<typeof vi.fn>>

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

const sampleHotel = {
  id: "hotel-1",
  slug: "hotel-grand-makkah",
  name: "Hotel Grand Makkah",
  city: "MAKKAH",
  tier: "STANDARD",
  distanceMeters: 500,
  facilities: "WiFi, Restoran, Laundry",
  pilgrimNotes: "Dekat dengan Masjidil Haram",
  isPublished: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockResolvedValue(result),
  }
  chain.from.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
  chain.where.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
  chain.orderBy.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
  chain.limit.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
  return chain
}

function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function makeUpdateChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function makeDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Hotel validation logic (unit tests, no DB/auth) ───────────────────────

const CITIES = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

function validateHotelBody(body: unknown): string | null {
  const b = body as Record<string, unknown>
  if (typeof b.name !== "string" || !b.name.trim()) return "name required"
  if (typeof b.slug !== "string" || !b.slug.trim()) return "slug required"
  if (!CITIES.includes(b.city as string)) return "invalid city"
  if (!HOTEL_TIERS.includes(b.tier as string)) return "invalid tier"
  return null
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

describe("Hotel input validation", () => {
  it("valid hotel body passes", () => {
    expect(
      validateHotelBody({
        name: "Hotel Grand Makkah",
        slug: "hotel-grand-makkah",
        city: "MAKKAH",
        tier: "STANDARD",
      })
    ).toBeNull()
  })

  it("missing name → error", () => {
    expect(
      validateHotelBody({
        slug: "hotel-grand-makkah",
        city: "MAKKAH",
        tier: "STANDARD",
      })
    ).toBeTruthy()
  })

  it("missing slug → error", () => {
    expect(
      validateHotelBody({
        name: "Hotel Grand",
        slug: "",
        city: "MAKKAH",
        tier: "STANDARD",
      })
    ).toBeTruthy()
  })

  it("invalid city → error", () => {
    expect(
      validateHotelBody({
        name: "Hotel Grand",
        slug: "hotel-grand",
        city: "DUBAI",
        tier: "STANDARD",
      })
    ).toBeTruthy()
  })

  it("invalid tier → error", () => {
    expect(
      validateHotelBody({
        name: "Hotel Grand",
        slug: "hotel-grand",
        city: "MAKKAH",
        tier: "ULTRA_PREMIUM",
      })
    ).toBeTruthy()
  })

  it("MADINAH city is valid", () => {
    expect(
      validateHotelBody({
        name: "Hotel Grand Madinah",
        slug: "hotel-grand-madinah",
        city: "MADINAH",
        tier: "ECONOMY",
      })
    ).toBeNull()
  })

  it("all tiers are valid", () => {
    for (const tier of HOTEL_TIERS) {
      expect(
        validateHotelBody({
          name: "Hotel",
          slug: "hotel",
          city: "MAKKAH",
          tier,
        })
      ).toBeNull()
    }
  })
})

describe("Hotel slug generation", () => {
  it("generates slug from hotel name", () => {
    expect(generateSlug("Hotel Grand Makkah")).toBe("hotel-grand-makkah")
  })

  it("removes special characters", () => {
    expect(generateSlug("Hotel Al-Safa & Marwah")).toBe("hotel-al-safa--marwah")
  })

  it("lowercases everything", () => {
    expect(generateSlug("GRAND HOTEL")).toBe("grand-hotel")
  })
})

// ─── API integration-style tests (mock DB + auth) ──────────────────────────

describe("GET /api/admin/hotels", () => {
  it("lists all hotels", async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockDb.select.mockReturnValue(makeSelectChain([sampleHotel]))

    const { GET } = await import("../route")

    const res = await GET()
    expect((res as { status: number }).status).toBe(200)
    expect((res as { body: { hotels: unknown[] } }).body.hotels).toHaveLength(1)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { GET } = await import("../route")

    const res = await GET()
    expect((res as { status: number }).status).toBe(401)
  })

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValue(userSession)

    const { GET } = await import("../route")

    const res = await GET()
    expect((res as { status: number }).status).toBe(403)
  })
})

describe("POST /api/admin/hotels", () => {
  it("creates hotel listing and returns 201", async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockDb.insert.mockReturnValue(makeInsertChain([sampleHotel]))

    const { POST } = await import("../route")

    const req = {
      json: async () => ({
        slug: "hotel-grand-makkah",
        name: "Hotel Grand Makkah",
        city: "MAKKAH",
        tier: "STANDARD",
        distanceMeters: 500,
        facilities: "WiFi, Restoran",
        pilgrimNotes: "Dekat Haram",
        isPublished: false,
      }),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(201)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { POST } = await import("../route")

    const req = { json: async () => ({}) }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(401)
  })

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValue(userSession)

    const { POST } = await import("../route")

    const req = { json: async () => ({}) }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(403)
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const { POST } = await import("../route")

    const req = {
      json: async () => ({
        slug: "test",
        city: "MAKKAH",
        tier: "STANDARD",
      }),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(400)
  })

  it("returns 400 when city is invalid", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const { POST } = await import("../route")

    const req = {
      json: async () => ({
        slug: "test",
        name: "Test Hotel",
        city: "DUBAI",
        tier: "STANDARD",
      }),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(400)
  })

  it("returns 400 when tier is invalid", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const { POST } = await import("../route")

    const req = {
      json: async () => ({
        slug: "test",
        name: "Test Hotel",
        city: "MAKKAH",
        tier: "ULTRA",
      }),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(400)
  })
})

describe("PUT /api/admin/hotels/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { PUT } = await import("../[id]/route")

    const req = { json: async () => ({}) }
    const ctx = { params: Promise.resolve({ id: "hotel-1" }) }

    const res = await PUT(req as Parameters<typeof PUT>[0], ctx)
    expect((res as { status: number }).status).toBe(401)
  })

  it("updates hotel fields", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const updatedHotel = { ...sampleHotel, name: "Hotel Updated" }
    mockDb.update.mockReturnValue(makeUpdateChain([updatedHotel]))

    const { PUT } = await import("../[id]/route")

    const req = {
      json: async () => ({
        name: "Hotel Updated",
      }),
    }
    const ctx = { params: Promise.resolve({ id: "hotel-1" }) }

    const res = await PUT(req as Parameters<typeof PUT>[0], ctx)
    expect((res as { status: number; body: { hotel: { name: string } } }).body.hotel.name).toBe("Hotel Updated")
  })

  it("returns 400 when city is invalid", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const { PUT } = await import("../[id]/route")

    const req = {
      json: async () => ({
        city: "INVALID",
      }),
    }
    const ctx = { params: Promise.resolve({ id: "hotel-1" }) }

    const res = await PUT(req as Parameters<typeof PUT>[0], ctx)
    expect((res as { status: number }).status).toBe(400)
  })
})

describe("DELETE /api/admin/hotels/[id]", () => {
  it("deletes hotel and returns success", async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockDb.delete.mockReturnValue(makeDeleteChain([sampleHotel]))

    const { DELETE } = await import("../[id]/route")

    const req = {} as Parameters<typeof DELETE>[0]
    const ctx = { params: Promise.resolve({ id: "hotel-1" }) }

    const res = await DELETE(req, ctx)
    expect((res as { status: number }).status).toBe(200)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { DELETE } = await import("../[id]/route")

    const req = {} as Parameters<typeof DELETE>[0]
    const ctx = { params: Promise.resolve({ id: "hotel-1" }) }

    const res = await DELETE(req, ctx)
    expect((res as { status: number }).status).toBe(401)
  })

  it("returns 404 when hotel not found", async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockDb.delete.mockReturnValue(makeDeleteChain([]))

    const { DELETE } = await import("../[id]/route")

    const req = {} as Parameters<typeof DELETE>[0]
    const ctx = { params: Promise.resolve({ id: "nonexistent" }) }

    const res = await DELETE(req, ctx)
    expect((res as { status: number }).status).toBe(404)
  })
})
