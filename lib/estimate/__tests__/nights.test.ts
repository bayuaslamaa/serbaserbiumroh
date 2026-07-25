import { describe, it, expect } from "vitest"
import { MIN_TRIP_DAYS, MAX_TRIP_DAYS, totalTripDaysToNights, totalTripDays } from "@/lib/estimate/nights"
import { DEFAULT_PARAMS } from "@/types"

describe("totalTripDaysToNights", () => {
  it("redistributes 12 days into 4 madinah + 8 makkah", () => {
    expect(totalTripDaysToNights(12)).toEqual({ nightsMadinah: 4, nightsMakkah: 8 })
  })

  it("caps madinah at 4 nights for a short 6-day trip", () => {
    expect(totalTripDaysToNights(6)).toEqual({ nightsMadinah: 4, nightsMakkah: 2 })
  })

  it("caps madinah at 4 nights for the max 30-day trip", () => {
    expect(totalTripDaysToNights(30)).toEqual({ nightsMadinah: 4, nightsMakkah: 26 })
  })
})

describe("totalTripDays", () => {
  it("sums nightsMadinah + nightsMakkah", () => {
    expect(totalTripDays({ ...DEFAULT_PARAMS, nightsMadinah: 4, nightsMakkah: 8 })).toBe(12)
  })
})

describe("MIN_TRIP_DAYS / MAX_TRIP_DAYS", () => {
  it("matches the 5-30 day range lib/ai/parse.ts validates against", () => {
    expect(MIN_TRIP_DAYS).toBe(5)
    expect(MAX_TRIP_DAYS).toBe(30)
  })
})
