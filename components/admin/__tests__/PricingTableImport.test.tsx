import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PricingTable } from "../PricingTable"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

const baseDate = new Date("2026-05-08T00:00:00Z")

const hotel = {
  id: "hotel-1",
  city: "MAKKAH" as const,
  tier: "STANDARD" as const,
  importKey: "MAKKAH:STANDARD:safwa tower 3",
  sarPerNight: 1300,
  label: "Safwa Tower 3",
  sublabel: "Near Haram",
  distance: "250m jalan kaki",
  agodaUrl: "https://www.agoda.com/safwa-tower-3",
  bookingcomUrl: "https://www.booking.com/safwa-tower-3",
  tripcomUrl: null,
  bookingUrl: null,
  updatedAt: baseDate,
  monthlyPrices: Array.from({ length: 12 }, (_, i) => ({
    id: `mp-${i + 1}`,
    hotelPriceId: "hotel-1",
    month: i + 1,
    sarPerNight: 1300,
    updatedAt: baseDate,
  })),
}

const props = {
  rates: [
    { id: "rate-1", currency: "SAR", rateToIdr: 4700, updatedBy: "system", updatedAt: baseDate },
  ],
  hotels: [hotel],
  airlines: [
    {
      id: "airline-1",
      tier: "STANDARD" as const,
      importKey: "STANDARD:batik air",
      idr: 14_500_000,
      label: "Batik Air",
      sublabel: "Standard",
      isDefault: true,
      updatedAt: baseDate,
      monthlyPrices: Array.from({ length: 12 }, (_, i) => ({
        id: `amp-${i + 1}`,
        airlinePriceId: "airline-1",
        month: i + 1,
        idr: 14_500_000,
        updatedAt: baseDate,
      })),
    },
  ],
  services: [
    {
      id: "service-1",
      key: "VISA" as const,
      currency: "USD",
      amount: 165,
      label: "Visa",
      enabled: true,
      divideByPax: false,
      updatedAt: baseDate,
    },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("PricingTable airline CSV import", () => {
  it("shows the airline import panel and template link", () => {
    render(<PricingTable {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "Import Maskapai CSV" }))

    expect(screen.getByText("Import Harga Maskapai CSV")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Download Template" })).toHaveAttribute(
      "href",
      "/api/admin/pricing/airline-import/template"
    )
    expect(screen.getByRole("button", { name: "+ Tambah Maskapai" })).toBeInTheDocument()
  })

  it("previews airline row counts and row-level errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        preview: {
          fileErrors: [],
          summary: { create: 1, update: 0, invalid: 1, conflict: 0 },
          rows: [
            {
              rowNumber: 2,
              status: "create",
              errors: [],
              data: { tier: "STANDARD", label: "Batik Air" },
            },
            {
              rowNumber: 3,
              status: "invalid",
              errors: ["tier must be BUDGET, STANDARD, GARUDA, or BUSINESS"],
            },
          ],
        },
      }),
    } as Response)

    render(<PricingTable {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Import Maskapai CSV" }))
    fireEvent.change(screen.getByPlaceholderText("Tempel isi CSV maskapai di sini atau pilih file CSV..."), {
      target: {
        value: "tier,label,base_idr_per_person\nSTANDARD,Batik Air,14500000\n",
      },
    })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    await waitFor(() => {
      expect(screen.getByText("Invalid")).toBeInTheDocument()
      expect(screen.getByText("tier must be BUDGET, STANDARD, GARUDA, or BUSINESS")).toBeInTheDocument()
    })
  })
})

describe("PricingTable hotel CSV import", () => {
  it("shows the import panel and template link without removing manual add", () => {
    render(<PricingTable {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }))

    expect(screen.getByText("Import Harga Hotel CSV")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Download Template" })).toHaveAttribute(
      "href",
      "/api/admin/pricing/hotel-import/template"
    )
    expect(screen.getByRole("button", { name: "+ Tambah Hotel" })).toBeInTheDocument()
  })

  it("previews row counts and row-level errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        preview: {
          fileErrors: [],
          summary: { create: 1, update: 0, invalid: 1, conflict: 0 },
          rows: [
            {
              rowNumber: 2,
              status: "create",
              errors: [],
              data: { city: "MAKKAH", tier: "STANDARD", label: "Safwa Tower 3", distance: "250m jalan kaki" },
            },
            {
              rowNumber: 3,
              status: "invalid",
              errors: ["city must be MAKKAH or MADINAH"],
            },
          ],
        },
      }),
    } as Response)

    render(<PricingTable {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }))
    fireEvent.change(screen.getByPlaceholderText("Tempel isi CSV di sini atau pilih file CSV..."), {
      target: {
        value: "city,tier,label,base_sar_per_night\nMAKKAH,STANDARD,Safwa Tower 3,1300\n",
      },
    })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    await waitFor(() => {
      expect(screen.getByText("Invalid")).toBeInTheDocument()
      expect(screen.getByText("MAKKAH STANDARD - Safwa Tower 3 (250m jalan kaki)")).toBeInTheDocument()
      expect(screen.getByText("city must be MAKKAH or MADINAH")).toBeInTheDocument()
    })
  })

  it("shows hotel distance in the table and manual add form", () => {
    render(<PricingTable {...props} />)

    expect(screen.getByText("Jarak")).toBeInTheDocument()
    expect(screen.getByText("Booking")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Agoda" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "250m jalan kaki" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "+ Tambah Hotel" }))
    expect(screen.getByPlaceholderText("cth. 250m jalan kaki")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("https://www.agoda.com/...")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("https://www.booking.com/...")).toBeInTheDocument()
  })

  it("keeps confirm disabled until preview returns writable rows without conflicts", async () => {
    render(<PricingTable {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }))

    expect(screen.getByRole("button", { name: "Konfirmasi Import" })).toBeDisabled()
  })
})
