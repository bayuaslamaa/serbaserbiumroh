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
    transaction: vi.fn(),
  },
}))

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ a, b })),
  desc: vi.fn((a) => a),
}))

// Mock schema
vi.mock("@/lib/db/schema", () => ({
  pilgrimStories: { id: "id", isPublished: "is_published" },
  storyItineraryDays: { storyId: "story_id" },
  storyPackingItems: { storyId: "story_id" },
}))

import { auth } from "@/auth"
import { db } from "@/lib/db"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as Record<string, ReturnType<typeof vi.fn>>

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

const sampleStory = {
  id: "story-1",
  slug: "bayu-umroh-2024",
  authorName: "Bayu",
  departureCity: "Jakarta",
  travelMonth: 3,
  travelYear: 2024,
  pax: 2,
  hotelTier: "STANDARD",
  airlineTier: "BUDGET",
  makkahNights: 9,
  madinahNights: 4,
  totalBudgetIdr: 25000000,
  narrative: "Perjalanan yang luar biasa",
  isPublished: false,
  isFeatured: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
  }
  // allow awaiting at different chain positions
  chain.from.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
  chain.where.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
  chain.orderBy.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(result) })
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

// ─── Story validation logic (unit tests, no DB/auth) ───────────────────────

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

function validateStoryBody(body: unknown): string | null {
  const b = body as Record<string, unknown>
  if (typeof b.authorName !== "string" || !b.authorName.trim()) return "authorName required"
  if (typeof b.slug !== "string" || !b.slug.trim()) return "slug required"
  if (typeof b.departureCity !== "string" || !b.departureCity.trim()) return "departureCity required"
  if (typeof b.pax !== "number" || b.pax < 1) return "pax must be a positive number"
  if (!HOTEL_TIERS.includes(b.hotelTier as string)) return "invalid hotelTier"
  if (typeof b.totalBudgetIdr !== "number" || (b.totalBudgetIdr as number) < 0) return "totalBudgetIdr must be a non-negative number"
  return null
}

function generateSlug(authorName: string): string {
  return authorName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

describe("Story input validation", () => {
  it("valid story body passes", () => {
    expect(
      validateStoryBody({
        authorName: "Bayu",
        slug: "bayu",
        departureCity: "Jakarta",
        pax: 2,
        hotelTier: "STANDARD",
        totalBudgetIdr: 25000000,
      })
    ).toBeNull()
  })

  it("missing authorName → error", () => {
    expect(
      validateStoryBody({
        slug: "bayu",
        departureCity: "Jakarta",
        pax: 2,
        hotelTier: "STANDARD",
        totalBudgetIdr: 25000000,
      })
    ).toBeTruthy()
  })

  it("missing slug → error", () => {
    expect(
      validateStoryBody({
        authorName: "Bayu",
        slug: "",
        departureCity: "Jakarta",
        pax: 2,
        hotelTier: "STANDARD",
        totalBudgetIdr: 25000000,
      })
    ).toBeTruthy()
  })

  it("invalid hotelTier → error", () => {
    expect(
      validateStoryBody({
        authorName: "Bayu",
        slug: "bayu",
        departureCity: "Jakarta",
        pax: 2,
        hotelTier: "ULTRA_PREMIUM",
        totalBudgetIdr: 25000000,
      })
    ).toBeTruthy()
  })

  it("pax zero → error", () => {
    expect(
      validateStoryBody({
        authorName: "Bayu",
        slug: "bayu",
        departureCity: "Jakarta",
        pax: 0,
        hotelTier: "STANDARD",
        totalBudgetIdr: 25000000,
      })
    ).toBeTruthy()
  })

  it("negative totalBudgetIdr → error", () => {
    expect(
      validateStoryBody({
        authorName: "Bayu",
        slug: "bayu",
        departureCity: "Jakarta",
        pax: 1,
        hotelTier: "ECONOMY",
        totalBudgetIdr: -1,
      })
    ).toBeTruthy()
  })
})

describe("Slug generation", () => {
  it("generates slug from author name", () => {
    expect(generateSlug("Bayu Aslama")).toBe("bayu-aslama")
  })

  it("removes special characters", () => {
    expect(generateSlug("Nur'ain Binti Ahmad")).toBe("nurain-binti-ahmad")
  })

  it("collapses multiple spaces", () => {
    expect(generateSlug("Bayu  Aslama")).toBe("bayu-aslama")
  })

  it("lowercases everything", () => {
    expect(generateSlug("BAYU")).toBe("bayu")
  })
})

// ─── API integration-style tests (mock DB + auth) ──────────────────────────

describe("POST /api/admin/stories", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { POST } = await import("../route")

    const req = {
      json: async () => ({}),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(401)
  })

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValue(userSession)

    const { POST } = await import("../route")

    const req = {
      json: async () => ({}),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(403)
  })

  it("returns 400 when authorName is missing", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const { POST } = await import("../route")

    const req = {
      json: async () => ({
        slug: "test",
        departureCity: "Jakarta",
        pax: 1,
        hotelTier: "STANDARD",
        totalBudgetIdr: 10000000,
      }),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(400)
  })

  it("creates story and returns 201", async () => {
    mockAuth.mockResolvedValue(adminSession)

    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([sampleStory]),
          }),
        }),
      }
      await fn(tx)
    })

    const { POST } = await import("../route")

    const req = {
      json: async () => ({
        slug: "bayu-umroh-2024",
        authorName: "Bayu",
        departureCity: "Jakarta",
        pax: 2,
        hotelTier: "STANDARD",
        totalBudgetIdr: 25000000,
        itineraryDays: [],
        packingItems: [],
      }),
    }

    const res = await POST(req as Parameters<typeof POST>[0])
    expect((res as { status: number }).status).toBe(201)
  })
})

