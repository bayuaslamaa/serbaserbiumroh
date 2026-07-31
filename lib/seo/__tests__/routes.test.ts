import { describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  default: () => ({ auth: vi.fn() }),
}))

import { PROTECTED_PREFIXES, SITE_URL, absoluteUrl } from "../config"
import { STATIC_ROUTES } from "../routes"

describe("absoluteUrl", () => {
  it("returns the bare site URL for the root path, without a trailing slash", () => {
    expect(absoluteUrl("/")).toBe(SITE_URL)
  })

  it("builds an absolute URL on the canonical host", () => {
    expect(absoluteUrl("/hotel-nusuk")).toBe(`${SITE_URL}/hotel-nusuk`)
  })

  it("tolerates a path given without a leading slash", () => {
    expect(absoluteUrl("faq")).toBe(`${SITE_URL}/faq`)
  })

  it("uses the www host, matching where the apex redirects and what Google indexed", () => {
    expect(SITE_URL).toBe("https://www.serbaserbiumroh.id")
  })
})

describe("STATIC_ROUTES", () => {
  it("lists no protected route", () => {
    for (const route of STATIC_ROUTES) {
      for (const prefix of PROTECTED_PREFIXES) {
        expect(route.path.startsWith(prefix), `${route.path} is protected`).toBe(false)
      }
    }
  })

  it("is reachable without a session -- every route passes isPublicPath", async () => {
    const { isPublicPath } = await import("@/middleware")

    for (const route of STATIC_ROUTES) {
      expect(isPublicPath(route.path), `${route.path} would redirect to /login`).toBe(true)
    }
  })

  it("contains no duplicate paths", () => {
    const paths = STATIC_ROUTES.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("excludes single-date campaign pages from the sitemap", () => {
    expect(STATIC_ROUTES.map((r) => r.path)).not.toContain("/webinar-umroh-mandiri")
  })

  it("gives every route a priority between 0 and 1", () => {
    for (const route of STATIC_ROUTES) {
      expect(route.priority).toBeGreaterThan(0)
      expect(route.priority).toBeLessThanOrEqual(1)
    }
  })

  it("ranks the homepage highest", () => {
    const home = STATIC_ROUTES.find((r) => r.path === "/")
    expect(home).toBeDefined()
    expect(Math.max(...STATIC_ROUTES.map((r) => r.priority))).toBe(home!.priority)
  })
})
