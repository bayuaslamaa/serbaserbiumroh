import { describe, it, expect } from "vitest"
import { resolveHotelSar, resolveMonthlyHotelSar } from "@/lib/estimate/hotel-pricing"

// One hotel priced four ways, so each ladder step can be isolated:
//   month 7 — the catalog quoted every room type
//   month 8 — the catalog quoted a quad rate only
//   month 9 — no real price, but an estimate override exists
//   month 5 — nothing but the base estimate
const hotel = {
  sarPerNight: 650,
  monthlyPrices: { 9: 800 },
  realMonthlyPrices: {
    7: { QUAD: 700, TRIPLE: 625, DOUBLE: 550 },
    8: { QUAD: 700 },
  },
}

describe("resolveHotelSar", () => {
  it("returns the catalog rate for the requested room type and marks it room-type priced", () => {
    expect(resolveHotelSar(hotel, "DOUBLE", 7)).toEqual({
      sarPerNight: 550,
      source: "real",
      roomTypePriced: true,
    })
  })

  it("falls back to the quad real rate without claiming it is room-type priced", () => {
    // The distinction is load-bearing: the caller applies the global ratio only when this is false.
    expect(resolveHotelSar(hotel, "DOUBLE", 8)).toEqual({
      sarPerNight: 700,
      source: "real",
      roomTypePriced: false,
    })
  })

  it("never treats QUINT as room-type priced — no catalog prints a five-bed rate", () => {
    expect(resolveHotelSar(hotel, "QUINT", 7)).toEqual({
      sarPerNight: 700,
      source: "real",
      roomTypePriced: false,
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
    })
  })

  it("falls to the base estimate when the month has neither", () => {
    expect(resolveHotelSar(hotel, "DOUBLE", 5)).toEqual({
      sarPerNight: 650,
      source: "estimate",
      roomTypePriced: false,
    })
  })

  it("ignores real prices entirely when no month is given — they are seasonal", () => {
    expect(resolveHotelSar(hotel, "DOUBLE")).toEqual({
      sarPerNight: 650,
      source: "estimate",
      roomTypePriced: false,
    })
  })

  it("resolves a hotel carrying no real prices at all without error", () => {
    // Tier-fallback options built by hotel-selection carry no realMonthlyPrices map.
    expect(resolveHotelSar({ sarPerNight: 450, monthlyPrices: {} }, "TRIPLE", 7)).toEqual({
      sarPerNight: 450,
      source: "estimate",
      roomTypePriced: false,
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
