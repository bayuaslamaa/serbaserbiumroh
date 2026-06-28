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
    periodStart: "hotel_booking_offers.period_start",
    hotelName: "hotel_booking_offers.hotel_name",
  },
}))

vi.mock("@/lib/hotel-booking/whatsapp", () => ({
  buildHotelBookingWhatsappHref: vi.fn(() => "https://wa.me/123?text=offer"),
}))

vi.mock("@/components/hotel-nusuk/HotelBookingOfferCatalog", () => ({
  HotelBookingOfferCatalog: ({ offers }: { offers: Array<{ hotelName: string; whatsappHref: string }> }) => (
    <section>
      <h2>Booking Manual Tersedia</h2>
      {offers.length === 0 ? (
        <p>Belum ada offer hotel yang sedang dibuka.</p>
      ) : (
        offers.map((offer) => (
          <a key={offer.hotelName} href={offer.whatsappHref}>
            {offer.hotelName}
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
  it("renders active booking offers with WhatsApp handoff copy", async () => {
    mockOfferRows([
      {
        id: "offer-1",
        city: "MAKKAH",
        tier: "STANDARD",
        hotelName: "Safwa Tower 3",
        offerLabel: "Ramadan awal",
        periodLabel: "15 Feb - 5 Mar 2026",
        periodStart: new Date("2026-02-15T00:00:00.000Z"),
        periodEnd: new Date("2026-03-05T00:00:00.000Z"),
        roomBasis: "per kamar per malam",
        currency: "SAR",
        priceAmount: 1450,
        notes: "Dekat Haram",
        terms: "Cek manual",
      },
    ])
    const { default: PesanHotelPage } = await import("../page")

    render(await PesanHotelPage())

    expect(screen.getByRole("heading", { name: "Pesan Hotel" })).toBeInTheDocument()
    expect(screen.getByText("Safwa Tower 3")).toHaveAttribute("href", "https://wa.me/123?text=offer")
    expect(screen.getByText(/Payment, cek ketersediaan akhir, dan konfirmasi booking/)).toBeInTheDocument()
  })

  it("renders an empty state when no active offers are available", async () => {
    mockOfferRows([])
    const { default: PesanHotelPage } = await import("../page")

    render(await PesanHotelPage())

    expect(screen.getByText("Belum ada offer hotel yang sedang dibuka.")).toBeInTheDocument()
  })
})
