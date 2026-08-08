import fs from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * What this page decides -- who may see it, what it reads, and what it hands
 * the client -- rather than how the list looks. The presentation is covered by
 * components/pricelist-hotel/__tests__/PricelistClient.test.tsx.
 */

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: {} }))

/**
 * Hoisted so the vi.mock factory below can write into them -- factories run
 * before this module's body does.
 *
 * `catalogueCalls` is the point. Binding the assertions to the one name
 * `fetchPricelistRows` let a wrong implementation through: a page reading the
 * catalogue through some sibling export of the same module still called
 * requireAuth first, and still never called fetchPricelistRows on the redirect
 * path, so both tests stayed green while the read moved outside the gate. What
 * the page owes is "no catalogue module function runs before the session is
 * checked, and none runs at all if it is refused" -- so that is what gets
 * recorded.
 */
const { catalogueCalls, fetchRows } = vi.hoisted(() => ({
  catalogueCalls: [] as string[],
  fetchRows: vi.fn(),
}))

// Every function export is wrapped, not just the query. composePricelist still
// calls through to the real pivot, so the list the page hands over is the
// genuine one rather than a hand-built stand-in that could agree with a broken
// page.
vi.mock("@/lib/hotels/pricelist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hotels/pricelist")>()
  const exports: Record<string, unknown> = { ...actual, fetchPricelistRows: fetchRows }

  for (const [name, value] of Object.entries(exports)) {
    if (typeof value !== "function") continue
    const inner = value as (...args: unknown[]) => unknown
    exports[name] = (...args: unknown[]) => {
      catalogueCalls.push(name)
      return inner(...args)
    }
  }

  return exports
})

// Recorded rather than rendered, the estimatorProps idiom from
// app/(dashboard)/estimate/new/__tests__/page.test.tsx.
const pricelistProps = vi.fn()
vi.mock("@/components/pricelist-hotel/PricelistClient", () => ({
  PricelistClient: (props: Record<string, unknown>) => {
    pricelistProps(props)
    return <div data-testid="pricelist" />
  },
}))

import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { PricelistHotel, PricelistRow } from "@/lib/hotels/pricelist"
import PricelistHotelPage from "../page"

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>
// The inner spy, not the recorded wrapper the page sees: this is what the tests
// configure a return value on, and its invocationCallOrder is still real
// because the wrapper calls straight through.
const mockFetchPricelistRows = fetchRows

const CATALOGUE_LABEL = "Katalog 1448H (AZKA + Maysan/MIG)"

/** One joined catalogue row; a test states only the part it is about. */
function row(overrides: Partial<PricelistRow> = {}): PricelistRow {
  return {
    hotelPriceId: "hotel-safwa",
    city: "MAKKAH",
    tier: "STANDARD",
    label: "Safwa Tower 3",
    sublabel: "3★, dekat Haram",
    distance: "250m jalan kaki",
    slug: "safwa-tower-3",
    month: 8,
    roomType: "QUAD",
    sarPerNight: 1300,
    sourceLabel: CATALOGUE_LABEL,
    updatedAt: new Date("2026-08-01T12:00:00Z"),
    ...overrides,
  }
}

/**
 * Two hotels, imported on different days. Midday UTC so the rendered calendar
 * date is the same one in every timezone this suite plausibly runs in.
 */
const ROWS: PricelistRow[] = [
  row({ month: 8, sarPerNight: 1300 }),
  row({ month: 9, sarPerNight: 1150 }),
  row({
    hotelPriceId: "hotel-durrat",
    city: "MADINAH",
    label: "Durrat Al Eiman",
    sublabel: "4★",
    distance: "300m",
    slug: null,
    month: 11,
    sarPerNight: 900,
    updatedAt: new Date("2026-08-05T12:00:00Z"),
  }),
]

const NEWEST_IMPORT = "5 Agu 2026"
const OLDER_IMPORT = "1 Agu 2026"

