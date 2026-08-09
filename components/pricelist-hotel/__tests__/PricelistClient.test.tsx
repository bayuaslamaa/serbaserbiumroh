import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Radix's Select never opens under happy-dom, so every suite that renders one
// takes components/ui/__mocks__/select.tsx instead. Shared rather than inlined:
// three copies of this stub had drifted, and the two that dropped `value` and
// `onValueChange` made the filter wiring untestable.
vi.mock("@/components/ui/select")

import { SOURCE_LABEL_NOT_RECORDED, type PricelistHotel } from "@/lib/hotels/pricelist-types"
import { PricelistClient } from "../PricelistClient"

const CATALOGUE_LABEL = "Katalog 1448H (AZKA + Maysan/MIG)"
const FORECAST_LABEL = "Katalog 1448H (forecast per-bed)"

/**
 * Makkah, QUAD only, August and September -- the shape most of the corpus has
 * today, and the fixture for the twelve-rows-always case (AE3).
 */
const safwa: PricelistHotel = {
  hotelPriceId: "hotel-safwa",
  city: "MAKKAH",
  tier: "STANDARD",
  label: "Safwa Tower 3",
  sublabel: "3★, dekat Haram",
  distance: "250m jalan kaki",
  slug: "safwa-tower-3",
  rates: {
    8: { QUAD: { sarPerNight: 1300, sourceLabel: CATALOGUE_LABEL } },
    9: { QUAD: { sarPerNight: 1150, sourceLabel: CATALOGUE_LABEL } },
  },
  sourceLabels: [CATALOGUE_LABEL],
  updatedAt: new Date("2026-08-01T00:00:00Z"),
}

/**
 * Two room types with two different labels, and a September that has QUAD but
 * no DOUBLE -- the fixture for AE4 and AE6. No slug, so its label must render
 * as plain text.
 */
const darAlEiman: PricelistHotel = {
  hotelPriceId: "hotel-dar",
  city: "MADINAH",
  tier: "ECONOMY",
  label: "Dar Al Eiman",
  sublabel: "2★, seberang pelataran",
  distance: "400m",
  slug: null,
  rates: {
    8: {
      QUAD: { sarPerNight: 900, sourceLabel: CATALOGUE_LABEL },
      DOUBLE: { sarPerNight: 760, sourceLabel: FORECAST_LABEL },
    },
    9: { QUAD: { sarPerNight: 850, sourceLabel: CATALOGUE_LABEL } },
  },
  sourceLabels: [CATALOGUE_LABEL, FORECAST_LABEL],
  updatedAt: new Date("2026-08-02T00:00:00Z"),
}

/** Every row imported before source_label existed, so composePricelist gave it the sentinel. */
const millennium: PricelistHotel = {
  hotelPriceId: "hotel-millennium",
  city: "MADINAH",
  tier: "PREMIUM",
  label: "Millennium Al Aqeeq",
  sublabel: "5★",
  distance: null,
  slug: "millennium-al-aqeeq",
  rates: {
    8: { QUAD: { sarPerNight: 2100, sourceLabel: SOURCE_LABEL_NOT_RECORDED } },
  },
  sourceLabels: [SOURCE_LABEL_NOT_RECORDED],
  updatedAt: new Date("2026-08-03T00:00:00Z"),
}

const hotels = [safwa, darAlEiman, millennium]

/** The labels carry parentheses and a plus sign, so they cannot go into a RegExp raw. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Opens a hotel's month table and returns it. */
function expand(label: string): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`tarif bulanan ${label}`, "i") }))
  return within(screen.getByRole("region", { name: label })).getByRole("table")
}

function bodyRows(table: HTMLElement): HTMLElement[] {
  const [, body] = within(table).getAllByRole("rowgroup")
  return within(body).getAllByRole("row")
}

