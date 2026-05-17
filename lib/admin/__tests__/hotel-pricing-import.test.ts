import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  HOTEL_PRICING_IMPORT_TEMPLATE,
  parseHotelPricingCsv,
  normalizeHotelPricingImportKey,
} from "@/lib/admin/hotel-pricing-import"

describe("hotel pricing CSV import", () => {
  it("exports a template with base and monthly SAR columns", () => {
    expect(HOTEL_PRICING_IMPORT_TEMPLATE).toContain("city,tier,label,sublabel,distance,base_sar_per_night")
    expect(HOTEL_PRICING_IMPORT_TEMPLATE).toContain("jan_sar")
    expect(HOTEL_PRICING_IMPORT_TEMPLATE).toContain("dec_sar")

    const result = parseHotelPricingCsv(HOTEL_PRICING_IMPORT_TEMPLATE)

    expect(result.fileErrors).toEqual([])
    expect(result.summary.create).toBeGreaterThan(0)
  })

  it("keeps the docs template aligned with the canonical template", () => {
    const docsTemplate = readFileSync("docs/templates/hotel-pricing-import-template.csv", "utf8").trim()

    expect(docsTemplate).toBe(HOTEL_PRICING_IMPORT_TEMPLATE)
  })

  it("uses the base SAR price when monthly values are blank", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night,jan_sar,feb_sar\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300,,1500\n"
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.monthlyPrices[1]).toBe(1300)
    expect(result.rows[0].data?.monthlyPrices[2]).toBe(1500)
    expect(result.rows[0].data?.monthlyPrices[12]).toBe(1300)
  })

  it("validates required headers through the CSV parser normalization", () => {
    const result = parseHotelPricingCsv(
      '"city","tier","label","sublabel","base_sar_per_night"\n' +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300\n"
    )

    expect(result.fileErrors).toEqual([])
    expect(result.rows[0].status).toBe("create")
  })

  it("parses quoted spreadsheet values containing commas", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,distance,base_sar_per_night\n" +
        'MADINAH,PREMIUM,"Hotel Royal, Madinah","5 star, dekat Nabawi","250m, jalan kaki",3500\n'
    )

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.label).toBe("Hotel Royal, Madinah")
    expect(result.rows[0].data?.sublabel).toBe("5 star, dekat Nabawi")
    expect(result.rows[0].data?.distance).toBe("250m, jalan kaki")
  })

  it("keeps distance optional for older CSVs", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300\n"
    )

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.distance).toBeNull()
  })

  it("trims imported distance metadata", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,distance,base_sar_per_night\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram, 250m jalan kaki ,1300\n"
    )

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.distance).toBe("250m jalan kaki")
  })

  it("normalizes city, tier, and label for matching", () => {
    const key = normalizeHotelPricingImportKey({
      city: "MAKKAH",
      tier: "STANDARD",
      label: "  Safwa   Tower 3  ",
    })

    expect(key).toBe("MAKKAH:STANDARD:safwa tower 3")

    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night\n" +
        " makkah , standard ,  Safwa   Tower 3  ,Near Haram,1300\n"
    )

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.city).toBe("MAKKAH")
    expect(result.rows[0].data?.tier).toBe("STANDARD")
    expect(result.rows[0].data?.matchKey).toBe(key)
  })

  it("classifies rows matching existing hotel pricing as updates", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1400\n",
      {
        existingHotels: [
          {
            id: "hotel-1",
            city: "MAKKAH",
            tier: "STANDARD",
            label: "Safwa Tower 3",
          },
        ],
      }
    )

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingHotelId).toBe("hotel-1")
    expect(result.summary.update).toBe(1)
  })

  it("matches existing hotel pricing without a stored import key", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1400\n",
      {
        existingHotels: [
          {
            id: "hotel-1",
            city: "MAKKAH",
            tier: "STANDARD",
            label: "  Safwa   Tower 3  ",
            importKey: null,
          },
        ],
      }
    )

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingHotelId).toBe("hotel-1")
  })

  it("marks duplicate rows in the same CSV as conflicts", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Near Haram,1300\n" +
        "makkah,standard,  Safwa Tower 3  ,Near Haram,1400\n"
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((row) => row.status === "conflict")).toBe(true)
    expect(result.summary.conflict).toBe(2)
  })

  it("reports row-level validation errors", () => {
    const result = parseHotelPricingCsv(
      "city,tier,label,sublabel,base_sar_per_night,mar_sar\n" +
        "ISTANBUL,ULTRA,,Invalid,-1,abc\n"
    )

    expect(result.rows[0].status).toBe("invalid")
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "city must be MAKKAH or MADINAH",
        "tier must be ECONOMY, STANDARD, PELATARAN, or PREMIUM",
        "label is required",
        "base_sar_per_night must be a positive number",
        "mar_sar must be a positive number when provided",
      ])
    )
  })

  it("reports missing required headers", () => {
    const result = parseHotelPricingCsv("city,tier,label\nMAKKAH,STANDARD,Safwa Tower 3\n")

    expect(result.fileErrors).toContain("Missing required header: base_sar_per_night")
    expect(result.summary.invalid).toBe(1)
  })
})
