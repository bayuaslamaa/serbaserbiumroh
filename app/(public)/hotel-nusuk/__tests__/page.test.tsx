import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

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
  hotelPrices: {
    city: "hotel_prices.city",
    label: "hotel_prices.label",
  },
  hotelMonthlyPrices: {},
  exchangeRates: {
    currency: "exchange_rates.currency",
  },
  hotelBookingOffers: {},
}))

vi.mock("@/components/hotel-nusuk/HotelPriceList", () => ({
  HotelPriceList: ({ hotels }: { hotels: Array<{ label: string }> }) => (
    <section>
      <h3>Hotel reference list</h3>
      {hotels.map((hotel) => (
        <p key={hotel.label}>{hotel.label}</p>
      ))}
    </section>
  ),
}))

vi.mock("@/components/hotel-nusuk/HotelBookingOfferCatalog", () => ({
  HotelBookingOfferCatalog: () => <section>Booking Manual Tersedia</section>,
}))

import { db } from "@/lib/db"

const mockSelect = db.select as ReturnType<typeof vi.fn>

function mockHotelNusukRows() {
  mockSelect
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          {
            id: "hotel-1",
            city: "MAKKAH",
            tier: "STANDARD",
            label: "Safwa Tower 3",
            sublabel: "Dekat Haram",
            distance: "250m",
            sarPerNight: 1450,
          },
        ]),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([]),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ currency: "SAR", rateToIdr: 4700 }]),
      }),
    })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("HotelNusukPage", () => {
  it("keeps hotel references and links booking intent to /pesan-hotel", async () => {
    mockHotelNusukRows()
    const { default: HotelNusukPage } = await import("../page")

    render(await HotelNusukPage())

    expect(screen.getByRole("heading", { name: "Hotel Nusuk" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pesan Hotel" })).toHaveAttribute("href", "/pesan-hotel")
    expect(screen.getByText("Estimasi Harga Hotel")).toBeInTheDocument()
    expect(screen.getByText("Safwa Tower 3")).toBeInTheDocument()
    expect(screen.queryByText("Booking Manual Tersedia")).not.toBeInTheDocument()
  })
})