function signIn(role: "ADMIN" | "USER") {
  mockRequireAuth.mockResolvedValue({ user: { id: "u1", role } })
}

/** What next/navigation's redirect() throws, close enough for a page to rethrow. */
function redirectError() {
  return Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT;replace;/login;307;",
  })
}

describe("/pricelist-hotel gates on a session before it reads the catalogue", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogueCalls.length = 0
    mockFetchPricelistRows.mockResolvedValue(ROWS)
  })

  it("calls requireAuth before the catalogue query, not merely alongside it", async () => {
    signIn("USER")

    render(await PricelistHotelPage())

    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
    expect(mockFetchPricelistRows).toHaveBeenCalledWith(db)
    // Order, not presence: a page that queried first and checked the session
    // afterwards would still satisfy both assertions above.
    expect(mockRequireAuth.mock.invocationCallOrder[0]).toBeLessThan(
      mockFetchPricelistRows.mock.invocationCallOrder[0],
    )
    // Exactly which catalogue functions the page uses, in order. A read added
    // through a second export of the same module -- the shape the two
    // assertions above cannot see -- shows up here as an extra entry.
    expect(catalogueCalls).toEqual(["fetchPricelistRows", "composePricelist"])
  })

  it("reads nothing and renders nothing when requireAuth redirects", async () => {
    // The call-order test cannot catch a page that fires both in a Promise.all
    // and swallows the redirect -- requireAuth would still be invoked first.
    // This one can: the read must not happen at all.
    mockRequireAuth.mockRejectedValue(redirectError())

    await expect(PricelistHotelPage()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    })

    // Nothing from the catalogue module, not merely nothing from the one
    // function this test used to name.
    expect(catalogueCalls).toEqual([])
    expect(pricelistProps).not.toHaveBeenCalled()
  })

  it("keeps its metadata static, so no read can escape the gate through it", async () => {
    // Neither test above invokes generateMetadata, so a query moved there would
    // run on every request, ahead of the page body, and stay green here. Today
    // the title is a constant; if that ever becomes a function, it has to be
    // one that reads nothing.
    const pageModule = (await import("../page")) as {
      metadata?: unknown
      generateMetadata?: (...args: unknown[]) => unknown
    }

    expect(pageModule.metadata).toMatchObject({ title: "Pricelist Hotel" })

    if (typeof pageModule.generateMetadata === "function") {
      catalogueCalls.length = 0
      await pageModule.generateMetadata({ params: {}, searchParams: {} })
      expect(catalogueCalls).toEqual([])
    }
  })
})

