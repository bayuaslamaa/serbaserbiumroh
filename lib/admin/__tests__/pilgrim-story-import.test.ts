import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import {
  PILGRIM_STORY_IMPORT_MAX_ROWS,
  PILGRIM_STORY_IMPORT_TEMPLATE,
  parsePilgrimStoryCsv,
} from "@/lib/admin/pilgrim-story-import"

const validCsv = [
  "slug,author_name,departure_city,travel_month,travel_year,pax,hotel_tier,airline_tier,makkah_nights,madinah_nights,total_budget_idr,narrative,is_published,is_featured",
  "inka-umroh,Inka,Jakarta,2,2026,2,STANDARD,STANDARD,8,4,54000000,Narasi,false,false",
].join("\n")

describe("parsePilgrimStoryCsv", () => {
  it("parses valid rows as create", () => {
    const result = parsePilgrimStoryCsv(validCsv)

    expect(result.summary.create).toBe(1)
    expect(result.rows[0].data).toEqual(
      expect.objectContaining({
        slug: "inka-umroh",
        authorName: "Inka",
        departureCity: "Jakarta",
        travelMonth: 2,
        travelYear: 2026,
        pax: 2,
        hotelTier: "STANDARD",
        airlineTier: "STANDARD",
        makkahNights: 8,
        madinahNights: 4,
        totalBudgetIdr: 54000000,
        narrative: "Narasi",
        isPublished: false,
        isFeatured: false,
      })
    )
  })

  it("classifies matching slugs as updates", () => {
    const result = parsePilgrimStoryCsv(validCsv, {
      existingStories: [{ id: "story-1", slug: "inka-umroh" }],
    })

    expect(result.summary.update).toBe(1)
    expect(result.rows[0].existingStoryId).toBe("story-1")
  })

  it("flags duplicate slugs in the uploaded CSV as conflicts", () => {
    const csv = [
      "slug,author_name,departure_city,pax,hotel_tier,total_budget_idr",
      "dupe,Inka,Jakarta,2,STANDARD,10000000",
      "dupe,Zahra,Surabaya,4,PELATARAN,20000000",
    ].join("\n")

    const result = parsePilgrimStoryCsv(csv)

    expect(result.summary.conflict).toBe(2)
    expect(result.rows[0].errors).toContain("duplicate row in uploaded CSV for the same slug")
  })

  it("validates required fields and enums", () => {
    const csv = [
      "slug,author_name,departure_city,travel_month,pax,hotel_tier,airline_tier,total_budget_idr",
      ",,Jakarta,13,0,VIP,PRIVATE,-1",
    ].join("\n")

    const result = parsePilgrimStoryCsv(csv)

    expect(result.summary.invalid).toBe(1)
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "slug is required",
        "author_name is required",
        "pax must be at least 1",
        "hotel_tier must be one of ECONOMY, STANDARD, PELATARAN, PREMIUM",
        "airline_tier must be blank or one of BUDGET, STANDARD, GARUDA, BUSINESS",
        "total_budget_idr must be at least 0",
        "travel_month must be at most 12",
      ])
    )
  })

  it("uses safe defaults for optional blank fields", () => {
    const csv = [
      "slug,author_name,departure_city,pax,hotel_tier,total_budget_idr",
      "blank-optionals,Admin,Jakarta,1,ECONOMY,0",
    ].join("\n")

    const result = parsePilgrimStoryCsv(csv)

    expect(result.rows[0].data).toEqual(
      expect.objectContaining({
        travelMonth: null,
        travelYear: null,
        airlineTier: null,
        makkahNights: 0,
        madinahNights: 0,
        narrative: "",
        isPublished: false,
        isFeatured: false,
      })
    )
  })

  it("marks otherwise valid rows invalid when required headers are missing", () => {
    const result = parsePilgrimStoryCsv("slug,author_name\nstory,Admin\n")

    expect(result.fileErrors).toContain("Missing required header: departure_city")
    expect(result.summary.invalid).toBe(1)
  })

  it("docs template matches the exported template", () => {
    const docsTemplate = readFileSync("docs/templates/pilgrim-story-import-template.csv", "utf8").trim()
    expect(docsTemplate).toBe(PILGRIM_STORY_IMPORT_TEMPLATE)
  })

  it("keeps the max row limit aligned with other admin imports", () => {
    expect(PILGRIM_STORY_IMPORT_MAX_ROWS).toBe(500)
  })
})
