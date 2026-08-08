import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

import { composePricelist, SOURCE_LABEL_NOT_RECORDED, type PricelistRow } from "../pricelist"

/**
 * One catalogue row. Every field defaults to the same Makkah hotel so a test
 * only has to state the part it is about.
 */
function row(overrides: Partial<PricelistRow> = {}): PricelistRow {
  return {
    hotelPriceId: "hotel-1",
    city: "MAKKAH",
    tier: "STANDARD",
    label: "Safwa Tower 3",
    sublabel: "3★, dekat Haram",
    distance: "250m jalan kaki",
    slug: "safwa-tower-3",
    month: 8,
    roomType: "QUAD",
    sarPerNight: 1300,
    sourceLabel: "Katalog 1448H (AZKA + Maysan/MIG)",
    updatedAt: new Date("2026-08-01"),
    ...overrides,
  }
}

describe("composePricelist", () => {
  it("returns an empty list rather than throwing when there are no rows", () => {
    expect(composePricelist([])).toEqual([])
  })

  it("carries the hotel's identity through from the joined row", () => {
    const [hotel] = composePricelist([row()])

    expect(hotel).toMatchObject({
      hotelPriceId: "hotel-1",
      city: "MAKKAH",
      tier: "STANDARD",
      label: "Safwa Tower 3",
      sublabel: "3★, dekat Haram",
      distance: "250m jalan kaki",
      slug: "safwa-tower-3",
    })
  })

  it("pivots a hotel's rows into exactly the months it has, each with its own rate", () => {
    const [hotel] = composePricelist([
      row({ month: 8, sarPerNight: 1300 }),
      row({ month: 9, sarPerNight: 1150 }),
      row({ month: 11, sarPerNight: 1400 }),
    ])

    expect(Object.keys(hotel.rates)).toEqual(["8", "9", "11"])
    expect(hotel.rates[8]?.QUAD?.sarPerNight).toBe(1300)
    expect(hotel.rates[9]?.QUAD?.sarPerNight).toBe(1150)
    expect(hotel.rates[11]?.QUAD?.sarPerNight).toBe(1400)
  })

  it("leaves a month with no catalogue row absent, not zeroed or blanked", () => {
    // The page renders absence as a deliberate empty cell (R4/AE3). A zero or
    // an empty string here would render as a rate the catalogue never quoted.
    const [hotel] = composePricelist([row({ month: 8 })])

    expect(hotel.rates[2]).toBeUndefined()
    expect(Object.hasOwn(hotel.rates, 2)).toBe(false)
  })

  it("does not copy a QUAD rate across to a room type with no row that month", () => {
    // AE6: no multiplier, no reuse -- the DOUBLE cell stays empty.
    const [hotel] = composePricelist([row({ month: 8, roomType: "QUAD", sarPerNight: 1300 })])

    expect(hotel.rates[8]?.QUAD?.sarPerNight).toBe(1300)
    expect(hotel.rates[8]?.DOUBLE).toBeUndefined()
    expect(Object.keys(hotel.rates[8]!)).toEqual(["QUAD"])
  })

  it("exposes no field sourced from hotel_prices.sarPerNight or hotel_monthly_prices", () => {
    // R3. Asserted on the key set rather than on a single field, so widening
    // the select to carry the estimate base through fails here.
    const [hotel] = composePricelist([row()])

    expect(Object.keys(hotel).sort()).toEqual(
      [
        "city",
        "distance",
        "hotelPriceId",
        "label",
        "rates",
        "slug",
        "sourceLabels",
        "sublabel",
        "tier",
        "updatedAt",
      ].sort()
    )
    expect(hotel).not.toHaveProperty("sarPerNight")
    expect(hotel).not.toHaveProperty("monthlyPrices")
  })

  it("surfaces a blank sourceLabel as the not-recorded sentinel", () => {
    // "" is a live value: rows imported before source_label existed carry it.
    const [hotel] = composePricelist([row({ sourceLabel: "" })])

    expect(hotel.rates[8]?.QUAD?.sourceLabel).toBe(SOURCE_LABEL_NOT_RECORDED)
    expect(hotel.sourceLabels).toEqual([SOURCE_LABEL_NOT_RECORDED])
  })

  it("passes a recorded sourceLabel through unchanged", () => {
    const [hotel] = composePricelist([row({ sourceLabel: "Katalog Emaar 2027" })])

    expect(hotel.rates[8]?.QUAD?.sourceLabel).toBe("Katalog Emaar 2027")
  })

  it("keeps two room types in one month attributable to their own labels", () => {
    // AE4. unique(hotelPriceId, month, roomType) means the two labels can only
    // ever meet on different room types.
    const [hotel] = composePricelist([
      row({ month: 11, roomType: "QUAD", sarPerNight: 1300, sourceLabel: "Katalog 1448H (AZKA + Maysan/MIG)" }),
      row({ month: 11, roomType: "DOUBLE", sarPerNight: 2100, sourceLabel: "Katalog 1448H (forecast per-bed)" }),
    ])

    expect(hotel.rates[11]?.QUAD).toEqual({
      sarPerNight: 1300,
      sourceLabel: "Katalog 1448H (AZKA + Maysan/MIG)",
    })
    expect(hotel.rates[11]?.DOUBLE).toEqual({
      sarPerNight: 2100,
      sourceLabel: "Katalog 1448H (forecast per-bed)",
    })
    expect(hotel.sourceLabels).toEqual([
      "Katalog 1448H (AZKA + Maysan/MIG)",
      "Katalog 1448H (forecast per-bed)",
    ])
  })

  it("lists each distinct source label once", () => {
    const [hotel] = composePricelist([
      row({ month: 8, sourceLabel: "Katalog Emaar 2027" }),
      row({ month: 9, sourceLabel: "Katalog Emaar 2027" }),
    ])

    expect(hotel.sourceLabels).toEqual(["Katalog Emaar 2027"])
  })

  it("reports the newest updatedAt across the hotel's rows", () => {
    // R7: the page states when its data was last imported, and an older row
    // must not date the whole hotel back.
    const [hotel] = composePricelist([
      row({ month: 8, updatedAt: new Date("2026-07-01") }),
      row({ month: 9, updatedAt: new Date("2026-08-08") }),
      row({ month: 10, updatedAt: new Date("2026-06-15") }),
    ])

    expect(hotel.updatedAt).toEqual(new Date("2026-08-08"))
  })

  it("drops a room type this build does not know", () => {
    // room_type is plain text, so a retired type or a hand-inserted typo can
    // reach here. Publishing it would create a column nothing can render.
    const [hotel] = composePricelist([
      row({ month: 8, roomType: "QUAD", sarPerNight: 1300 }),
      row({ month: 8, roomType: "SINGLE", sarPerNight: 3000 }),
    ])

    expect(Object.keys(hotel.rates[8]!)).toEqual(["QUAD"])
    expect(hotel.rates[8]).not.toHaveProperty("SINGLE")
  })

  it("drops a row whose month falls outside 1-12", () => {
    // month is a plain integer column with no check constraint.
    const [hotel] = composePricelist([row({ month: 8 }), row({ month: 0 }), row({ month: 13 })])

    expect(Object.keys(hotel.rates)).toEqual(["8"])
  })

  it("omits a hotel whose every row was dropped", () => {
    expect(composePricelist([row({ roomType: "SINGLE" })])).toEqual([])
  })

  it("sorts hotels by city, then by price-ascending tier, then by label", () => {
    // PELATARAN sits between STANDARD and PREMIUM on price. Alphabetical order
    // would put it before both and contradict every other hotel surface.
    const hotels = composePricelist([
      row({ hotelPriceId: "h-mad-std", city: "MADINAH", tier: "STANDARD", label: "Al Eiman Royal" }),
      row({ hotelPriceId: "h-mkh-pel", city: "MAKKAH", tier: "PELATARAN", label: "Jabal Omar Hyatt" }),
      row({ hotelPriceId: "h-mkh-std-b", city: "MAKKAH", tier: "STANDARD", label: "Safwa Tower 3" }),
      row({ hotelPriceId: "h-mkh-prem", city: "MAKKAH", tier: "PREMIUM", label: "Fairmont Clock Tower" }),
      row({ hotelPriceId: "h-mkh-std-a", city: "MAKKAH", tier: "STANDARD", label: "Anjum Hotel" }),
      row({ hotelPriceId: "h-mkh-eco", city: "MAKKAH", tier: "ECONOMY", label: "Rawdah Al Aqeeq" }),
    ])

    expect(hotels.map((h) => h.hotelPriceId)).toEqual([
      "h-mkh-eco",
      "h-mkh-std-a",
      "h-mkh-std-b",
      "h-mkh-pel",
      "h-mkh-prem",
      "h-mad-std",
    ])
  })

  it("groups rows by hotel even when they arrive interleaved", () => {
    const hotels = composePricelist([
      row({ hotelPriceId: "h-a", label: "Anjum Hotel", month: 8 }),
      row({ hotelPriceId: "h-b", label: "Bakkah Suites", month: 8 }),
      row({ hotelPriceId: "h-a", label: "Anjum Hotel", month: 9 }),
    ])

    expect(hotels).toHaveLength(2)
    expect(Object.keys(hotels[0].rates)).toEqual(["8", "9"])
    expect(Object.keys(hotels[1].rates)).toEqual(["8"])
  })
})
