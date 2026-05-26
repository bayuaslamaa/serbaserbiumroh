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
  pilgrimStories: {
    id: "pilgrim_stories.id",
    slug: "pilgrim_stories.slug",
  },
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { pilgrimStories } from "@/lib/db/schema"
import { PILGRIM_STORY_IMPORT_MAX_ROWS } from "@/lib/admin/pilgrim-story-import"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

const csv = [
  "slug,author_name,departure_city,travel_month,travel_year,pax,hotel_tier,airline_tier,makkah_nights,madinah_nights,total_budget_idr,narrative,is_published,is_featured",
  "inka-umroh,Inka,Jakarta,2,2026,2,STANDARD,STANDARD,8,4,54000000,Narasi,false,false",
].join("\n")

function request(bodyCsv: string) {
  return new NextRequest("http://localhost/api/admin/stories/import", {
    body: JSON.stringify({ csv: bodyCsv }),
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

  const storyReturning = vi.fn().mockResolvedValue([{ id: "new-story" }])
  const storyValues = vi.fn().mockReturnValue({ returning: storyReturning })
  const insert = vi.fn((table) => {
    if (table === pilgrimStories) return { values: storyValues }
    return { values: vi.fn().mockResolvedValue(undefined) }
  })

  return {
    tx: { update, insert },
    spies: { update, updateSet, updateWhere, insert, storyValues, storyReturning },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
})

describe("POST /api/admin/stories/import/preview", () => {
  it("previews valid CSV without writing", async () => {
    selectExisting([])
    const { POST } = await import("../import/preview/route")

    const res = await POST(request(csv))

    expect(res.status).toBe(200)
    expect((res.body as any).preview.summary.create).toBe(1)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it("classifies matching slugs as updates during preview", async () => {
    selectExisting([{ id: "story-1", slug: "inka-umroh" }])
    const { POST } = await import("../import/preview/route")

    const res = await POST(request(csv))

    expect((res.body as any).preview.summary.update).toBe(1)
    expect((res.body as any).preview.rows[0].existingStoryId).toBe("story-1")
  })

  it("requires admin auth", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { POST } = await import("../import/preview/route")

    const res = await POST(request(csv))

    expect(res.status).toBe(403)
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("rejects CSVs with too many rows", async () => {
    selectExisting([])
    const { POST } = await import("../import/preview/route")
    const rows = Array.from({ length: PILGRIM_STORY_IMPORT_MAX_ROWS + 1 }, (_, i) =>
      `story-${i},Admin,Jakarta,1,STANDARD,10000000`
    )

    const res = await POST(request("slug,author_name,departure_city,pax,hotel_tier,total_budget_idr\n" + rows.join("\n")))

    expect(res.status).toBe(413)
    expect((res.body as any).error).toContain("rows or fewer")
  })
})

describe("POST /api/admin/stories/import/confirm", () => {
  it("creates a new story", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../import/confirm/route")

    const res = await POST(request(csv))

    expect(res.status).toBe(200)
    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows).toEqual([
      { rowNumber: 2, slug: "inka-umroh", status: "create", storyId: "new-story" },
    ])
    expect(spies.storyValues).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "inka-umroh",
        authorName: "Inka",
        isPublished: false,
        isFeatured: false,
      })
    )
  })

  it("updates an existing story", async () => {
    selectExisting([{ id: "story-1", slug: "inka-umroh" }])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../import/confirm/route")

    const res = await POST(request(csv))

    expect(res.status).toBe(200)
    expect((res.body as any).appliedRows).toEqual([
      { rowNumber: 2, slug: "inka-umroh", status: "update", storyId: "story-1" },
    ])
    expect(spies.update).toHaveBeenCalledWith(pilgrimStories)
    expect(spies.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "Inka",
        totalBudgetIdr: 54000000,
      })
    )
    expect(spies.storyValues).not.toHaveBeenCalled()
  })

  it("does not write invalid rows", async () => {
    selectExisting([])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../import/confirm/route")

    const res = await POST(request("slug,author_name,departure_city,pax,hotel_tier,total_budget_idr\nbad,Admin,Jakarta,0,VIP,-1\n"))

    expect(res.status).toBe(200)
    expect((res.body as any).applied).toBe(0)
    expect(mockDb.transaction).not.toHaveBeenCalled()
    expect(spies.storyValues).not.toHaveBeenCalled()
  })
})

describe("GET /api/admin/stories/import/template", () => {
  it("returns a CSV template for admins", async () => {
    const { GET } = await import("../import/template/route")

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="pilgrim-story-import-template.csv"')
  })

  it("requires auth", async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import("../import/template/route")

    const res = await GET()

    expect(res.status).toBe(401)
  })
})