describe("PricelistClient", () => {
  it("renders twelve month rows for a hotel with only two months of rates", () => {
    render(<PricelistClient hotels={hotels} />)

    const rows = bodyRows(expand("Safwa Tower 3"))

    expect(rows).toHaveLength(12)

    const withRate = rows.filter((row) => row.textContent?.includes("SAR"))
    const withoutRate = rows.filter((row) =>
      within(row)
        .getAllByRole("cell")
        .every((cell) => cell.textContent?.includes("Tarif tidak tersedia"))
    )

    expect(withRate).toHaveLength(2)
    expect(withoutRate).toHaveLength(10)
  })

  it("leaves a month's DOUBLE cell empty rather than repeating the QUAD figure", () => {
    render(<PricelistClient hotels={hotels} />)

    const table = expand("Dar Al Eiman")
    const columns = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent)
    expect(columns).toEqual(["Bulan", "QUAD", "DOUBLE"])

    const september = bodyRows(table)[8]
    const [quad, double] = within(september).getAllByRole("cell")

    expect(quad).toHaveTextContent("SAR 850")
    expect(double).toHaveTextContent("Tarif tidak tersedia")
    expect(double.textContent).not.toContain("850")
  })

  it("gives an empty cell sr-only wording and never a zero, dash, or NaN", () => {
    render(<PricelistClient hotels={hotels} />)

    const february = bodyRows(expand("Safwa Tower 3"))[1]
    const [cell] = within(february).getAllByRole("cell")

    // Accessible name, not props: this is what a screen reader announces.
    expect(within(february).getByRole("cell", { name: /tarif tidak tersedia/i })).toBe(cell)
    expect(cell.textContent).not.toMatch(/[0-9]/)
    // Every dash, not just ASCII hyphen-minus. /-/ alone let U+2010 through and
    // U+2013/2014/2212 with it -- and an en dash in a price column reads as a
    // rate exactly the way the hyphen R4 forbids does.
    expect(cell.textContent).not.toMatch(/[-‐-―−]/)
    expect(cell.textContent).not.toMatch(/NaN/)
  })

  it("renders no IDR anywhere -- every figure on this page is catalogue SAR", () => {
    const { container } = render(<PricelistClient hotels={hotels} />)

    for (const hotel of hotels) expand(hotel.label)

    expect(container.textContent).not.toMatch(/Rp/)
    expect(container.textContent).not.toMatch(/IDR/)
  })

  it("attributes a QUAD rate and a DOUBLE rate to their own source labels", () => {
    render(<PricelistClient hotels={hotels} />)

    const august = bodyRows(expand("Dar Al Eiman"))[7]
    const [quad, double] = within(august).getAllByRole("cell")

    expect(quad).toHaveAccessibleName(expect.stringContaining(CATALOGUE_LABEL))
    expect(quad).not.toHaveAccessibleName(expect.stringContaining(FORECAST_LABEL))
    expect(double).toHaveAccessibleName(expect.stringContaining(FORECAST_LABEL))
    expect(double).not.toHaveAccessibleName(expect.stringContaining(CATALOGUE_LABEL))
  })

  it("uses the page legend's source numbers in expanded hotel tables", () => {
    render(<PricelistClient hotels={hotels} />)

    const august = bodyRows(expand("Millennium Al Aqeeq"))[7]
    const [quad] = within(august).getAllByRole("cell")
    const section = screen.getByRole("region", { name: "Millennium Al Aqeeq" })

    // Millennium has only the sentinel label, but it is the third label on
    // the page. Numbering it locally would either hide the marker or call it
    // source 1, which points to the catalogue label in the page legend.
    expect(quad.querySelector("sup")?.textContent).toBe("3")
    expect(section).toHaveTextContent(`3. ${SOURCE_LABEL_NOT_RECORDED}`)
  })

  it("lists every distinct source label in the page-level legend", () => {
    render(<PricelistClient hotels={hotels} />)

    const legend = screen.getByRole("region", { name: /keterangan sumber/i })

    // Substring match: with more than one label present the entries carry the
    // marker the rate cells point at, so the text is "1. Katalog ...".
    expect(within(legend).getByText(new RegExp(escapeRegExp(CATALOGUE_LABEL)))).toBeInTheDocument()
    expect(within(legend).getByText(new RegExp(escapeRegExp(FORECAST_LABEL)))).toBeInTheDocument()
    expect(
      within(legend).getByText(new RegExp(escapeRegExp(SOURCE_LABEL_NOT_RECORDED))),
    ).toBeInTheDocument()
  })

  it("shows the not-recorded wording for a hotel whose rows carry the sentinel", () => {
    render(<PricelistClient hotels={hotels} />)

    expand("Millennium Al Aqeeq")
    const section = screen.getByRole("region", { name: "Millennium Al Aqeeq" })

    expect(within(section).getAllByText(new RegExp(SOURCE_LABEL_NOT_RECORDED)).length).toBeGreaterThan(0)
  })

  it("narrows the list by city and reports shown-of-total", () => {
    render(<PricelistClient hotels={hotels} />)

    expect(screen.getByText("Menampilkan 3 dari 3 hotel")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "MADINAH" }))

    expect(screen.getByText("Menampilkan 2 dari 3 hotel")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Safwa Tower 3" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Dar Al Eiman" })).toBeInTheDocument()
  })

  it("narrows the list by tier", () => {
    // The city case above leaves the tier branch entirely uncovered: deleting
    // `if (tier !== ALL && hotel.tier !== tier) return false` kept the whole
    // suite green. The fixture already discriminates -- Safwa is STANDARD, Dar
    // Al Eiman ECONOMY, Millennium PREMIUM.
    render(<PricelistClient hotels={hotels} />)

    fireEvent.click(screen.getByRole("button", { name: "PREMIUM" }))

    expect(screen.getByText("Menampilkan 1 dari 3 hotel")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Millennium Al Aqeeq" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Safwa Tower 3" })).not.toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Dar Al Eiman" })).not.toBeInTheDocument()

    // Crossed with the city filter, which sits on the same hotel: tier alone
    // could be passing because PREMIUM happens to select the same row a broken
    // city filter would.
    fireEvent.click(screen.getByRole("button", { name: "MAKKAH" }))
    expect(screen.getByText("Menampilkan 0 dari 3 hotel")).toBeInTheDocument()
  })

  it("shows each filter's own state on its own trigger", () => {
    // A control that filters correctly but displays somebody else's state --
    // `<Select value={tier} onValueChange={setCity}>` -- passes every filtering
    // assertion in this file. The accessible names come from the aria-labels
    // the component sets on each trigger.
    render(<PricelistClient hotels={hotels} />)

    const trigger = (name: string) => screen.getByRole("combobox", { name })

    expect(trigger("Kota")).toHaveTextContent("Semua Kota")
    expect(trigger("Tier")).toHaveTextContent("Semua Tier")
    expect(trigger("Bulan")).toHaveTextContent("Semua Bulan")

    fireEvent.click(screen.getByRole("button", { name: "MADINAH" }))
    expect(trigger("Kota")).toHaveTextContent("MADINAH")
    expect(trigger("Tier")).toHaveTextContent("Semua Tier")
    expect(trigger("Bulan")).toHaveTextContent("Semua Bulan")

    fireEvent.click(screen.getByRole("button", { name: "ECONOMY" }))
    expect(trigger("Kota")).toHaveTextContent("MADINAH")
    expect(trigger("Tier")).toHaveTextContent("ECONOMY")

    fireEvent.click(screen.getByRole("button", { name: "September" }))
    expect(trigger("Kota")).toHaveTextContent("MADINAH")
    expect(trigger("Tier")).toHaveTextContent("ECONOMY")
    expect(trigger("Bulan")).toHaveTextContent("September")
  })

  it("collapses to one row per hotel carrying only the selected month", () => {
    render(<PricelistClient hotels={hotels} />)

    fireEvent.click(screen.getByRole("button", { name: "September" }))

    const table = screen.getByRole("table", { name: /September/i })
    const rows = bodyRows(table)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("SAR 1.150")
    // August's figure for the same hotel must not leak into the September view.
    expect(table.textContent).not.toContain("SAR 1.300")
    // A hotel with no September row still appears, with the empty treatment.
    expect(rows[2]).toHaveTextContent("Tarif tidak tersedia")
  })

  it("keeps the rate columns when no shown hotel has a rate that month", () => {
    // No fixture hotel covers Oktober. roomTypesAcross returned [] for it, so
    // the table rendered ['Hotel','Kota','Tier'] and nothing else: no price
    // columns, and therefore no "Tarif tidak tersedia" anywhere. The
    // filtered.length === 0 guard does not fire -- three hotels ARE shown --
    // so the R4 promise failed in the view the feature exists for.
    render(<PricelistClient hotels={hotels} />)

    fireEvent.click(screen.getByRole("button", { name: "Oktober" }))

    const table = screen.getByRole("table", { name: /Oktober/i })
    const columns = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent)

    expect(columns).toEqual(["Hotel", "Kota", "Tier", "QUAD", "DOUBLE"])

    const rows = bodyRows(table)
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row).toHaveTextContent("Tarif tidak tersedia")
      expect(row.textContent).not.toMatch(/SAR/)
    }
  })

  it("marks a comparison-table rate with the source it came from", () => {
    // markerIndex was hardcoded to null here, so a sighted reader had no way to
    // tell a catalogue rate from a forecast one in the view built for
    // comparison -- the sr-only attribution carried the whole load. The
    // numbering indexes the page-level label list, so the same superscript
    // means the same source on every row.
    render(<PricelistClient hotels={hotels} />)

    fireEvent.click(screen.getByRole("button", { name: "Agustus" }))

    const table = screen.getByRole("table", { name: /Agustus/i })
    const legend = screen.getByRole("region", { name: /keterangan sumber/i })

    // Sorted id-ID and numbered, or the superscripts point at nothing.
    const legendOrder = within(legend)
      .getAllByRole("term")
      .map((term) => term.textContent)
    expect(legendOrder).toEqual([
      `1. ${CATALOGUE_LABEL}`,
      `2. ${FORECAST_LABEL}`,
      `3. ${SOURCE_LABEL_NOT_RECORDED}`,
    ])

    const [, darRow] = bodyRows(table)
    const [, , quad, double] = within(darRow).getAllByRole("cell")

    // Dar Al Eiman's August QUAD is the catalogue, its DOUBLE the forecast.
    expect(quad.querySelector("sup")?.textContent).toBe("1")
    expect(double.querySelector("sup")?.textContent).toBe("2")

    // Page-level, not per-hotel: Millennium carries one label of its own, and
    // a per-hotel index would number it 1 -- the same superscript as the
    // catalogue rate directly above it, for a different source.
    const [, , millenniumQuad] = within(bodyRows(table)[2]).getAllByRole("cell")
    expect(millenniumQuad.querySelector("sup")?.textContent).toBe("3")
  })

  it("keeps hotel sections collapsed until their toggle is pressed", () => {
    render(<PricelistClient hotels={hotels} />)

    const section = screen.getByRole("region", { name: "Safwa Tower 3" })
    const toggle = within(section).getByRole("button", { name: /tarif bulanan/i })

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(within(section).queryByRole("table")).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(within(section).getByRole("table")).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(within(section).queryByRole("table")).not.toBeInTheDocument()
  })

  it("matches a name substring case-insensitively and intersects with the other filters", () => {
    render(<PricelistClient hotels={hotels} />)

    fireEvent.change(screen.getByPlaceholderText(/cari nama hotel/i), {
      target: { value: "safwa" },
    })

    expect(screen.getByText("Menampilkan 1 dari 3 hotel")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "MADINAH" }))

    expect(screen.getByText("Menampilkan 0 dari 3 hotel")).toBeInTheDocument()
  })

  it("renders the empty state and no table when nothing matches", () => {
    render(<PricelistClient hotels={hotels} />)

    fireEvent.change(screen.getByPlaceholderText(/cari nama hotel/i), {
      target: { value: "hotel yang tidak ada" },
    })

    expect(screen.getByText(/tidak ada hotel yang cocok/i)).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("links a slugged hotel to its detail page and leaves an unslugged one as text", () => {
    render(<PricelistClient hotels={hotels} />)

    expect(screen.getByRole("link", { name: "Safwa Tower 3" })).toHaveAttribute(
      "href",
      "/hotel-nusuk/safwa-tower-3"
    )
    expect(screen.queryByRole("link", { name: "Dar Al Eiman" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Dar Al Eiman" })).toBeInTheDocument()
  })
})
