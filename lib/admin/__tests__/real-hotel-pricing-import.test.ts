import { describe, it, expect } from "vitest"
import { normalizeHotelPricingImportKey } from "@/lib/admin/hotel-pricing-import"
import { parseRealHotelPricingCsv } from "@/lib/admin/real-hotel-pricing-import"

const existingHotels = [
  {
    id: "h-makkah",
    city: "MAKKAH" as const,
    tier: "STANDARD" as const,
    label: "Safwa Tower 3",
    importKey: normalizeHotelPricingImportKey({ city: "MAKKAH", tier: "STANDARD", label: "Safwa Tower 3" }),
  },
]

function plan(csv: string, sourceLabel = "Katalog Test") {
  return parseRealHotelPricingCsv(csv, existingHotels, sourceLabel)
}

describe("parseRealHotelPricingCsv", () => {
  it("upserts each filled month for a matched existing hotel, tagged with the source", () => {
    const p = plan(
      ["city,tier,label,base_sar_per_night,feb_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,1300,2500,1400"].join("\n"),
      "Katalog Emaar 2027",
    )
    expect(p.hotelsMatched).toBe(1)
    expect(p.unmatched).toEqual([])
    expect(p.rowErrors).toEqual([])
    expect(p.upserts).toEqual([
      { hotelPriceId: "h-makkah", month: 2, sarPerNight: 2500, sourceLabel: "Katalog Emaar 2027" },
      { hotelPriceId: "h-makkah", month: 8, sarPerNight: 1400, sourceLabel: "Katalog Emaar 2027" },
    ])
  })

  it("only emits explicitly-filled months — a blank month cell (and the base column) is skipped", () => {
    const p = plan(["city,tier,label,base_sar_per_night,feb_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,1300,2500,"].join("\n"))
    expect(p.upserts.map((u) => u.month)).toEqual([2])
    expect(p.rowErrors).toEqual([])
  })

  it("reports a row whose hotel is not in the catalog as unmatched, writing nothing", () => {
    const p = plan(["city,tier,label,base_sar_per_night,feb_sar", "MAKKAH,STANDARD,Hotel Tak Terdaftar,1300,2500"].join("\n"))
    expect(p.upserts).toEqual([])
    expect(p.hotelsMatched).toBe(0)
    expect(p.unmatched).toEqual([{ rowNumber: 2, label: "Hotel Tak Terdaftar" }])
  })

  it("produces exactly one upsert per (hotel, month) — no duplicates within a plan", () => {
    const p = plan(["city,tier,label,base_sar_per_night,feb_sar,mar_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,1300,2500,2600,1400"].join("\n"))
    const keys = p.upserts.map((u) => `${u.hotelPriceId}:${u.month}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(["h-makkah:2", "h-makkah:3", "h-makkah:8"])
  })

  it("flags a matched row with no filled month cells as a row error (nothing to import)", () => {
    const p = plan(["city,tier,label,base_sar_per_night", "MAKKAH,STANDARD,Safwa Tower 3,1300"].join("\n"))
    expect(p.upserts).toEqual([])
    expect(p.rowErrors).toEqual([{ rowNumber: 2, errors: ["no real month prices provided"] }])
  })

  it("reports an invalid month cell as a row error while keeping the row's valid months", () => {
    const p = plan(["city,tier,label,feb_sar,mar_sar", "MAKKAH,STANDARD,Safwa Tower 3,abc,2600"].join("\n"))
    expect(p.upserts).toEqual([{ hotelPriceId: "h-makkah", month: 3, sarPerNight: 2600, sourceLabel: "Katalog Test" }])
    expect(p.rowErrors).toEqual([{ rowNumber: 2, errors: ['invalid feb_sar "abc"'] }])
  })

  it("plans only real-price writes (never estimate rows) — every upsert carries a sourceLabel", () => {
    const p = plan(["city,tier,label,feb_sar", "MAKKAH,STANDARD,Safwa Tower 3,2500"].join("\n"), "Katalog X")
    expect(p.upserts.every((u) => u.sourceLabel === "Katalog X")).toBe(true)
  })

  it("reports a missing required header as a file error, importing nothing", () => {
    const p = plan(["tier,label,feb_sar", "STANDARD,Safwa Tower 3,2500"].join("\n"))
    expect(p.fileErrors).toEqual(["Missing required header: city"])
    expect(p.upserts).toEqual([])
  })
})
