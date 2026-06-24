import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HotelBookingOfferImportPanel } from "../HotelBookingOfferImportPanel"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("HotelBookingOfferImportPanel", () => {
  it("keeps preview controls disabled until the request settles", async () => {
    let resolveRequest!: (response: Response) => void
    vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve
      })
    )

    render(<HotelBookingOfferImportPanel />)
    fireEvent.click(screen.getByRole("button", { name: /Buka/ }))
    fireEvent.change(screen.getByPlaceholderText("Tempel isi CSV offer booking hotel di sini..."), {
      target: { value: "city,tier,hotel_name,period_start,period_end,room_basis,price_amount" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    expect(screen.getByRole("button", { name: "Memeriksa..." })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Konfirmasi Import" })).toBeDisabled()

    resolveRequest({
      ok: true,
      json: async () => ({
        preview: {
          fileErrors: [],
          summary: { create: 0, update: 0, invalid: 0, conflict: 0 },
          rows: [],
        },
      }),
    } as Response)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled()
    })
  })
})
