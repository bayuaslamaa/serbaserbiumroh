import { describe, it, expect } from "vitest"
import { cariHotel, CARI_HOTEL_DEFAULT_LIMIT } from "@/lib/ai/tools/hotel-search"
import { resolveHotelSar } from "@/lib/estimate/hotel-pricing"
import { distanceScore } from "@/lib/estimate/hotel-distance"
import { makeHotel, makePricing, realPrices } from "./fixtures"

// Base rates and month-3 catalogue rates deliberately disagree, so a filter or a row that reads the
// base sarPerNight instead of the resolved month rate fails visibly.
const walking = makeHotel({
  id: "taiba-front",
  label: "Taiba Front",
  sublabel: "standard Madinah",
  distance: "250m jalan kaki",
  sarPerNight: 950,
  realMonthlyPrices: realPrices({ 3: { QUAD: [880, "Katalog Taiba 1448H"] } }),
})

const shuttle = makeHotel({
  id: "aziz-shuttle",
  label: "Aziz Plaza",
  sublabel: "standard Madinah",
  distance: "1.2 km shuttle",
  sarPerNight: 700,
  realMonthlyPrices: realPrices({ 3: { QUAD: [880, "Katalog Aziz 1448H"] } }),
})

const overBudget = makeHotel({
  id: "dallah-taiba",
  label: "Dallah Taiba",
  sublabel: "premium Madinah",
  distance: "pelataran Nabawi",
  sarPerNight: 700, // cheap on the estimate, expensive in the catalogue
  tier: "PREMIUM",
  realMonthlyPrices: realPrices({ 3: { QUAD: [1600, "Katalog Dallah 1448H"] } }),
})

const estimateOnly = makeHotel({
  id: "kayan-hotel",
  label: "Kayan Hotel",
  sublabel: "standard Madinah",
  distance: "900m",
  sarPerNight: 600,
  monthlyPrices: { 3: 650 },
  realMonthlyPrices: {},
})

const pricing = makePricing({ MADINAH: [walking, shuttle, overBudget, estimateOnly] })

