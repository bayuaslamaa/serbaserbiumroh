import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MobileWaPanel } from "../MobileWaPanel"
import { applyOverrides } from "@/lib/budget/overrides"
import { buildWhatsAppMessage } from "@/lib/export/whatsapp"
import type { BudgetBreakdown as Breakdown, EstimateParams } from "@/types"

const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA"],
  fullboard: true,
}

const breakdown: Breakdown = {
  hotelMadinahIdr: 3_055_000,
  hotelMakkahIdr: 13_747_500,
  hotelMadinahDetail: {
    label: "Kayan Hotel", tier: "STANDARD", sarPerNight: 650, nights: 4,
    roomPax: 4, roomCount: 1, totalPax: 4, roomMultiplier: 1,
  },
  hotelMakkahDetail: {
    label: "Olayan Ajyad", tier: "STANDARD", sarPerNight: 1300, nights: 9,
    roomPax: 4, roomCount: 1, totalPax: 4, roomMultiplier: 1,
  },
  servicesIdr: 2_854_500,
  serviceItems: [
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 2_854_500, divideByPax: false },
  ],
  flightIdr: 14_500_000,
  totalIdrPax: 34_156_500,
  totalIdrGrp: 34_156_500,
  sarRate: 4700,
  usdRate: 17300,
}

const display = applyOverrides(breakdown, null, params.pax)

describe("MobileWaPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it("renders the same composed WA message buildWhatsAppMessage produces", () => {
    const { container } = render(<MobileWaPanel display={display} params={params} pax={params.pax} />)
    const pre = container.querySelector("pre")
    expect(pre?.textContent).toBe(buildWhatsAppMessage(display, params, params.pax))
  })

  it("copies the message and shows a transient 'Tersalin' state that reverts after ~1.8s", async () => {
    vi.useFakeTimers()
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>
    render(<MobileWaPanel display={display} params={params} pax={params.pax} />)

    fireEvent.click(screen.getByLabelText("Salin pesan WhatsApp"))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(writeText).toHaveBeenCalledWith(buildWhatsAppMessage(display, params, params.pax))
    expect(screen.getByText("Tersalin")).toBeDefined()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800)
    })
    expect(screen.getByText("Salin pesan")).toBeDefined()
    vi.useRealTimers()
  })
})
