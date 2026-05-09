import { describe, expect, it } from "vitest"
import { buildHotelNusukPriceMap } from "@/lib/hotel-nusuk/pricing"

describe("buildHotelNusukPriceMap", () => {
  it("uses the deterministic baseline row when multiple estimator hotel prices share city and tier", () => {
    const priceMap = buildHotelNusukPriceMap(
      [
        {
          id: "imported-hotel",
          city: "MAKKAH",
          tier: "STANDARD",
          sarPerNight: 2000,
          updatedAt: new Date("2026-05-08T12:00:00.000Z"),
        },
        {
          id: "seeded-baseline",
          city: "MAKKAH",
          tier: "STANDARD",
          sarPerNight: 1300,
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      4700
    )

    expect(priceMap.MAKKAH_STANDARD).toBe(1300 * 4700)
  })

  it("breaks equal updatedAt ties by stable id order", () => {
    const priceMap = buildHotelNusukPriceMap(
      [
        {
          id: "b-row",
          city: "MADINAH",
          tier: "PREMIUM",
          sarPerNight: 3000,
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          id: "a-row",
          city: "MADINAH",
          tier: "PREMIUM",
          sarPerNight: 2500,
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      4700
    )

    expect(priceMap.MADINAH_PREMIUM).toBe(2500 * 4700)
  })
})
