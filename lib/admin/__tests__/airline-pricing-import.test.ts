import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  AIRLINE_PRICING_IMPORT_TEMPLATE,
  parseAirlinePricingCsv,
  normalizeAirlinePricingImportKey,
} from "@/lib/admin/airline-pricing-import"

describe("airline pricing CSV import", () => {
  it("exports a template with base and monthly IDR columns", () => {
    expect(AIRLINE_PRICING_IMPORT_TEMPLATE).toContain("tier,label,sublabel,base_idr_per_person,is_default")
    expect(AIRLINE_PRICING_IMPORT_TEMPLATE).toContain("jan_idr")
    expect(AIRLINE_PRICING_IMPORT_TEMPLATE).toContain("dec_idr")

    const result = parseAirlinePricingCsv(AIRLINE_PRICING_IMPORT_TEMPLATE)

    expect(result.fileErrors).toEqual([])
    expect(result.summary.create).toBeGreaterThan(0)
  })

  it("keeps the docs template aligned with the canonical template", () => {
    const docsTemplate = readFileSync("docs/templates/airline-pricing-import-template.csv", "utf8").trim()

    expect(docsTemplate).toBe(AIRLINE_PRICING_IMPORT_TEMPLATE)
  })

  it("uses the base IDR price when monthly values are blank", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person,is_default,jan_idr,feb_idr\n" +
        "STANDARD,Batik Air,Standard option,14500000,true,,18500000\n"
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.monthlyPrices[1]).toBe(14_500_000)
    expect(result.rows[0].data?.monthlyPrices[2]).toBe(18_500_000)
    expect(result.rows[0].data?.monthlyPrices[12]).toBe(14_500_000)
  })

  it("parses quoted spreadsheet values containing commas", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person\n" +
        'BUDGET,"Lion Air, AirAsia","Transit, budget",12500000\n'
    )

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.label).toBe("Lion Air, AirAsia")
    expect(result.rows[0].data?.sublabel).toBe("Transit, budget")
  })

  it("normalizes tier and label for matching", () => {
    const key = normalizeAirlinePricingImportKey({
      tier: "STANDARD",
      label: "  Batik   Air  ",
    })

    expect(key).toBe("STANDARD:batik air")

    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person\n" +
        " standard ,  Batik   Air  ,Standard,14500000\n"
    )

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.tier).toBe("STANDARD")
    expect(result.rows[0].data?.matchKey).toBe(key)
  })

  it("classifies rows matching existing airline pricing as updates", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person\n" +
        "STANDARD,Batik Air,Standard,15000000\n",
      {
        existingAirlines: [
          {
            id: "airline-1",
            tier: "STANDARD",
            label: "Batik Air",
          },
        ],
      }
    )

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingAirlineId).toBe("airline-1")
    expect(result.summary.update).toBe(1)
  })

  it("matches existing airline pricing without a stored import key", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person\n" +
        "STANDARD,Batik Air,Standard,15000000\n",
      {
        existingAirlines: [
          {
            id: "airline-1",
            tier: "STANDARD",
            label: "  Batik   Air  ",
            importKey: null,
          },
        ],
      }
    )

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingAirlineId).toBe("airline-1")
  })

  it("marks duplicate rows in the same CSV as conflicts", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person\n" +
        "STANDARD,Batik Air,Standard,14500000\n" +
        "standard,  Batik Air  ,Standard,15000000\n"
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((row) => row.status === "conflict")).toBe(true)
    expect(result.summary.conflict).toBe(2)
  })

  it("marks multiple defaults in the same tier as conflicts", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person,is_default\n" +
        "STANDARD,Batik Air,Standard,14500000,true\n" +
        "STANDARD,Saudia,Standard,15500000,true\n"
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((row) => row.status === "conflict")).toBe(true)
    expect(result.rows[0].errors).toContain("only one default airline option is allowed per tier in one CSV")
  })

  it("reports row-level validation errors", () => {
    const result = parseAirlinePricingCsv(
      "tier,label,sublabel,base_idr_per_person,is_default,mar_idr\n" +
        "EMIRATES,,Invalid,-1,maybe,abc\n"
    )

    expect(result.rows[0].status).toBe("invalid")
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "tier must be BUDGET, STANDARD, GARUDA, or BUSINESS",
        "label is required",
        "base_idr_per_person must be a positive number",
        "is_default must be true or false when provided",
        "mar_idr must be a positive number when provided",
      ])
    )
  })

  it("reports missing required headers", () => {
    const result = parseAirlinePricingCsv("tier,label\nSTANDARD,Batik Air\n")

    expect(result.fileErrors).toContain("Missing required header: base_idr_per_person")
    expect(result.summary.invalid).toBe(1)
  })
})
