import { describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  default: () => ({ auth: vi.fn() }),
}))

describe("middleware public route matching", () => {
  it("allows public community page and submit API without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/komunitas")).toBe(true)
    expect(isPublicPath("/komunitas/")).toBe(true)
    expect(isPublicPath("/api/community/join")).toBe(true)
  })

  it("allows public webinar page without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/webinar-umroh-mandiri")).toBe(true)
    expect(isPublicPath("/webinar-umroh-mandiri/")).toBe(true)
  })

  it("allows every internal destination listed in the nav link arrays", async () => {
    // Sources the shared arrays only. A destination hardcoded inside a nav
    // component (rather than added to these arrays) is not covered here.
    const { isPublicPath } = await import("./middleware")
    const { moreLinks, exploreLinks } = await import("@/components/nav/links")
    const { services } = await import("@/lib/services/catalog")

    const navHrefs = [
      ...moreLinks.map((l) => l.href),
      ...exploreLinks.map((l) => l.href),
      ...services.map((s) => s.href).filter((href) => href.startsWith("/")),
    ]

    for (const href of navHrefs) {
      expect(isPublicPath(href), `${href} is linked from the nav`).toBe(true)
    }
  })

  it("allows the public service catalog without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/layanan")).toBe(true)
    expect(isPublicPath("/layanan/")).toBe(true)
  })

  it("allows the public Badalin service page without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/badalin")).toBe(true)
    expect(isPublicPath("/badalin/")).toBe(true)
  })

  it("keeps dashboard and admin routes protected", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/dashboard")).toBe(false)
    expect(isPublicPath("/admin/community-requests")).toBe(false)
  })

  it("allows the hotel directory without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/hotel-nusuk")).toBe(true)
    expect(isPublicPath("/hotel-nusuk/safwa-tower-3")).toBe(true)
  })
})

describe("middleware matcher", () => {
  // The matcher is a raw regex embedded in a path pattern. Anything it matches
  // runs the auth middleware; anything it skips is served directly. Crawler
  // metadata files and public static assets must never reach the middleware:
  // robots.txt and sitemap.xml are Next metadata routes that stop executing
  // once middleware intercepts them, and public/ downloads have no session.
  async function matchesMiddleware(pathname: string) {
    const { config } = await import("./middleware")
    return config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname))
  }

  it("skips crawler metadata routes", async () => {
    expect(await matchesMiddleware("/robots.txt")).toBe(false)
    expect(await matchesMiddleware("/sitemap.xml")).toBe(false)
    expect(await matchesMiddleware("/sitemap-0.xml")).toBe(false)
  })

  it("skips public static downloads and images", async () => {
    expect(await matchesMiddleware("/pdf/panduan-umroh-mandiri.pdf")).toBe(false)
    expect(await matchesMiddleware("/transportasi/vehicles/sedan.webp")).toBe(false)
    expect(await matchesMiddleware("/logo.png")).toBe(false)
  })

  it("still guards protected routes", async () => {
    expect(await matchesMiddleware("/dashboard")).toBe(true)
    expect(await matchesMiddleware("/admin/pricing")).toBe(true)
    expect(await matchesMiddleware("/estimate/new")).toBe(true)
  })

  it("still runs on public pages so session-aware redirects keep working", async () => {
    expect(await matchesMiddleware("/")).toBe(true)
    expect(await matchesMiddleware("/login")).toBe(true)
    expect(await matchesMiddleware("/hotel-nusuk")).toBe(true)
  })
})
