import { describe, it, expect } from "vitest"
import { resolveHotelSar, resolveMonthlyHotelSar } from "@/lib/estimate/hotel-pricing"

// One catalogue rate as the real-price layer publishes it: the SAR/night plus the catalogue it was
// transcribed from. The two months carry different labels so a fallback can be told apart from an
// exact hit by its provenance alone.
const rate = (sarPerNight: number, sourceLabel = "Katalog AZKA 2027") => ({ sarPerNight, sourceLabel })

// One hotel priced four ways, so each ladder step can be isolated:
//   month 7 — the catalog quoted every room type
//   month 8 — the catalog quoted a quad rate only
//   month 9 — no real price, but an estimate override exists
//   month 5 — nothing but the base estimate
const hotel = {
  sarPerNight: 650,
  monthlyPrices: { 9: 800 },
  realMonthlyPrices: {
    7: { QUAD: rate(700), TRIPLE: rate(625), DOUBLE: rate(550) },
    8: { QUAD: rate(700, "Katalog Emaar 2027") },
  },
}

describe("resolveHotelSar", () => {
  it("returns the catalog rate for the requested room type and marks it room-type priced", () => {
    expect(resolveHotelSar(hotel, "DOUBLE", 7)).toEqual({
      sarPerNight: 550,
      source: "real",
      roomTypePriced: true,
      sourceLabel: "Katalog AZKA 2027",
    })
  })

  it("falls back to the quad real rate without claiming it is room-type priced", () => {
    // The distinction is load-bearing: the caller applies the global ratio only when this is false.
    expect(resolveHotelSar(hotel, "DOUBLE", 8)).toEqual({
      sarPerNight: 700,
      source: "real",
      roomTypePriced: false,
      sourceLabel: "Katalog Emaar 2027",
    })
  })

  it("never treats QUINT as room-type priced — no catalog prints a five-bed rate", () => {
    expect(resolveHotelSar(hotel, "QUINT", 7)).toEqual({
      sarPerNight: 700,
      source: "real",
      roomTypePriced: false,
      sourceLabel: "Katalog AZKA 2027",
    })
  })

  it("treats a quad request against a quad catalog rate as room-type priced", () => {
    expect(resolveHotelSar(hotel, "QUAD", 8).roomTypePriced).toBe(true)
  })

  it("falls to the monthly estimate override when the month has no real price", () => {
    expect(resolveHotelSar(hotel, "DOUBLE", 9)).toEqual({
      sarPerNight: 800,
      source: "estimate",
      roomTypePriced: false,
      sourceLabel: "",
    })
  })

  it("falls to the base estimate when the month has neither", () => {
    expect(resolveHotelSar(hotel, "DOUBLE", 5)).toEqual({
      sarPerNight: 650,
      source: "estimate",
      roomTypePriced: false,
      sourceLabel: "",
    })
  })

  it("ignores real prices entirely when no month is given — they are seasonal", () => {
    expect(resolveHotelSar(hotel, "DOUBLE")).toEqual({
      sarPerNight: 650,
      source: "estimate",
      roomTypePriced: false,
      sourceLabel: "",
    })
  })

  it("resolves a hotel carrying no real prices at all without error", () => {
    // Tier-fallback options built by hotel-selection carry no realMonthlyPrices map.
    expect(resolveHotelSar({ sarPerNight: 450, monthlyPrices: {} }, "TRIPLE", 7)).toEqual({
      sarPerNight: 450,
      source: "estimate",
      roomTypePriced: false,
      sourceLabel: "",
    })
  })

  describe("source label provenance", () => {
    it("names the catalogue behind an exact room-type hit", () => {
      expect(resolveHotelSar(hotel, "TRIPLE", 7).sourceLabel).toBe("Katalog AZKA 2027")
    })

    it("names the catalogue of the quad rate it fell back to, not the one asked for", () => {
      // A TRIPLE quoted off August's quad rate is attributable to August's catalogue — the label
      // has to come from the row that actually supplied the number.
      const r = resolveHotelSar(hotel, "TRIPLE", 8)
      expect(r).toMatchObject({ sarPerNight: 700, source: "real", roomTypePriced: false })
      expect(r.sourceLabel).toBe("Katalog Emaar 2027")
    })

    it("invents no catalogue for an estimate-only rate", () => {
      // Both estimate steps, and the no-month case: an estimate has no catalogue to cite, and it
      // must not inherit the label of a real rate the hotel happens to hold for another month.
      expect(resolveHotelSar(hotel, "DOUBLE", 9).sourceLabel).toBe("")
      expect(resolveHotelSar(hotel, "DOUBLE", 5).sourceLabel).toBe("")
      expect(resolveHotelSar(hotel, "DOUBLE").sourceLabel).toBe("")
    })

    it("reports an empty label for a catalogue row transcribed before source_label existed", () => {
      const legacy = { sarPerNight: 650, monthlyPrices: {}, realMonthlyPrices: { 7: { QUAD: rate(900, "") } } }
      expect(resolveHotelSar(legacy, "QUAD", 7)).toEqual({
        sarPerNight: 900,
        source: "real",
        roomTypePriced: true,
        sourceLabel: "",
      })
    })
  })
})

describe("resolveMonthlyHotelSar", () => {
  it("shows the rate the selected room type will be charged", () => {
    expect(resolveMonthlyHotelSar(hotel, 7, "DOUBLE")).toBe(550)
    expect(resolveMonthlyHotelSar(hotel, 7, "TRIPLE")).toBe(625)
    expect(resolveMonthlyHotelSar(hotel, 7, "QUAD")).toBe(700)
  })

  it("defaults to the quad basis when no room type is supplied", () => {
    expect(resolveMonthlyHotelSar(hotel, 7)).toBe(700)
  })

  it("agrees with what the calculation resolves, so the badge matches the breakdown", () => {
    for (const month of [5, 7, 8, 9, undefined]) {
      for (const roomType of ["QUINT", "QUAD", "TRIPLE", "DOUBLE"] as const) {
        expect(resolveMonthlyHotelSar(hotel, month, roomType)).toBe(
          resolveHotelSar(hotel, roomType, month).sarPerNight,
        )
      }
    }
  })
})