describe("cari_hotel", () => {
  it("returns rows that each carry the month rate and its source_label", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, tier: "STANDARD", max_sar_per_night: 900 })

    expect(result.month).toBe(3)
    expect(result.room_type).toBe("QUAD")
    expect(result.rows.map((row) => [row.id, row.sar_per_night, row.source, row.source_label])).toEqual([
      ["kayan-hotel", 650, "estimate", ""],
      // Equal catalogue price: the walking hotel outranks the shuttle one.
      ["taiba-front", 880, "real", "Katalog Taiba 1448H"],
      ["aziz-shuttle", 880, "real", "Katalog Aziz 1448H"],
    ])
    expect(result.rows.map((row) => row.basis)).toEqual(["estimate", "catalogue_exact", "catalogue_exact"])
  })

  it("ranks a walking-distance hotel above a shuttle hotel at equal price", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, tier: "STANDARD", require_real_price: true })

    expect(result.rows.map((row) => row.id)).toEqual(["taiba-front", "aziz-shuttle"])
    expect(distanceScore(walking)).toBeLessThan(distanceScore(shuttle))
    expect(result.rows[0].distance_meters).toBe(distanceScore(walking))
    // The raw catalogue text travels with the row so the model can quote it verbatim.
    expect(result.rows[0].distance).toBe("250m jalan kaki")
  })

  it("applies the SAR ceiling to the resolved month rate, not the base estimate", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, max_sar_per_night: 900 })

    // dallah-taiba is 700 SAR on the estimate but 1600 in the month-3 catalogue.
    expect(result.rows.map((row) => row.id)).not.toContain("dallah-taiba")
    expect(cariHotel(pricing, { city: "MADINAH", month: 3, max_sar_per_night: 1600 }).rows.map((r) => r.id)).toContain(
      "dallah-taiba"
    )
  })

  it("respects the tier filter", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, tier: "PREMIUM" })

    expect(result.rows.map((row) => row.id)).toEqual(["dallah-taiba"])
    expect(result.total_matches).toBe(1)
  })

  it("respects a distance ceiling", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, max_distance_meters: 500 })

    expect(result.rows.map((row) => row.id).sort()).toEqual(["dallah-taiba", "taiba-front"])
  })

  it("can keep only hotels with a catalogue rate for the month", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, require_real_price: true })

    expect(result.rows.map((row) => row.id)).not.toContain("kayan-hotel")
    expect(result.rows.every((row) => row.basis !== "estimate")).toBe(true)
  })

  it("marks a hotel with no catalogue rate for the month as estimate-priced", () => {
    const [row] = cariHotel(pricing, { city: "MADINAH", month: 3, max_sar_per_night: 660 }).rows

    expect(row.id).toBe("kayan-hotel")
    expect(row.basis).toBe("estimate")
    expect(row.room_type_priced).toBe(false)
    expect(row.source_label).toBe("")
  })

  it("flags a QUAD stand-in on the shortlist instead of presenting it as the asked room type", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, room_type: "DOUBLE", require_real_price: true })

    const row = result.rows.find((candidate) => candidate.id === "taiba-front")!
    expect(row.room_type).toBe("DOUBLE")
    expect(row.priced_room_type).toBe("QUAD")
    expect(row.basis).toBe("catalogue_quad_fallback")
    expect(row.room_type_priced).toBe(false)
  })

  // The anti-divergence guard on the search path: a shortlist row's rate has to be the same number
  // the cost calculation will charge, asserted against resolveHotelSar itself.
  it("prices every row exactly as resolveHotelSar does", () => {
    const hotels = [walking, shuttle, overBudget, estimateOnly]
    for (const month of [3, 7]) {
      for (const roomType of ["QUAD", "DOUBLE"] as const) {
        const result = cariHotel(pricing, { city: "MADINAH", month, room_type: roomType, limit: 25 })
        expect(result.rows).toHaveLength(hotels.length)
        for (const row of result.rows) {
          const hotel = hotels.find((candidate) => candidate.id === row.id)!
          const expected = resolveHotelSar(hotel, roomType, month)
          expect(row.sar_per_night).toBe(expected.sarPerNight)
          expect(row.source).toBe(expected.source)
          expect(row.room_type_priced).toBe(expected.roomTypePriced)
          expect(row.source_label).toBe(expected.sourceLabel)
        }
      }
    }
  })

  it("caps the rows and reports total_matches with truncated", () => {
    const many = makePricing({
      MADINAH: Array.from({ length: 12 }, (_, index) =>
        makeHotel({ id: `hotel-${index}`, sarPerNight: 500 + index })
      ),
    })

    const capped = cariHotel(many, { city: "MADINAH", month: 3, limit: 3 })
    expect(capped.rows).toHaveLength(3)
    expect(capped.total_matches).toBe(12)
    expect(capped.truncated).toBe(true)
    // Price-ascending order means the head survives truncation, so "the cheapest is X" stays true.
    expect(capped.rows.map((row) => row.id)).toEqual(["hotel-0", "hotel-1", "hotel-2"])

    const defaulted = cariHotel(many, { city: "MADINAH", month: 3 })
    expect(defaulted.rows).toHaveLength(CARI_HOTEL_DEFAULT_LIMIT)
    expect(defaulted.truncated).toBe(true)

    const whole = cariHotel(many, { city: "MADINAH", month: 3, limit: 25 })
    expect(whole.rows).toHaveLength(12)
    expect(whole.total_matches).toBe(12)
    expect(whole.truncated).toBe(false)
  })

  // D3: fallbackHotelOptions builds tier options with no realMonthlyPrices by construction, so a
  // tool that exists to ground choices in catalogue rates must report nothing rather than surface
  // one — the caller falls back to tier selection explicitly instead.
  it("returns total_matches 0 for a city served only by synthetic tier options", () => {
    const result = cariHotel(makePricing({ MADINAH: [walking] }), { city: "MAKKAH", month: 3 })

    expect(result.total_matches).toBe(0)
    expect(result.rows).toEqual([])
    expect(result.truncated).toBe(false)
  })

  it("returns total_matches 0 when a tier has no concrete hotels rather than a tier fallback", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, tier: "PELATARAN" })

    expect(result.total_matches).toBe(0)
    expect(result.rows).toEqual([])
  })

  it("returns total_matches 0 when nothing meets the budget", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 3, max_sar_per_night: 100 })

    expect(result.total_matches).toBe(0)
  })

  it("prices on the base estimate and omits month when no month is given", () => {
    const result = cariHotel(pricing, { city: "MADINAH", tier: "STANDARD" })

    expect(result.month).toBeUndefined()
    expect(result.rows.find((row) => row.id === "taiba-front")?.sar_per_night).toBe(950)
    expect(result.rows.every((row) => row.basis === "estimate")).toBe(true)
  })

  it("ignores an out-of-range month instead of pricing on a month that cannot exist", () => {
    const result = cariHotel(pricing, { city: "MADINAH", month: 13, tier: "STANDARD" })

    expect(result.month).toBeUndefined()
    expect(result.rows.find((row) => row.id === "taiba-front")?.sar_per_night).toBe(950)
  })
})
