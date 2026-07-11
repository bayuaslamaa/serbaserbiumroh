import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HotelBookingSearchResults, type HotelBookingRateResult } from "../HotelBookingSearchResults"

const params = {
  checkIn: "2026-07-01",
  checkOut: "2026-07-05",
  rooms: 2,
  adults: 4,
  city: "ALL" as const,
  query: "",
  nights: 4,
}

const result: HotelBookingRateResult = {
  id: "offer-1",
  hotelKey: "hotel-1",
  hotelName: "Safwa Tower 3",
  city: "MAKKAH",
  tier: "STANDARD",
  roomType: "Double Standard Room",
  rateLabel: "Free cancellation",
  offerLabel: "Ramadan awal",
  periodLabel: "Jul 2026",
  roomBasis: "per kamar per malam",
  currency: "SAR",
  priceAmount: 250,
  inclusions: "Free WiFi",
  cancellationPolicy: "Free cancellation",
  notes: "Dekat Haram",
  terms: "Ketersediaan dicek manual",
  quote: {
    checkIn: "2026-07-01",
    checkOut: "2026-07-05",
    nights: 4,
    rooms: 2,
    adults: 4,
    currency: "SAR",
    pricePerNight: 250,
    totalAmount: 2000,
  },
  whatsappHref: "https://wa.me/123?text=booking",
}

describe("HotelBookingSearchResults", () => {
  it("renders grouped rate results with quote and manual request action", () => {
    render(<HotelBookingSearchResults params={params} results={[result]} hasActiveOffers />)

    expect(screen.getByRole("heading", { name: "Safwa Tower 3" })).toBeInTheDocument()
    expect(screen.getByText("Double Standard Room")).toBeInTheDocument()
    expect(screen.getAllByText("Free cancellation").length).toBeGreaterThan(0)
    expect(screen.getByText("SAR 2.000")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Ajukan Booking/ })).toHaveAttribute(
      "href",
      "https://wa.me/123?text=booking"
    )
    expect(screen.getByText(/Availability, payment, dan konfirmasi tetap manual/)).toBeInTheDocument()
  })

  it("renders no-date guidance before search", () => {
    render(<HotelBookingSearchResults results={[]} hasActiveOffers />)

    expect(screen.getByText(/Pilih tanggal check-in dan check-out/)).toBeInTheDocument()
  })

  it("renders no-result state for selected dates", () => {
    render(<HotelBookingSearchResults params={params} results={[]} hasActiveOffers />)

    expect(screen.getByText(/Belum ada rate hotel yang cocok/)).toBeInTheDocument()
  })
})
