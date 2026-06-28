import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  HOTEL_BOOKING_OFFER_IMPORT_TEMPLATE,
  buildHotelBookingOfferTemplateCsv,
  normalizeHotelBookingOfferImportKey,
  parseHotelBookingOfferCsv,
} from "@/lib/admin/hotel-booking-offer-import"

describe("hotel booking offer CSV import", () => {
  it("exports a parseable template", () => {
    expect(HOTEL_BOOKING_OFFER_IMPORT_TEMPLATE).toContain(
      "city,tier,hotel_name,hotel_listing_slug,offer_label"
    )

    const result = parseHotelBookingOfferCsv(HOTEL_BOOKING_OFFER_IMPORT_TEMPLATE, {
      hotelListings: [{ id: "hotel-1", slug: "safwa-tower-3" }],
    })

    expect(result.fileErrors).toEqual([])
    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.hotelListingId).toBe("hotel-1")
  })

  it("keeps the docs template aligned with the canonical template", () => {
    const docsTemplate = readFileSync("docs/templates/hotel-booking-offer-import-template.csv", "utf8").trim()

    expect(docsTemplate).toBe(HOTEL_BOOKING_OFFER_IMPORT_TEMPLATE)
  })

  it("keeps the OTA 2027 dummy fixture parseable and aligned to January pricing", () => {
    const sourceRows = readFileSync("docs/templates/hotel-pricing-import-ota-2027-researched.csv", "utf8")
      .trim()
      .split(/\r?\n/)
      .slice(1)
    const dummyCsv = readFileSync("docs/templates/hotel-booking-offer-import-ota-2027-dummy.csv", "utf8")
    const result = parseHotelBookingOfferCsv(dummyCsv)

    expect(result.fileErrors).toEqual([])
    expect(result.summary).toEqual({ create: sourceRows.length, update: 0, invalid: 0, conflict: 0 })
    expect(result.rows).toHaveLength(sourceRows.length)

    for (const [index, sourceRow] of sourceRows.entries()) {
      const [city, tier, hotelName, notes, , janSar] = sourceRow.split(",")
      expect(result.rows[index].data).toEqual(
        expect.objectContaining({
          city,
          tier,
          hotelName,
          periodStart: "2027-01-01",
          periodEnd: "2027-01-31",
          periodLabel: "Jan 2027",
          currency: "SAR",
          priceAmount: Number(janSar),
          status: "INACTIVE",
          notes,
        })
      )
    }
  })

  it("builds an editable CSV from Hotel Nusuk pricing data", () => {
    const csv = buildHotelBookingOfferTemplateCsv(
      [
        {
          city: "MAKKAH",
          tier: "STANDARD",
          label: "Safwa Tower 3",
          sublabel: "Dekat Haram, akses mudah",
          distance: "250m",
          sarPerNight: 1450,
        },
      ],
      [
        {
          city: "MAKKAH",
          tier: "STANDARD",
          name: "Safwa Tower 3",
          slug: "safwa-tower-3",
        },
      ]
    )

    expect(csv).toContain(
      'MAKKAH,STANDARD,Safwa Tower 3,safwa-tower-3,,,,,per kamar per malam,SAR,1450,INACTIVE,"Dekat Haram, akses mudah | 250m"'
    )

    const incomplete = parseHotelBookingOfferCsv(csv, {
      hotelListings: [{ id: "hotel-1", slug: "safwa-tower-3" }],
    })
    expect(incomplete.rows[0].status).toBe("invalid")
    expect(incomplete.rows[0].errors).toEqual(
      expect.arrayContaining([
        "period_start must use YYYY-MM-DD",
        "period_end must use YYYY-MM-DD",
      ])
    )

    const completedCsv = csv.replace(
      "safwa-tower-3,,,,,per kamar per malam",
      "safwa-tower-3,Ramadan awal,2026-02-15,2026-03-05,15 Feb - 5 Mar 2026,per kamar per malam"
    )
    const completed = parseHotelBookingOfferCsv(completedCsv, {
      hotelListings: [{ id: "hotel-1", slug: "safwa-tower-3" }],
    })
    expect(completed.summary).toEqual({ create: 1, update: 0, invalid: 0, conflict: 0 })
    expect(completed.rows[0].data).toEqual(
      expect.objectContaining({
        hotelName: "Safwa Tower 3",
        hotelListingId: "hotel-1",
        priceAmount: 1450,
        status: "INACTIVE",
      })
    )
  })

  it("escapes hotel names and notes that contain CSV control characters", () => {
    const csv = buildHotelBookingOfferTemplateCsv([
      {
        city: "MADINAH",
        tier: "PREMIUM",
        label: 'Hotel "Royal", Madinah',
        sublabel: "Dekat Nabawi\nPintu 25",
        sarPerNight: 2200,
      },
    ])

    expect(csv).toContain('"Hotel ""Royal"", Madinah"')
    expect(csv).toContain('"Dekat Nabawi\nPintu 25"')
  })

  it("keeps generated notes within the import validation limit", () => {
    const csv = buildHotelBookingOfferTemplateCsv([
      {
        city: "MADINAH",
        tier: "STANDARD",
        label: "Hotel Panjang",
        sublabel: "x".repeat(900),
        sarPerNight: 500,
      },
    ])

    const completedCsv = csv.replace(
      ",,,,,per kamar per malam",
      ",Ramadan,2026-02-15,2026-03-05,Ramadan,per kamar per malam"
    )
    const result = parseHotelBookingOfferCsv(completedCsv)

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.notes).toHaveLength(800)
  })

  it("normalizes the match key across hotel, period, room basis, and label", () => {
    const key = normalizeHotelBookingOfferImportKey({
      city: "MAKKAH",
      tier: "STANDARD",
      hotelName: "  Safwa   Tower 3 ",
      periodStart: "2026-02-15",
      periodEnd: "2026-03-05",
      roomBasis: " Per Kamar Per Malam ",
      offerLabel: " Ramadan Awal ",
    })

    expect(key).toBe(
      "MAKKAH:STANDARD:safwa tower 3:2026-02-15:2026-03-05:per kamar per malam:ramadan awal"
    )
  })

  it("classifies matching existing offers as updates", () => {
    const importKey = normalizeHotelBookingOfferImportKey({
      city: "MAKKAH",
      tier: "STANDARD",
      hotelName: "Safwa Tower 3",
      periodStart: "2026-02-15",
      periodEnd: "2026-03-05",
      roomBasis: "per kamar per malam",
      offerLabel: "Ramadan awal",
    })

    const result = parseHotelBookingOfferCsv(
      "city,tier,hotel_name,offer_label,period_start,period_end,room_basis,price_amount\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Ramadan awal,2026-02-15,2026-03-05,per kamar per malam,1450\n",
      { existingOffers: [{ id: "offer-1", importKey }] }
    )

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingOfferId).toBe("offer-1")
    expect(result.summary.update).toBe(1)
  })

  it("marks duplicate rows in one upload as conflicts", () => {
    const result = parseHotelBookingOfferCsv(
      "city,tier,hotel_name,offer_label,period_start,period_end,room_basis,price_amount\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Ramadan awal,2026-02-15,2026-03-05,per kamar per malam,1450\n" +
        "makkah,standard, Safwa   Tower 3 ,Ramadan awal,2026-02-15,2026-03-05,per kamar per malam,1500\n"
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((row) => row.status === "conflict")).toBe(true)
    expect(result.summary.conflict).toBe(2)
  })

  it("rejects unknown hotel listing slugs and invalid period ranges", () => {
    const result = parseHotelBookingOfferCsv(
      "city,tier,hotel_name,hotel_listing_slug,period_start,period_end,room_basis,price_amount,status\n" +
        "MADINAH,PREMIUM,Unknown Hotel,unknown-slug,2026-03-10,2026-03-01,per kamar per malam,0,SOLD\n"
    )

    expect(result.rows[0].status).toBe("invalid")
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "hotel_listing_slug does not match an existing hotel",
        "period_end must be on or after period_start",
        "price_amount must be a positive number",
        "status must be ACTIVE, UNAVAILABLE, or INACTIVE",
      ])
    )
  })

  it("rejects unsupported currencies and prices outside the database integer range", () => {
    const result = parseHotelBookingOfferCsv(
      "city,tier,hotel_name,period_start,period_end,room_basis,currency,price_amount\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,2026-02-15,2026-03-05,per kamar per malam,EUR,2147483648\n"
    )

    expect(result.rows[0].status).toBe("invalid")
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "currency must be SAR, USD, or IDR",
        "price_amount must be a positive number",
      ])
    )
  })
})
