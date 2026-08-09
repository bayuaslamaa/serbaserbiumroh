import { describe, expect, it } from "vitest"

import {
  buildMonthlyPrices,
  formatCompactIdr,
  formatFullIdr,
  formatImportDate,
  formatSar,
  priceRange,
} from "../pricing"

describe("buildMonthlyPrices", () => {
  it("returns twelve months, numbered 1 to 12", () => {
    const prices = buildMonthlyPrices(1000, {}, 4700)

    expect(prices).toHaveLength(12)
    expect(prices.map((p) => p.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it("falls back to the base rate for months with no override", () => {
    const prices = buildMonthlyPrices(1000, {}, 4700)

    expect(prices.every((p) => p.sar === 1000)).toBe(true)
    expect(prices.every((p) => p.isOverride === false)).toBe(true)
  })

  it("applies a seasonal override and flags it", () => {
    const prices = buildMonthlyPrices(1000, { 3: 2500 }, 4700)

    expect(prices[2]).toEqual({ month: 3, sar: 2500, idr: 2500 * 4700, isOverride: true })
    expect(prices[1].isOverride).toBe(false)
  })

  it("converts to IDR with the given rate", () => {
    expect(buildMonthlyPrices(1000, {}, 5000)[0].idr).toBe(5_000_000)
  })

  it("treats a null override as absent rather than as a zero price", () => {
    const prices = buildMonthlyPrices(1000, { 5: null as unknown as undefined }, 4700)

    expect(prices[4].sar).toBe(1000)
    expect(prices[4].isOverride).toBe(false)
  })

  it("keeps an override of zero distinguishable from no override", () => {
    // A genuine 0 SAR override is nonsense data, but it must not silently
    // read as "no override" and quote the base rate instead.
    const prices = buildMonthlyPrices(1000, { 6: 0 }, 4700)

    expect(prices[5].isOverride).toBe(true)
    expect(prices[5].sar).toBe(0)
  })
})

describe("formatFullIdr", () => {
  it("formats as Indonesian rupiah with no decimals", () => {
    expect(formatFullIdr(4700000).replace(/ /g, " ")).toContain("4.700.000")
  })
})

describe("formatCompactIdr", () => {
  it("abbreviates millions", () => {
    expect(formatCompactIdr(4_700_000)).toBe("Rp 4.7jt")
  })

  it("drops the decimal on a whole number of millions", () => {
    expect(formatCompactIdr(5_000_000)).toBe("Rp 5jt")
  })

  it("abbreviates thousands", () => {
    expect(formatCompactIdr(470_000)).toBe("Rp 470rb")
  })

  it("leaves small amounts alone", () => {
    expect(formatCompactIdr(500)).toBe("Rp 500")
  })
})

describe("formatSar", () => {
  it("separates thousands the id-ID way", () => {
    expect(formatSar(1300)).toBe("SAR 1.300")
    expect(formatSar(12500)).toBe("SAR 12.500")
  })

  it("carries no per-night suffix", () => {
    // sarLabel bakes "/mlm" in, which is why a pricelist table cannot reuse it:
    // the column heading already says what the figure is per.
    expect(formatSar(1300)).not.toContain("/mlm")
  })

  it("leaves amounts below a thousand unseparated", () => {
    expect(formatSar(950)).toBe("SAR 950")
  })

  it("shows no decimals", () => {
    expect(formatSar(1300.6)).toBe("SAR 1.301")
  })
})

describe("priceRange", () => {
  it("reports the cheapest and most expensive month", () => {
    const prices = buildMonthlyPrices(1000, { 3: 2500, 8: 500 }, 1)

    expect(priceRange(prices)).toEqual({ min: 500, max: 2500 })
  })

  it("returns equal bounds when every month costs the same", () => {
    expect(priceRange(buildMonthlyPrices(1000, {}, 1))).toEqual({ min: 1000, max: 1000 })
  })

  it("returns null for an empty list rather than Infinity", () => {
    expect(priceRange([])).toBeNull()
  })
})

describe("formatImportDate", () => {
  // Shared by app/(dashboard)/pricelist-hotel/page.tsx and
  // components/pricelist-hotel/PricelistClient.tsx. It lives in this module
  // because this one carries no "use client" directive, so a server component
  // and a client one can each call it -- the duplicate that used to sit in both
  // files was never forced by the boundary.
  it("writes an Indonesian short-month calendar date", () => {
    expect(formatImportDate(new Date("2026-08-05T12:00:00Z"))).toBe("5 Agu 2026")
  })

  it("agrees on both sides of the server/client boundary for the same instant", () => {
    const instant = new Date("2026-01-31T12:00:00Z")

    expect(formatImportDate(instant)).toBe(formatImportDate(new Date(instant.getTime())))
    expect(formatImportDate(instant)).toBe("31 Jan 2026")
  })
})
