import fs from "node:fs"
import path from "node:path"
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

  it("keeps every destination in the member-only nav array behind the session gate", async () => {
    // The mirror of the assertion above, and the reason memberLinks exists as
    // a fourth array rather than as extra entries in moreLinks. A public href
    // in here means the array's isLoggedIn gate is hiding a page anyone could
    // already reach; a gated href in the public arrays means a login-wall dead
    // end. Both directions now fail loudly.
    const { isPublicPath } = await import("./middleware")
    const { memberLinks } = await import("@/components/nav/links")

    expect(memberLinks.length).toBeGreaterThan(0)
    for (const { href } of memberLinks) {
      expect(isPublicPath(href), `${href} is rendered only for members`).toBe(false)
    }
  })

  it("sends an anonymous visitor from the hotel pricelist to login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/pricelist-hotel")).toBe(false)
    expect(isPublicPath("/pricelist-hotel/")).toBe(false)
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

  it("allows the public email template page without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/template-email")).toBe(true)
    expect(isPublicPath("/template-email/")).toBe(true)
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
  // Anything the matcher matches runs the auth middleware; anything it skips is
  // served directly. Crawler metadata files and public static assets must never
  // reach the middleware: robots.txt and sitemap.xml are Next metadata routes
  // that stop executing once middleware intercepts them, and public/ downloads
  // carry no session.
  //
  // Next does not use the matcher string verbatim -- it wraps it. Testing a
  // hand-rolled `^pattern$` would assert against a regex Next never compiles,
  // and would silently miss the `_next/data/` prefix and `.json` suffix forms
  // a real request can take. This mirrors the wrapper Next emits into
  // .next/server/middleware-manifest.json; the test below pins it to the real
  // build output so the two cannot drift apart unnoticed.
  function compileLikeNext(pattern: string) {
    return new RegExp(
      `^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/${pattern.replace(/^\//, "")})(.json)?[\\/#\\?]?$`,
    )
  }

  /** The regexes Next actually compiled, when the app has been built. */
  function builtMatchers(): RegExp[] {
    const manifestPath = path.join(process.cwd(), ".next/server/middleware-manifest.json")
    if (!fs.existsSync(manifestPath)) return []

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    return Object.values(manifest.middleware ?? {})
      .flatMap((entry) => (entry as { matchers?: Array<{ regexp: string }> }).matchers ?? [])
      .map((m) => new RegExp(m.regexp))
  }

  async function matchesMiddleware(pathname: string) {
    const { config } = await import("./middleware")
    return config.matcher.some((pattern) => compileLikeNext(pattern).test(pathname))
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

  it("does not let a protected route escape by ending in an excluded extension", async () => {
    // A dynamic segment is user-controlled, so /estimate/<id> can be made to
    // end in .pdf. Without the inner prefix lookahead these skipped the
    // middleware entirely and fell back to page-body guards alone.
    expect(await matchesMiddleware("/estimate/abc.pdf")).toBe(true)
    expect(await matchesMiddleware("/admin/content/faqs/1.txt")).toBe(true)
    expect(await matchesMiddleware("/api/admin/pricing/hotel.txt")).toBe(true)
    expect(await matchesMiddleware("/api/admin/users.xml")).toBe(true)
    expect(await matchesMiddleware("/dashboard/report.webmanifest")).toBe(true)
    // The pricelist holds only a page today, so these 404 rather than leak --
    // but an export route under the prefix would be served straight past the
    // session gate, and a catalogue CSV/PDF export is the obvious next feature.
    expect(await matchesMiddleware("/pricelist-hotel/export.pdf")).toBe(true)
    expect(await matchesMiddleware("/pricelist-hotel/export.txt")).toBe(true)
    expect(await matchesMiddleware("/pricelist-hotel/2027.xml")).toBe(true)
    expect(await matchesMiddleware("/pricelist-hotel/chart.png")).toBe(true)
  })

  it("anchors the protected-prefix guard to whole segments", async () => {
    // (?!admin|...) without a segment anchor would also catch /api-diagram.png
    // and /administrasi.pdf, forcing public assets through auth and bouncing
    // anonymous visitors to /login -- the same bug class this guard fixes.
    expect(await matchesMiddleware("/api-diagram.png")).toBe(false)
    expect(await matchesMiddleware("/administrasi.pdf")).toBe(false)
    expect(await matchesMiddleware("/estimated-costs.pdf")).toBe(false)
    expect(await matchesMiddleware("/pricelist-hotel-2027.pdf")).toBe(false)

    // The cost of that anchor, stated rather than left to be rediscovered: a
    // top-level path whose WHOLE segment ends in an excluded extension is not
    // the prefix, so it skips -- uniformly, for every guarded prefix. Nothing
    // is exposed by it. A Next route cannot be reached at /dashboard.pdf
    // without a literal `dashboard.pdf` segment in app/, and a file that does
    // exist at that URL is a public/ asset, which is precisely what must skip.
    // The gap worth closing is /<prefix>/<segment>.<ext>, above.
    expect(await matchesMiddleware("/dashboard.pdf")).toBe(false)
    expect(await matchesMiddleware("/pricelist-hotel.pdf")).toBe(false)
  })

  it("agrees with the regex Next actually compiled, on every path asserted here", async (ctx) => {
    // Pins compileLikeNext to real build output by BEHAVIOUR, not by string
    // equality -- Next escapes "/" as "\/" and groups differently, which
    // changes the source text but not what matches.
    //
    // Needs .next/, which is not committed and which this repo has no CI to
    // produce. Rather than returning early -- reporting a green tick for a test
    // that asserted nothing, which is how a fresh checkout came to believe the
    // matcher was pinned -- it marks itself SKIPPED and says why. Throwing
    // instead would fail `npx vitest run` on a clone that has never built, a
    // real cost for a check that only `npx next build` can enable; a skip the
    // runner counts and prints is the honest middle. Every behavioural
    // assertion above still runs either way -- what is lost is only the
    // agreement with Next's own compiler.
    const built = builtMatchers()
    if (built.length === 0) {
      console.warn(
        "middleware.test.ts: no .next/server/middleware-manifest.json, so compileLikeNext " +
          "is NOT pinned to Next's compiled matcher on this run. Run `npx next build` first.",
      )
      ctx.skip()
      return
    }

    const { config } = await import("./middleware")
    const paths = [
      "/", "/login", "/hotel-nusuk", "/dashboard", "/admin/pricing", "/estimate/new",
      "/robots.txt", "/sitemap.xml", "/sitemap-0.xml",
      "/pdf/panduan-umroh-mandiri.pdf", "/transportasi/vehicles/sedan.webp", "/logo.png",
      "/estimate/abc.pdf", "/admin/content/faqs/1.txt", "/api/admin/pricing/hotel.txt",
      "/api/admin/users.xml", "/dashboard/report.webmanifest",
      "/pricelist-hotel", "/pricelist-hotel/export.pdf", "/pricelist-hotel/export.txt",
      "/pricelist-hotel/2027.xml", "/pricelist-hotel/chart.png",
      "/pricelist-hotel-2027.pdf", "/pricelist-hotel.pdf", "/dashboard.pdf",
    ]

    for (const pathname of paths) {
      const approximated = config.matcher.some((p) => compileLikeNext(p).test(pathname))
      const actual = built.some((re) => re.test(pathname))
      expect(approximated, `${pathname} disagrees with the built matcher`).toBe(actual)
    }
  })

  it("still runs on public pages so session-aware redirects keep working", async () => {
    expect(await matchesMiddleware("/")).toBe(true)
    expect(await matchesMiddleware("/login")).toBe(true)
    expect(await matchesMiddleware("/hotel-nusuk")).toBe(true)
  })
})
