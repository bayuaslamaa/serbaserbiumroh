import { describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  default: () => ({ auth: vi.fn() }),
}))

vi.mock("@/lib/seo/dynamic-routes", () => ({
  guideRoutes: vi.fn(() => []),
  hotelRoutes: vi.fn(async () => []),
  storyRoutes: vi.fn(async () => []),
}))

import { PROTECTED_PREFIXES, SITE_URL } from "@/lib/seo/config"
import { STATIC_ROUTES } from "@/lib/seo/routes"
import { guideRoutes, hotelRoutes, storyRoutes } from "@/lib/seo/dynamic-routes"
import sitemap from "../sitemap"

const mockGuides = guideRoutes as ReturnType<typeof vi.fn>
const mockHotels = hotelRoutes as ReturnType<typeof vi.fn>
const mockStories = storyRoutes as ReturnType<typeof vi.fn>

describe("sitemap.xml", () => {
  it("emits one entry per static route", async () => {
    const entries = await sitemap()

    for (const route of STATIC_ROUTES) {
      const expected = route.path === "/" ? SITE_URL : `${SITE_URL}${route.path}`
      expect(entries.map((e) => e.url), `${route.path} is missing`).toContain(expected)
    }
  })

  it("uses absolute URLs on the canonical host for every entry", async () => {
    const entries = await sitemap()

    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.url.startsWith(`${SITE_URL}`), `${entry.url} is not canonical`).toBe(true)
    }
  })

  it("never exposes a protected route", async () => {
    const entries = await sitemap()

    for (const entry of entries) {
      const pathname = entry.url.replace(SITE_URL, "") || "/"
      for (const prefix of PROTECTED_PREFIXES) {
        expect(pathname.startsWith(prefix), `${entry.url} is protected`).toBe(false)
      }
    }
  })

  it("carries a valid lastModified on every entry", async () => {
    const entries = await sitemap()

    for (const entry of entries) {
      expect(entry.lastModified, `${entry.url} has no lastModified`).toBeDefined()
      expect(Number.isNaN(new Date(entry.lastModified!).getTime())).toBe(false)
    }
  })

  it("contains no duplicate URLs", async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe("sitemap.xml dynamic sections", () => {
  it("includes one entry per hotel slug", async () => {
    mockHotels.mockResolvedValueOnce([
      { path: "/hotel-nusuk/safwa-tower-3", lastModified: new Date("2026-07-01") },
      { path: "/hotel-nusuk/anwar-al-madinah", lastModified: new Date("2026-07-02") },
    ])

    const urls = (await sitemap()).map((e) => e.url)

    expect(urls).toContain(`${SITE_URL}/hotel-nusuk/safwa-tower-3`)
    expect(urls).toContain(`${SITE_URL}/hotel-nusuk/anwar-al-madinah`)
  })

  it("carries each hotel's own lastModified rather than the build time", async () => {
    const updatedAt = new Date("2026-07-01T00:00:00.000Z")
    mockHotels.mockResolvedValueOnce([{ path: "/hotel-nusuk/safwa-tower-3", lastModified: updatedAt }])

    const entry = (await sitemap()).find((e) => e.url.endsWith("/safwa-tower-3"))

    expect(entry?.lastModified).toEqual(updatedAt)
  })

  it("includes published stories and every guide", async () => {
    mockStories.mockResolvedValueOnce([{ path: "/cerita-jamaah/zahra-2026" }])
    mockGuides.mockReturnValueOnce([
      { path: "/panduan/panduan-umroh-mandiri" },
      { path: "/panduan/manasik-umroh" },
      { path: "/panduan/doa-dzikir-umroh" },
    ])

    const urls = (await sitemap()).map((e) => e.url)

    expect(urls).toContain(`${SITE_URL}/cerita-jamaah/zahra-2026`)
    expect(urls).toContain(`${SITE_URL}/panduan/manasik-umroh`)
  })

  it("still emits the static routes when every dynamic source comes back empty", async () => {
    // This is the degraded path: the database was unreachable at build.
    // Losing the hotel section must not lose the whole sitemap.
    mockHotels.mockResolvedValueOnce([])
    mockStories.mockResolvedValueOnce([])
    mockGuides.mockReturnValueOnce([])

    const entries = await sitemap()

    expect(entries).toHaveLength(STATIC_ROUTES.length)
    expect(entries.map((e) => e.url)).toContain(SITE_URL)
  })

  it("keeps every dynamic entry absolute and free of protected prefixes", async () => {
    mockHotels.mockResolvedValueOnce([{ path: "/hotel-nusuk/safwa-tower-3" }])
    mockStories.mockResolvedValueOnce([{ path: "/cerita-jamaah/zahra-2026" }])

    for (const entry of await sitemap()) {
      expect(entry.url.startsWith(SITE_URL)).toBe(true)
      const pathname = entry.url.replace(SITE_URL, "") || "/"
      for (const prefix of PROTECTED_PREFIXES) {
        expect(pathname.startsWith(prefix)).toBe(false)
      }
    }
  })
})
