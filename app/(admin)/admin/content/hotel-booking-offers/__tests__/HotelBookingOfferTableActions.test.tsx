import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HotelBookingOfferTableActions } from "../HotelBookingOfferTableActions"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
  refresh.mockReset()
})

describe("HotelBookingOfferTableActions", () => {
  it("keeps write actions disabled and surfaces an API failure", async () => {
    let resolveRequest!: (response: Response) => void
    vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve
      })
    )

    render(<HotelBookingOfferTableActions id="offer-1" status="ACTIVE" />)
    fireEvent.click(screen.getByRole("button", { name: "Tidak tersedia" }))

    expect(screen.getByRole("button", { name: "Tidak tersedia" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Arsip" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Hapus" })).toBeDisabled()

    resolveRequest({
      ok: false,
      json: async () => ({ error: "Offer gagal diperbarui" }),
    } as Response)

    await waitFor(() => {
      expect(screen.getByText("Offer gagal diperbarui")).toBeInTheDocument()
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
