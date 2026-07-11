import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HotelBookingOfferForm } from "../HotelBookingOfferForm"

const push = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
  refresh.mockReset()
})

describe("HotelBookingOfferForm", () => {
  it("prevents duplicate submissions while the request is pending", async () => {
    let resolveRequest!: (response: Response) => void
    const fetchMock = vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve
      })
    )

    render(
      <HotelBookingOfferForm
        hotelListings={[]}
        initialData={{
          id: "offer-1",
          hotelListingId: null,
          city: "MAKKAH",
          tier: "STANDARD",
          hotelName: "Safwa Tower 3",
          offerLabel: "Ramadan awal",
          roomType: "Double Standard Room",
          rateLabel: "Non-refundable",
          periodStart: "2026-02-15",
          periodEnd: "2026-03-05",
          periodLabel: "15 Feb - 5 Mar 2026",
          roomBasis: "per kamar per malam",
          currency: "SAR",
          priceAmount: 1450,
          maxAdults: 2,
          maxGuests: 2,
          minNights: 1,
          inclusions: "Free WiFi",
          cancellationPolicy: "Non-refundable setelah konfirmasi",
          sortOrder: 0,
          verifiedAt: "2026-01-20",
          status: "ACTIVE",
          notes: "",
          terms: "",
        }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Simpan Offer" }))

    const pendingButton = screen.getByRole("button", { name: "Menyimpan..." })
    expect(pendingButton).toBeDisabled()
    fireEvent.click(pendingButton)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRequest({ ok: true, json: async () => ({}) } as Response)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/admin/content/hotel-booking-offers")
    })
  })
})