describe("/pricelist-hotel renders the catalogue for any signed-in user", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogueCalls.length = 0
    mockFetchPricelistRows.mockResolvedValue(ROWS)
  })

  it("hands a non-admin the same composed list an admin would get (AE2)", async () => {
    signIn("USER")

    render(await PricelistHotelPage())

    expect(screen.getByTestId("pricelist")).toBeInTheDocument()
    expect(pricelistProps).toHaveBeenCalledTimes(1)

    const props = pricelistProps.mock.calls[0][0] as { hotels: PricelistHotel[] }
    // Makkah before Madinah -- the composed order, so the page is passing the
    // pivot through rather than re-deriving anything.
    expect(props.hotels.map((hotel) => hotel.label)).toEqual([
      "Safwa Tower 3",
      "Durrat Al Eiman",
    ])
    expect(props.hotels[0].rates[8]?.QUAD?.sarPerNight).toBe(1300)
    expect(props.hotels[0].rates[9]?.QUAD?.sarPerNight).toBe(1150)
    expect(props.hotels[1].rates[11]?.QUAD?.sarPerNight).toBe(900)

    // No capability prop. Access is "any signed-in user", so an always-true
    // flag would imply a distinction between admin and member that does not
    // exist on this page.
    expect(Object.keys(props)).toEqual(["hotels"])
  })

  it("states in the lede that the figures are catalogue SAR, not an estimate's figure", async () => {
    signIn("USER")

    render(await PricelistHotelPage())

    // Unique because the client is mocked out: SAR appears only in the lede.
    const lede = screen.getByText(/SAR/)
    expect(lede).toHaveTextContent(/per kamar/i)
    expect(lede).toHaveTextContent(/per malam/i)
    expect(lede).toHaveTextContent(/katalog/i)
    // The clause that stops "your estimate is wrong" support messages.
    expect(lede).toHaveTextContent(/belum tentu/i)
    expect(lede).toHaveTextContent(/estimasi/i)
  })

  it("dates the page from the newest import across every hotel (R7)", async () => {
    signIn("USER")

    render(await PricelistHotelPage())

    expect(screen.getByText(new RegExp(`Data per ${NEWEST_IMPORT}`))).toBeInTheDocument()
    // Not the oldest, and not the first row's date either -- both are 1 Agu.
    expect(screen.queryByText(new RegExp(OLDER_IMPORT))).toBeNull()
  })

  it("renders the shell and an empty state when the catalogue is empty", async () => {
    signIn("USER")
    mockFetchPricelistRows.mockResolvedValue([])

    render(await PricelistHotelPage())

    expect(
      screen.getByRole("heading", { level: 1, name: /pricelist hotel/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/belum ada tarif katalog/i)).toBeInTheDocument()
    expect(pricelistProps).not.toHaveBeenCalled()
    // No rows means no import date to state; a "Data per" line here would be
    // stating something the page does not know.
    expect(screen.queryByText(/Data per/)).toBeNull()
  })
})

/**
 * Every way this codebase names another module, as {statement, module} pairs.
 *
 * Read from disk rather than imported, the way middleware.test.ts reads the
 * build manifest: what is being asserted is the source text of the import
 * statements, which a module import has already erased.
 *
 * One pattern per form, because a single regex misses most of them. An earlier
 * version matched only `import ... from "m"` with a lazy `[\s\S]*?` in the
 * middle, and six shapes walked straight through it: `await import("m")`,
 * `export ... from "m"`, `require("m")`, a bare `import "m"` -- and, worst,
 * a bare `import "m"` sitting ABOVE another import, because `[\s\S]*?` ran past
 * it and reported the NEXT module in its place. `[^"';]*?` is what stops that
 * one: the clause between `import` and `from` may wrap across lines but can
 * never cross a quote.
 */
const IMPORT_PATTERNS = [
  // import x / {x} / * as x / type {x} from "m", and export ... from "m"
  /\b(?:import|export)\s[^"';]*?\bfrom\s*["']([^"']+)["']/g,
  // import "m" -- side-effect only, no bindings
  /\bimport\s*["']([^"']+)["']/g,
  // import("m") -- dynamic, with or without await
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  // require("m")
  /\brequire\s*\(\s*["']([^"']+)["']/g,
]

function importsOf(source: string): Array<{ statement: string; module: string }> {
  const found: Array<{ statement: string; module: string }> = []

  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      found.push({ statement: match[0], module: match[1] })
    }
  }

  return found
}

/**
 * A repo-local module specifier resolved to the file it names, or null for a
 * package (`react`, `drizzle-orm`) this scan does not follow.
 */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let base: string
  if (specifier.startsWith("@/")) base = path.join(process.cwd(), specifier.slice(2))
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier)
  else return null

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }

  return null
}

/** Every {file, module} edge reachable from an entry file, following repo-local imports. */
function importGraph(entry: string): Array<{ file: string; module: string }> {
  const edges: Array<{ file: string; module: string }> = []
  const seen = new Set<string>()
  const queue = [path.join(process.cwd(), entry)]

  while (queue.length > 0) {
    const file = queue.shift() as string
    if (seen.has(file) || !fs.existsSync(file)) continue
    seen.add(file)

    for (const { module } of importsOf(fs.readFileSync(file, "utf8"))) {
      edges.push({ file: path.relative(process.cwd(), file), module })
      const next = resolveLocal(module, file)
      if (next) queue.push(next)
    }
  }

  return edges
}

