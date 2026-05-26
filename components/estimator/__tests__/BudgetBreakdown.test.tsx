import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, vi } from "vitest"
import { BudgetBreakdown } from "../BudgetBreakdown"
import type { BudgetBreakdown as Breakdown } from "@/types"

const breakdown: Breakdown = {
  hotelMadinahIdr: 3_055_000,
  hotelMakkahIdr: 13_747_500,
  hotelMadinahDetail: {
    label: "Standard Madinah",
    tier: "STANDARD",
    sarPerNight: 650,
    nights: 4,
    roomPax: 4,
    roomCount: 1,
    totalPax: 4,
    roomMultiplier: 1,
  },
  hotelMakkahDetail: {
    label: "Safwa Tower 3",
    tier: "STANDARD",
    sarPerNight: 1300,
    nights: 9,
    roomPax: 4,
    roomCount: 1,
    totalPax: 4,
    roomMultiplier: 1,
  },
  servicesIdr: 4_582_000,
  serviceItems: [
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", idr: 2_854_500, divideByPax: false },
    { key: "SISKOPATUH", label: "Siskopatuh", amountDisplay: "Rp 200.000", idr: 200_000, divideByPax: false },
    { key: "TRANSPORT", label: "Transportasi", amountDisplay: "SAR 325", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 14_500_000,
  totalIdrPax: 35_884_500,
  totalIdrGrp: 35_884_500,
  sarRate: 4700,
  usdRate: 17300,
}

describe("BudgetBreakdown", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("renders hotel lines", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.getByText("Hotel Madinah - Standard Madinah")).toBeDefined()
    expect(screen.getByText("Hotel Makkah - Safwa Tower 3")).toBeDefined()
    expect(screen.getByText("SAR 650 × 4 malam × 1 kamar ÷ 4 orang (4 orang/kamar)")).toBeDefined()
    expect(screen.getByText("SAR 1.300 × 9 malam × 1 kamar ÷ 4 orang (4 orang/kamar)")).toBeDefined()
  })

  it("renders service items with display amounts", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.getByText(/Visa Umroh Reguler.*\$165/)).toBeDefined()
    expect(screen.getByText(/Siskopatuh.*Rp 200\.000/)).toBeDefined()
    expect(screen.getByText(/Transportasi.*SAR 325/)).toBeDefined()
  })

  it("shows total per person in gold heading", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.getByText("Total per Orang")).toBeDefined()
    // Total displayed formatted
    expect(screen.getByText(/35\.884\.500/)).toBeDefined()
  })

  it("group total box hidden when pax=1", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.queryByText(/Total 1 orang/)).toBeNull()
  })

  it("group total box shown when pax>1", () => {
    const groupBreakdown = { ...breakdown, totalIdrGrp: breakdown.totalIdrPax * 5 }
    render(<BudgetBreakdown breakdown={groupBreakdown} pax={5} />)
    expect(screen.getByText("Total 5 orang")).toBeDefined()
  })

  it("renders exchange rate footer", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.getByText(/SAR 1 = Rp 4\.700/)).toBeDefined()
    expect(screen.getByText(/USD 1 = Rp 17\.300/)).toBeDefined()
  })

  it("renders the soft selling contact note", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.getByText(/Jika Kakak benar-benar serius transaksi ke kami/)).toBeDefined()
    expect(screen.getByText(/085172117757 \/ 085161134844/)).toBeDefined()
  })

  it("copies the visible estimate summary", async () => {
    const groupBreakdown = {
      ...breakdown,
      hotelMadinahDetail: { ...breakdown.hotelMadinahDetail, roomCount: 2, totalPax: 5 },
      hotelMakkahDetail: { ...breakdown.hotelMakkahDetail, roomCount: 2, totalPax: 5 },
      totalIdrGrp: breakdown.totalIdrPax * 5,
    }
    render(<BudgetBreakdown breakdown={groupBreakdown} pax={5} />)

    fireEvent.click(screen.getByRole("button", { name: "Salin rincian estimasi" }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("Estimasi Biaya Umroh")
      )
    })
    const copied = (navigator.clipboard.writeText as any).mock.calls[0][0] as string
    expect(copied).toContain("Rincian per orang:")
    expect(copied).toContain("- Hotel Madinah - Standard Madinah: Rp 3.055.000")
    expect(copied).toContain("  - Hitungan: SAR 650 × 4 malam × 2 kamar ÷ 5 orang (4 orang/kamar)")
    expect(copied).toContain("- Visa Umroh Reguler ($165): Rp 2.854.500")
    expect(copied).toContain("- Transportasi (SAR 325): Rp 1.527.500 / orang (biaya bersama dibagi 5 orang)")
    expect(copied).toContain("- Total 5 orang: Rp 179.422.500")
    expect(copied).toContain("- Harga sewaktu-waktu dapat berubah.")
    expect(copied).toContain("- Jika Kakak benar-benar serius transaksi ke kami")
    expect(copied).toContain("WA: 085172117757 / 085161134844")
    expect(await screen.findByRole("button", { name: "Salin rincian estimasi" })).toHaveTextContent("Tersalin")
  })
})
