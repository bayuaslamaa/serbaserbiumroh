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

// Only the query half is mocked. composePricelist stays real, so the list the
// page hands over is the genuine pivot rather than a hand-built stand-in that
// could agree with a broken page.
vi.mock("@/lib/hotels/pricelist", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/hotels/pricelist")>()),
  fetchPricelistRows: vi.fn(),
}))

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
import { fetchPricelistRows, type PricelistHotel, type PricelistRow } from "@/lib/hotels/pricelist"
import PricelistHotelPage from "../page"

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>
const mockFetchPricelistRows = fetchPricelistRows as ReturnType<typeof vi.fn>

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
  })

  it("reads nothing and renders nothing when requireAuth redirects", async () => {
    // The call-order test cannot catch a page that fires both in a Promise.all
    // and swallows the redirect -- requireAuth would still be invoked first.
    // This one can: the read must not happen at all.
    mockRequireAuth.mockRejectedValue(redirectError())

    await expect(PricelistHotelPage()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    })

    expect(mockFetchPricelistRows).not.toHaveBeenCalled()
    expect(pricelistProps).not.toHaveBeenCalled()
  })
})

describe("/pricelist-hotel renders the catalogue for any signed-in user", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

describe("the pricelist stays clear of the estimate pricing path (R9)", () => {
  /**
   * Read from disk rather than imported, the way middleware.test.ts reads the
   * build manifest: what is being asserted is the source text of the import
   * statements, which a module import has already erased.
   *
   * Both files, not just the page. Checking only the page would let the data
   * layer underneath it acquire the coupling unnoticed -- and lib/hotels/pricelist.ts
   * is the module that actually sits next to the estimate pricing code.
   */
  const FILES = [
    "app/(dashboard)/pricelist-hotel/page.tsx",
    "lib/hotels/pricelist.ts",
  ]

  /** Every `import ... from "<module>"` statement, whole text plus its path. */
  function importsOf(source: string): Array<{ statement: string; module: string }> {
    const found: Array<{ statement: string; module: string }> = []
    const pattern = /import\s[\s\S]*?from\s*["']([^"']+)["']/g

    for (const match of source.matchAll(pattern)) {
      found.push({ statement: match[0], module: match[1] })
    }

    return found
  }

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
})
