import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((field) => field),
  eq: vi.fn((field, value) => ({ field, value })),
}))

vi.mock("@/lib/db/schema", () => ({
  hotelBookingOffers: {
    status: "hotel_booking_offers.status",
    city: "hotel_booking_offers.city",
    sortOrder: "hotel_booking_offers.sort_order",
    periodStart: "hotel_booking_offers.period_start",
    hotelName: "hotel_booking_offers.hotel_name",
  },
}))

vi.mock("@/lib/hotel-booking/whatsapp", () => ({
  buildHotelBookingWhatsappHref: vi.fn(() => "https://wa.me/123?text=offer"),
}))

vi.mock("@/components/hotel-booking/HotelBookingSearchForm", () => ({
  HotelBookingSearchForm: ({ errors }: { errors: string[] }) => (
    <form>
      <span>Cari Hotel</span>
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </form>
  ),
}))

vi.mock("@/components/hotel-booking/HotelBookingSearchResults", () => ({
  HotelBookingSearchResults: ({
    params,
    results,
    hasActiveOffers,
  }: {
    params?: { nights: number }
    results: Array<{ hotelName: string; quote: { totalAmount: number }; whatsappHref: string }>
    hasActiveOffers: boolean
  }) => (
    <section>
      {!params ? (
        <p>Pilih tanggal check-in dan check-out</p>
      ) : results.length === 0 ? (
        <p>{hasActiveOffers ? "Belum ada rate hotel yang cocok" : "Belum ada rate hotel yang sedang dibuka"}</p>
      ) : (
        results.map((result) => (
          <a key={result.hotelName} href={result.whatsappHref}>
            {result.hotelName} {result.quote.totalAmount}
          </a>
        ))
      )}
    </section>
  ),
}))

import { db } from "@/lib/db"

const mockSelect = db.select as ReturnType<typeof vi.fn>

function mockOfferRows(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows)
  const where = vi.fn().mockReturnValue({ orderBy })
  const from = vi.fn().mockReturnValue({ where })
  mockSelect.mockReturnValue({ from })
  return { from, where, orderBy }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PesanHotelPage", () => {
  it("renders matching date-search offers with WhatsApp handoff copy", async () => {
    mockOfferRows([
      {
        id: "offer-1",
        hotelListingId: "hotel-1",
        city: "MAKKAH",
        tier: "STANDARD",
        hotelName: "Safwa Tower 3",
        offerLabel: "Ramadan awal",
        roomType: "Double Standard Room",
        rateLabel: "Free cancellation",
        periodLabel: "15 Feb - 5 Mar 2026",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-10T00:00:00.000Z"),
        roomBasis: "per kamar per malam",
        currency: "SAR",
        priceAmount: 250,
        status: "ACTIVE",
        maxAdults: 2,
        maxGuests: 2,
        minNights: 1,
        inclusions: "Free WiFi",
        cancellationPolicy: "Free cancellation",
        notes: "Dekat Haram",
        terms: "Cek manual",
      },
    ])
    const { default: PesanHotelPage } = await import("../page")

    render(
      await PesanHotelPage({
        searchParams: Promise.resolve({
          checkIn: "2026-07-01",
          checkOut: "2026-07-05",
          rooms: "1",
          adults: "2",
        }),
      })
    )

    expect(screen.getByRole("heading", { name: "Pesan Hotel" })).toBeInTheDocument()
    expect(screen.getByText(/Safwa Tower 3 1000/)).toHaveAttribute("href", "https://wa.me/123?text=offer")
    expect(screen.getByText(/Availability akhir, payment, dan konfirmasi booking/)).toBeInTheDocument()
  })

  it("prompts for dates before showing active offers", async () => {
    mockOfferRows([])
    const { default: PesanHotelPage } = await import("../page")

    render(await PesanHotelPage({}))

    expect(screen.getByText("Pilih tanggal check-in dan check-out")).toBeInTheDocument()
  })

  it("renders an empty state when no active rates match selected dates", async () => {
    mockOfferRows([])
    const { default: PesanHotelPage } = await import("../page")

    render(
      await PesanHotelPage({
        searchParams: Promise.resolve({
          checkIn: "2026-07-01",
          checkOut: "2026-07-05",
          rooms: "1",
          adults: "2",
        }),
      })
    )

    expect(screen.getByText("Belum ada rate hotel yang sedang dibuka")).toBeInTheDocument()
  })
})
