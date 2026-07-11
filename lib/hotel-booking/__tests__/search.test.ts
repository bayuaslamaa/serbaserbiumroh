import { describe, expect, it } from "vitest"
import {
  buildHotelBookingQuote,
  calculateHotelBookingNights,
  hotelBookingOfferMatchesSearch,
  parseHotelBookingSearchParams,
} from "@/lib/hotel-booking/search"

const activeOffer = {
  id: "offer-1",
  status: "ACTIVE" as const,
  city: "MAKKAH" as const,
  hotelName: "Safwa Tower 3",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-10",
  roomType: "Double Standard Room",
  rateLabel: "Free cancellation",
  roomBasis: "per kamar per malam",
  currency: "SAR",
  priceAmount: 250,
  maxAdults: 2,
  maxGuests: 2,
  minNights: 1,
}

describe("hotel booking date search", () => {
  it("parses valid search params and calculates nights", () => {
    const result = parseHotelBookingSearchParams({
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      rooms: "2",
      adults: "4",
      city: "makkah",
      query: " safwa ",
    })

    expect(result).toEqual({
      ok: true,
      params: {
        checkIn: "2026-07-01",
        checkOut: "2026-07-05",
        rooms: 2,
        adults: 4,
        city: "MAKKAH",
        query: "safwa",
        nights: 4,
      },
      errors: [],
    })
    expect(calculateHotelBookingNights("2026-07-01", "2026-07-05")).toBe(4)
  })

  it("rejects same-day and reversed date ranges", () => {
    expect(parseHotelBookingSearchParams({ checkIn: "2026-07-01", checkOut: "2026-07-01" })).toEqual(
      expect.objectContaining({
        ok: false,
        errors: expect.arrayContaining(["checkOut must be after checkIn"]),
      })
    )
    expect(parseHotelBookingSearchParams({ checkIn: "2026-07-05", checkOut: "2026-07-01" })).toEqual(
      expect.objectContaining({
        ok: false,
        errors: expect.arrayContaining(["checkOut must be after checkIn"]),
      })
    )
  })

  it("matches active offers whose windows contain the selected stay", () => {
    const parsed = parseHotelBookingSearchParams({
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      rooms: "1",
      adults: "2",
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(hotelBookingOfferMatchesSearch(activeOffer, parsed.params)).toBe(true)
    expect(
      hotelBookingOfferMatchesSearch(
        { ...activeOffer, periodEnd: "2026-07-04" },
        parsed.params
      )
    ).toBe(false)
    expect(hotelBookingOfferMatchesSearch({ ...activeOffer, status: "INACTIVE" }, parsed.params)).toBe(false)
  })

  it("filters out rates that do not fit occupancy hints", () => {
    const parsed = parseHotelBookingSearchParams({
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      rooms: "1",
      adults: "3",
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(hotelBookingOfferMatchesSearch(activeOffer, parsed.params)).toBe(false)
  })

  it("builds total quote from per-night price, nights, and rooms", () => {
    const parsed = parseHotelBookingSearchParams({
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      rooms: "2",
      adults: "4",
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(buildHotelBookingQuote(activeOffer, parsed.params)).toEqual({
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      nights: 4,
      rooms: 2,
      adults: 4,
      currency: "SAR",
      pricePerNight: 250,
      totalAmount: 2000,
    })
  })
})
