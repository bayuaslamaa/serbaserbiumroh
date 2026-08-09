import fs from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { importGraph, importsOf } from "@/test/import-graph"

/**
 * What this page decides -- who may see it, what it reads, and what it hands
 * the client -- rather than how the list looks. The presentation is covered by
 * components/pricelist-hotel/__tests__/PricelistClient.test.tsx, and the
 * client's own "use client" boundary by
 * components/pricelist-hotel/__tests__/client-boundary.test.ts.
 *
 * The last describe is the exception, and deliberately so: R9 is a promise
 * about what this page's module graph may reach, which is a decision the page
 * makes and not a rendering concern.
 */

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))

/**
 * Hoisted so the vi.mock factories below can write into them -- factories run
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
 *
 * `dbTouches` widens that from one module to the whole database. Naming the
 * catalogue module still leaves the gate porous the other way: a page reading
 * anything else that talks to Postgres -- lib/stats/visitor-count,
 * lib/hotels/detail, a dynamic import of @/lib/db -- pays for a query before
 * the session is checked while `catalogueCalls` stays empty. Every one of them
 * has to reach the single `db` handle this repo exports, so recording touches
 * on that handle catches the read whatever module it was written in.
 */
const { catalogueCalls, dbTouches, fetchRows } = vi.hoisted(() => ({
  catalogueCalls: [] as string[],
  dbTouches: [] as string[],
  fetchRows: vi.fn(),
}))

/**
 * `db` is a Proxy that records instead of a `{}` that throws.
 *
 * `{}` was doing two jobs badly. It could only be noticed by a caller that let
 * the resulting TypeError propagate, so `void fetchExchangeRate(db).catch(() =>
 * {})` -- a fire-and-forget warm-up ahead of the gate -- swallowed the throw
 * and left the redirect test green. And it recorded nothing, so the only
 * evidence a read had happened was whichever named spy the test remembered to
 * check. Recording every property access and call means the touch is logged
 * before anything downstream gets the chance to discard it.
 */
vi.mock("@/lib/db", () => {
  /**
   * Not a database read: the hooks a test runner, a pretty-printer or `await`
   * reaches for while inspecting the handle. Answered with something inert and
   * left out of the log, or `expect(dbTouches).toEqual([])` would be asserting
   * against vitest's own introspection. `then` in particular must not come back
   * callable -- a thenable handle makes `await db` hang.
   */
  const INSPECTION = new Set(["then", "toString", "valueOf", "toJSON", "inspect", "constructor"])

  const record = (trail: string): unknown =>
    new Proxy(() => {}, {
      get(_target, prop) {
        if (typeof prop === "symbol") {
          return prop === Symbol.toPrimitive ? () => trail : undefined
        }
        if (INSPECTION.has(prop)) return prop === "then" ? undefined : () => trail
        dbTouches.push(`${trail}.${prop}`)
        return record(`${trail}.${prop}`)
      },
      apply() {
        dbTouches.push(`${trail}()`)
        return record(`${trail}()`)
      },
      // Keeps a failed assertion's pretty-printer from walking an infinitely
      // deep object. An arrow function's own keys are all configurable, so
      // hiding them breaks no Proxy invariant.
      ownKeys: () => [],
    })

  return { db: record("db") }
})

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
import type { PricelistHotel, PricelistRow } from "@/lib/hotels/pricelist-types"
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
    // Static imports link before any test runs, so whatever reading `db` off
    // the mocked namespace cost is charged to nobody. Cleared here so each test
    // sees only its own touches.
    dbTouches.length = 0
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
    // And nothing from the database at all. This is the assertion with reach:
    // catalogueCalls only knows about lib/hotels/pricelist, so a read written
    // through any other db-touching module -- or a raw db.select() inline --
    // slips past it and lands here instead.
    expect(dbTouches).toEqual([])
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
      dbTouches.length = 0
      await pageModule.generateMetadata({ params: {}, searchParams: {} })
      expect(catalogueCalls).toEqual([])
      expect(dbTouches).toEqual([])
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

  it("shows the per-hotel import range when catalogue freshness differs (R7)", async () => {
    signIn("USER")

    render(await PricelistHotelPage())

    expect(
      screen.getByText(new RegExp(`Pembaruan data per hotel: ${OLDER_IMPORT}–${NEWEST_IMPORT}`)),
    ).toBeInTheDocument()
  })

  it("collapses to one date when every hotel was imported on the same run (R7)", async () => {
    signIn("USER")
    // One instant across every row: the range has nothing to say, so it must
    // not say it twice.
    const sameInstant = new Date("2026-08-05T12:00:00Z")
    mockFetchPricelistRows.mockResolvedValue(
      ROWS.map((r) => ({ ...r, updatedAt: sameInstant })),
    )

    render(await PricelistHotelPage())

    const line = screen.getByText(/Pembaruan data per hotel:/)
    expect(line).toHaveTextContent(`Pembaruan data per hotel: ${NEWEST_IMPORT}.`)
    expect(line.textContent).not.toContain("–")
  })

  it("collapses to one date for two imports on the same calendar day (R7)", async () => {
    signIn("USER")
    // The partial-correction workflow: a second import corrects a few hotels
    // a few hours after the first. Two distinct instants, one calendar date.
    // Guarding on getTime() rendered "5 Agu 2026–5 Agu 2026" here -- a range
    // claiming freshness differs when the two displayed dates are identical.
    // Straddling midday UTC, like ROWS, so the pair stays on one calendar day
    // in every timezone this suite plausibly runs in.
    mockFetchPricelistRows.mockResolvedValue([
      { ...ROWS[0], updatedAt: new Date("2026-08-05T11:45:00Z") },
      { ...ROWS[2], updatedAt: new Date("2026-08-05T12:15:00Z") },
    ])

    render(await PricelistHotelPage())

    const line = screen.getByText(/Pembaruan data per hotel:/)
    expect(line).toHaveTextContent(`Pembaruan data per hotel: ${NEWEST_IMPORT}.`)
    expect(line.textContent).not.toContain("–")
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
    // No rows means no import date to state; a "Pembaruan data" line here would be
    // stating something the page does not know. Matched case-insensitively
    // against the words the page actually renders: the earlier /Data per/
    // matched no production file at all, so it could not have failed in any
    // state -- seeding the importRange reduce with a non-null accumulator would
    // have dated an empty catalogue and left this green.
    expect(screen.queryByText(/Pembaruan data/i)).toBeNull()
  })
})

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
