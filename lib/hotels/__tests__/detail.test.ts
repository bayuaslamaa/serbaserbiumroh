import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

import { composeHotelDetail } from "../detail"

const hotel = {
  id: "hotel-1",
  city: "MAKKAH" as const,
  tier: "STANDARD" as const,
  importKey: "MAKKAH:STANDARD:safwa tower 3",
  slug: "safwa-tower-3",
  sarPerNight: 1300,
  label: "Safwa Tower 3",
  sublabel: "3★, dekat Haram",
  distance: "250m jalan kaki",
  agodaUrl: "https://www.agoda.com/safwa-tower-3",
  bookingcomUrl: null,
  tripcomUrl: null,
  bookingUrl: null,
  updatedAt: new Date("2026-07-01"),
}

const listing = {
  id: "listing-1",
  slug: "safwa-tower-3",
  name: "Safwa Tower 3",
  city: "MAKKAH" as const,
  tier: "STANDARD" as const,
  distanceMeters: 250,
  facilities: "Lift, restoran, laundry",
  pilgrimNotes: "Pintu keluar tercepat ke Haram lewat basement.",
  isPublished: true,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-07-01"),
}

const monthly = [{ id: "m-3", hotelPriceId: "hotel-1", month: 3, sarPerNight: 2600, updatedAt: new Date() }]

describe("composeHotelDetail", () => {
  it("carries the pricing row through as the backbone of the page", () => {
    const detail = composeHotelDetail(hotel, [], 4700, null)

    expect(detail).toMatchObject({
      slug: "safwa-tower-3",
      label: "Safwa Tower 3",
      city: "MAKKAH",
      tier: "STANDARD",
      distance: "250m jalan kaki",
      sarPerNight: 1300,
      exchangeRate: 4700,
    })
  })

  it("expands seasonal overrides into the twelve-month table", () => {
    const detail = composeHotelDetail(hotel, monthly, 4700, null)

    expect(detail.monthlyPrices).toHaveLength(12)
    expect(detail.monthlyPrices[2]).toMatchObject({ month: 3, sar: 2600, isOverride: true })
    expect(detail.monthlyPrices[0]).toMatchObject({ sar: 1300, isOverride: false })
  })

  it("renders without editorial content when no listing matches", () => {
    // This is the common case: hotel_listings has only ever been written
    // through the admin CMS and never read by a public page.
    expect(composeHotelDetail(hotel, [], 4700, null).editorial).toBeNull()
  })

  it("attaches editorial content from a published listing", () => {
    expect(composeHotelDetail(hotel, [], 4700, listing).editorial).toEqual({
      facilities: "Lift, restoran, laundry",
      pilgrimNotes: "Pintu keluar tercepat ke Haram lewat basement.",
    })
  })

  it("ignores an unpublished listing", () => {
    const draft = { ...listing, isPublished: false }

    expect(composeHotelDetail(hotel, [], 4700, draft).editorial).toBeNull()
  })

  it("ignores a published listing whose fields are blank or whitespace", () => {
    const blank = { ...listing, facilities: "   ", pilgrimNotes: "" }

    // An empty overlay would render a heading with nothing under it.
    expect(composeHotelDetail(hotel, [], 4700, blank).editorial).toBeNull()
  })

  it("accepts a listing with notes but no facilities", () => {
    const partial = { ...listing, facilities: "" }

    expect(composeHotelDetail(hotel, [], 4700, partial).editorial).toEqual({
      facilities: "",
      pilgrimNotes: "Pintu keluar tercepat ke Haram lewat basement.",
    })
  })

  it("keeps a hotel with no distance recorded", () => {
    const detail = composeHotelDetail({ ...hotel, distance: null }, [], 4700, null)

    expect(detail.distance).toBeNull()
    expect(detail.label).toBe("Safwa Tower 3")
  })
})