describe("the pricelist stays clear of the estimate pricing path (R9)", () => {
  /**
   * All three files, not just the page. Checking only the page would let the
   * data layer underneath it acquire the coupling unnoticed -- and
   * lib/hotels/pricelist.ts is the module that actually sits next to the
   * estimate pricing code.
   */
  const FILES = [
    "app/(dashboard)/pricelist-hotel/page.tsx",
    "lib/hotels/pricelist.ts",
    "lib/hotels/pricelist-types.ts",
  ]

  const FORBIDDEN_MODULES = [
    "lib/budget/calculate",
    "lib/estimate/hotel-pricing",
    "lib/ai/tools/hotel-price",
    "lib/ai/tools/hotel-search",
  ]

  const FORBIDDEN_BINDINGS = ["fetchPricingConfig", "resolveHotelSar"]

  it.each(FILES)("%s imports no estimate pricing module or symbol", (relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
    const statements = importsOf(source)

    // A file with no imports at all would pass every assertion below for the
    // wrong reason.
    expect(statements.length).toBeGreaterThan(0)

    for (const { statement, module } of statements) {
      for (const forbidden of FORBIDDEN_MODULES) {
        expect(module, `${relativePath} imports from ${module}`).not.toContain(forbidden)
      }
      for (const binding of FORBIDDEN_BINDINGS) {
        expect(statement, `${relativePath} imports ${binding}`).not.toContain(binding)
      }
    }
  })

  it("reaches no estimate pricing module through a helper either", () => {
    // The direct scan above cannot see a helper module that imports the
    // forbidden path on the page's behalf, so this one follows repo-local
    // edges to the transitive closure -- fifteen files today.
    //
    // Still not the R9 gate. A regression INSIDE resolveHotelSar changes no
    // import statement and would ship green past both of these; the plan's
    // `git diff --exit-code` over the pricing modules is what actually holds
    // R9, and this pair only stops the coupling from being introduced here.
    const edges = importGraph("app/(dashboard)/pricelist-hotel/page.tsx")

    expect(edges.length).toBeGreaterThan(0)

    for (const { file, module } of edges) {
      for (const forbidden of FORBIDDEN_MODULES) {
        expect(module, `${file} imports from ${module}`).not.toContain(forbidden)
      }
    }
  })
})

describe("the pricelist client stays out of the database module graph", () => {
  const CLIENT = "components/pricelist-hotel/PricelistClient.tsx"

  /**
   * The gate `pnpm test` and `npx tsc --noEmit` both structurally cannot be.
   *
   * This suite mocks @/lib/db, and tsc only checks types, so neither notices a
   * "use client" module value-importing a server module. The bundler does: it
   * follows the import into lib/db, into pg, and fails on `fs`/`net`/`dns` --
   * which is exactly how this branch shipped a build that did not compile.
   *
   * `npx next build` is the real check and is now a row in the plan's
   * Verification Contract. This test is the fast, local one that names the
   * cause rather than a webpack trace.
   */
  it('declares "use client" and reaches @/lib/db from nothing it imports', () => {
    const source = fs.readFileSync(path.join(process.cwd(), CLIENT), "utf8")

    expect(source.trimStart().startsWith('"use client"')).toBe(true)

    const edges = importGraph(CLIENT)
    expect(edges.length).toBeGreaterThan(0)

    for (const { file, module } of edges) {
      // lib/db and lib/db/schema, however they are spelled. Matching the
      // module rather than the resolved file keeps the failure message naming
      // the import the author wrote.
      expect(
        /(^|\/)lib\/db($|\/)/.test(module),
        `${file} imports ${module}, which puts pg in the browser bundle`,
      ).toBe(false)
    }

    // The specific regression: lib/hotels/pricelist value-imports db, so the
    // client must take its types from pricelist-types instead.
    expect(edges.map((edge) => edge.module)).not.toContain("@/lib/hotels/pricelist")
  })
})
