import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { parse } from "csv-parse/sync"
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
    const sourceRows = parse(readFileSync("docs/templates/hotel-pricing-import-ota-2027-researched.csv", "utf8"), {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>
    const dummyCsv = readFileSync("docs/templates/hotel-booking-offer-import-ota-2027-dummy.csv", "utf8")
    const result = parseHotelBookingOfferCsv(dummyCsv)

    expect(result.fileErrors).toEqual([])
    expect(result.summary).toEqual({ create: sourceRows.length, update: 0, invalid: 0, conflict: 0 })
    expect(result.rows).toHaveLength(sourceRows.length)

    for (const [index, sourceRow] of sourceRows.entries()) {
      expect(result.rows[index].data).toEqual(
        expect.objectContaining({
          city: sourceRow.city,
          tier: sourceRow.tier,
          hotelName: sourceRow.label,
          periodStart: "2027-01-01",
          periodEnd: "2027-01-31",
          periodLabel: "Jan 2027",
          currency: "SAR",
          priceAmount: Number(sourceRow.jan_sar),
          roomType: "Standard Room",
          rateLabel: "Manual availability check",
          maxAdults: 2,
          maxGuests: 2,
          minNights: 1,
          status: "INACTIVE",
          notes: sourceRow.sublabel,
        })
      )
    }
  })

  it("keeps the Gemini 2027 dummy fixture parseable as monthly multi-period offers", () => {
    const sourceRows = parse(readFileSync("gemini-code-1778326367070 - gemini-code-1778326367070.csv", "utf8"), {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>
    const dummyCsv = readFileSync("docs/templates/hotel-booking-offer-import-gemini-2027-dummy.csv", "utf8")
    const dummyRecords = parse(dummyCsv, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>
    const result = parseHotelBookingOfferCsv(dummyCsv)
    const expectedHotels = [
      "Emaar Royal Hotel Al Madina",
      "Emaar Elite Al Madina Hotel",
      "Pullman Zam Zam",
      "Madinah Hilton",
      "Makkah Hotel Tower",
      "Le Meridien Makkah",
      "Ibis",
      "Le Meridien Towers",
    ]
    const expectedPeriods = [
      { priceKey: "jul_sar", start: "2026-07-01", end: "2026-07-31", label: "Jul 2026" },
      { priceKey: "aug_sar", start: "2026-08-01", end: "2026-08-31", label: "Aug 2026" },
      { priceKey: "sep_sar", start: "2026-09-01", end: "2026-09-30", label: "Sep 2026" },
      { priceKey: "oct_sar", start: "2026-10-01", end: "2026-10-31", label: "Oct 2026" },
      { priceKey: "nov_sar", start: "2026-11-01", end: "2026-11-30", label: "Nov 2026" },
      { priceKey: "dec_sar", start: "2026-12-01", end: "2026-12-31", label: "Dec 2026" },
      { priceKey: "jan_sar", start: "2027-01-01", end: "2027-01-31", label: "Jan 2027" },
      { priceKey: "feb_sar", start: "2027-02-01", end: "2027-02-28", label: "Feb 2027" },
    ]
    const sourceByHotel = new Map(sourceRows.map((sourceRow) => [sourceRow.label, sourceRow]))

    expect(result.fileErrors).toEqual([])
    expect(result.summary).toEqual({ create: expectedHotels.length * expectedPeriods.length, update: 0, invalid: 0, conflict: 0 })
    expect(result.rows).toHaveLength(expectedHotels.length * expectedPeriods.length)
    expect(dummyRecords).toHaveLength(expectedHotels.length * expectedPeriods.length)
    expect(new Set(dummyRecords.map((record) => record.hotel_name))).toEqual(new Set(expectedHotels))
    expect(new Set(dummyRecords.map((record) => record.period_label))).toEqual(
      new Set(expectedPeriods.map((period) => period.label))
    )

    for (const hotelName of expectedHotels) {
      const sourceRow = sourceByHotel.get(hotelName)
      if (!sourceRow) throw new Error(`Missing source row for ${hotelName}`)

      const hotelRows = result.rows.filter((row) => row.data?.hotelName === hotelName)
      expect(hotelRows).toHaveLength(expectedPeriods.length)

      for (const [periodIndex, period] of expectedPeriods.entries()) {
        expect(hotelRows[periodIndex].data).toEqual(
          expect.objectContaining({
            city: sourceRow.city,
            tier: sourceRow.tier,
            hotelName,
            periodStart: period.start,
            periodEnd: period.end,
            periodLabel: period.label,
            currency: "SAR",
            priceAmount: Number(sourceRow[period.priceKey] || sourceRow.base_sar_per_night),
            roomType: "Standard Room",
            rateLabel: "Manual availability check",
            maxAdults: 2,
            maxGuests: 2,
            minNights: 1,
            status: "INACTIVE",
          })
        )
        expect(hotelRows[periodIndex].data?.notes).toContain("Source:")
      }
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
      'MAKKAH,STANDARD,Safwa Tower 3,safwa-tower-3,,Standard Room,,,,,per kamar per malam,SAR,1450,,,1,,Ketersediaan akhir dan payment dilanjutkan manual via WhatsApp,0,,INACTIVE,"Dekat Haram, akses mudah | 250m"'
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
      "safwa-tower-3,,Standard Room,,,,,per kamar per malam",
      "safwa-tower-3,Ramadan awal,Double Standard Room,Free cancellation,2026-02-15,2026-03-05,15 Feb - 5 Mar 2026,per kamar per malam"
    )
    const completed = parseHotelBookingOfferCsv(completedCsv, {
      hotelListings: [{ id: "hotel-1", slug: "safwa-tower-3" }],
    })
    expect(completed.summary).toEqual({ create: 1, update: 0, invalid: 0, conflict: 0 })
    expect(completed.rows[0].data).toEqual(
      expect.objectContaining({
        hotelName: "Safwa Tower 3",
        hotelListingId: "hotel-1",
        roomType: "Double Standard Room",
        rateLabel: "Free cancellation",
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
      ",,Standard Room,,,,,per kamar per malam",
      ",Ramadan,Standard Room,,2026-02-15,2026-03-05,Ramadan,per kamar per malam"
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
      "MAKKAH:STANDARD:safwa tower 3:2026-02-15:2026-03-05:per kamar per malam:ramadan awal:standard room:"
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

  it("matches legacy import keys from CSVs created before room type and rate label columns existed", () => {
    const legacyImportKey =
      "MAKKAH:STANDARD:safwa tower 3:2026-02-15:2026-03-05:per kamar per malam:ramadan awal"

    const result = parseHotelBookingOfferCsv(
      "city,tier,hotel_name,offer_label,period_start,period_end,room_basis,price_amount\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Ramadan awal,2026-02-15,2026-03-05,per kamar per malam,1450\n",
      { existingOffers: [{ id: "offer-legacy", importKey: legacyImportKey }] }
    )

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingOfferId).toBe("offer-legacy")
    expect(result.rows[0].data?.matchKey).toBe(
      "MAKKAH:STANDARD:safwa tower 3:2026-02-15:2026-03-05:per kamar per malam:ramadan awal:standard room:"
    )
  })

  it("updates a legacy offer once and creates additional room rates", () => {
    const legacyImportKey =
      "MAKKAH:STANDARD:safwa tower 3:2026-02-15:2026-03-05:per kamar per malam:ramadan awal"

    const result = parseHotelBookingOfferCsv(
      "city,tier,hotel_name,offer_label,room_type,rate_label,period_start,period_end,room_basis,price_amount\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Ramadan awal,Standard Room,Non-refundable,2026-02-15,2026-03-05,per kamar per malam,1450\n" +
        "MAKKAH,STANDARD,Safwa Tower 3,Ramadan awal,Deluxe Room,Free cancellation,2026-02-15,2026-03-05,per kamar per malam,1750\n",
      { existingOffers: [{ id: "offer-legacy", importKey: legacyImportKey }] }
    )

    expect(result.rows.map((row) => row.status)).toEqual(["update", "create"])
    expect(result.rows[0].existingOfferId).toBe("offer-legacy")
    expect(result.rows[1].existingOfferId).toBeUndefined()
    expect(result.summary).toEqual({ create: 1, update: 1, invalid: 0, conflict: 0 })
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
