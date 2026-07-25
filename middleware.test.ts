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
})
