import { describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  default: () => ({ auth: vi.fn() }),
}))

import { PROTECTED_PREFIXES, SITE_URL } from "@/lib/seo/config"
import { STATIC_ROUTES } from "@/lib/seo/routes"
import sitemap from "../sitemap"

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