describe("PUT /api/admin/stories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { PUT } = await import("../[id]/route")

    const req = { json: async () => ({}) }
    const ctx = { params: Promise.resolve({ id: "story-1" }) }

    const res = await PUT(req as Parameters<typeof PUT>[0], ctx)
    expect((res as { status: number }).status).toBe(401)
  })

  it("updates story fields", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const updatedStory = { ...sampleStory, authorName: "Bayu Updated" }

    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedStory]),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      }
      await fn(tx)
    })

    const { PUT } = await import("../[id]/route")

    const req = {
      json: async () => ({
        authorName: "Bayu Updated",
        itineraryDays: [],
        packingItems: [],
      }),
    }
    const ctx = { params: Promise.resolve({ id: "story-1" }) }

    const res = await PUT(req as Parameters<typeof PUT>[0], ctx)
    expect((res as { status: number; body: { story: { authorName: string } } }).body.story.authorName).toBe("Bayu Updated")
  })
})

describe("DELETE /api/admin/stories/[id]", () => {
  it("deletes story and returns success", async () => {
    mockAuth.mockResolvedValue(adminSession)

    mockDb.delete.mockReturnValue(makeDeleteChain([sampleStory]))

    const { DELETE } = await import("../[id]/route")

    const req = {} as Parameters<typeof DELETE>[0]
    const ctx = { params: Promise.resolve({ id: "story-1" }) }

    const res = await DELETE(req, ctx)
    expect((res as { status: number }).status).toBe(200)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { DELETE } = await import("../[id]/route")

    const req = {} as Parameters<typeof DELETE>[0]
    const ctx = { params: Promise.resolve({ id: "story-1" }) }

    const res = await DELETE(req, ctx)
    expect((res as { status: number }).status).toBe(401)
  })
})

describe("PATCH /api/admin/stories/[id]/publish", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { PATCH } = await import("../[id]/publish/route")

    const req = {} as Parameters<typeof PATCH>[0]
    const ctx = { params: Promise.resolve({ id: "story-1" }) }

    const res = await PATCH(req, ctx)
    expect((res as { status: number }).status).toBe(401)
  })

  it("toggles isPublished", async () => {
    mockAuth.mockResolvedValue(adminSession)

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ isPublished: false }]),
    }
    mockDb.select.mockReturnValue(selectChain)
    mockDb.update.mockReturnValue(makeUpdateChain([{ ...sampleStory, isPublished: true }]))

    const { PATCH } = await import("../[id]/publish/route")

    const req = {} as Parameters<typeof PATCH>[0]
    const ctx = { params: Promise.resolve({ id: "story-1" }) }

    const res = await PATCH(req, ctx)
    expect((res as { status: number }).status).toBe(200)
  })
})
