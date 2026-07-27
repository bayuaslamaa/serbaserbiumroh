import { afterEach, describe, expect, it, vi } from "vitest"

const select = vi.fn()
vi.mock("@/lib/db", () => ({ db: { select: (...args: unknown[]) => select(...args) } }))

const getAllGuides = vi.fn()
vi.mock("@/lib/panduan", () => ({ getAllGuides: () => getAllGuides() }))

vi.mock("drizzle-orm", () => ({ asc: vi.fn(), eq: vi.fn() }))

import { guideRoutes, hotelRoutes, storyRoutes } from "../dynamic-routes"

/** Mimics the drizzle chain: select().from().orderBy() / .where().orderBy(). */
function resolvesTo(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows)
  const where = vi.fn().mockReturnValue({ orderBy })
  select.mockReturnValue({ from: vi.fn().mockReturnValue({ orderBy, where }) })
}

function rejectsWith(error: Error) {
  const orderBy = vi.fn().mockRejectedValue(error)
  const where = vi.fn().mockReturnValue({ orderBy })
  select.mockReturnValue({ from: vi.fn().mockReturnValue({ orderBy, where }) })
}

afterEach(() => {
  select.mockReset()
  getAllGuides.mockReset()
  vi.restoreAllMocks()
})

describe("hotelRoutes", () => {
  it("maps slugs to detail-page paths", async () => {
    const updatedAt = new Date("2026-07-01")
    resolvesTo([{ slug: "safwa-tower-3", updatedAt }])

    expect(await hotelRoutes()).toEqual([
      { path: "/hotel-nusuk/safwa-tower-3", lastModified: updatedAt },
    ])
  })

  it("skips rows the backfill has not reached", async () => {
    resolvesTo([
      { slug: "safwa-tower-3", updatedAt: new Date() },
      { slug: null, updatedAt: new Date() },
    ])

    expect(await hotelRoutes()).toHaveLength(1)
  })

  it("returns an empty list instead of throwing when the query fails", async () => {
    // The real failure seen locally: the column exists in the schema but the
    // migration has not been applied yet.
    vi.spyOn(console, "error").mockImplementation(() => {})
    rejectsWith(new Error('column "slug" does not exist'))

    await expect(hotelRoutes()).resolves.toEqual([])
  })
})

describe("storyRoutes", () => {
  it("maps published stories to their paths", async () => {
    resolvesTo([{ slug: "zahra-2026", updatedAt: new Date("2026-03-01") }])

    expect(await storyRoutes()).toEqual([
      { path: "/cerita-jamaah/zahra-2026", lastModified: new Date("2026-03-01") },
    ])
  })

  it("returns an empty list instead of throwing when the query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    rejectsWith(new Error("connection refused"))

    await expect(storyRoutes()).resolves.toEqual([])
  })
})

describe("guideRoutes", () => {
  it("maps guides to their paths", () => {
    getAllGuides.mockReturnValue([
      { slug: "panduan-umroh-mandiri" },
      { slug: "manasik-umroh" },
    ])

    expect(guideRoutes()).toEqual([
      { path: "/panduan/panduan-umroh-mandiri" },
      { path: "/panduan/manasik-umroh" },
    ])
  })

  it("returns an empty list when the content directory cannot be read", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    getAllGuides.mockImplementation(() => {
      throw new Error("ENOENT")
    })

    expect(guideRoutes()).toEqual([])
  })
})
