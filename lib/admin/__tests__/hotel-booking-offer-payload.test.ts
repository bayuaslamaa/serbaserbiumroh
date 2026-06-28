import { describe, expect, it } from "vitest"
import { parseHotelBookingOfferPayload } from "@/lib/admin/hotel-booking-offer-payload"

const validPayload = {
  city: "MAKKAH",
  tier: "STANDARD",
  hotelName: "Safwa Tower 3",
  periodStart: "2026-02-15",
  periodEnd: "2026-03-05",
  roomBasis: "per kamar per malam",
  currency: "SAR",
  priceAmount: 1450,
  status: "ACTIVE",
}

describe("hotel booking offer payload", () => {
  it("rejects oversized text instead of silently truncating it", () => {
    const result = parseHotelBookingOfferPayload(
      { ...validPayload, notes: "x".repeat(801) },
      { partial: false }
    )

    expect(result).toEqual({ error: "notes must be 800 characters or fewer" })
  })

  it("validates a partial date update against the stored period", () => {
    const result = parseHotelBookingOfferPayload(
      { periodStart: "2026-03-10" },
      {
        partial: true,
        current: {
          periodStart: new Date("2026-02-15T00:00:00.000Z"),
          periodEnd: new Date("2026-03-05T00:00:00.000Z"),
        },
      }
    )

    expect(result).toEqual({ error: "periodEnd must be on or after periodStart" })
  })

  it("rejects unsupported currencies", () => {
    const result = parseHotelBookingOfferPayload(
      { ...validPayload, currency: "EUR" },
      { partial: false }
    )

    expect(result).toEqual({ error: "currency must be SAR, USD, or IDR" })
  })

  it("rejects prices outside the database integer range", () => {
    const result = parseHotelBookingOfferPayload(
      { ...validPayload, priceAmount: 2147483648 },
      { partial: false }
    )

    expect(result).toEqual({ error: "priceAmount must be a positive number" })
  })
})
