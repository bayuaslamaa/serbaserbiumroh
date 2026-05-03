import { render, screen } from "@testing-library/react"
import { BudgetBreakdown } from "../BudgetBreakdown"
import type { BudgetBreakdown as Breakdown } from "@/types"

const breakdown: Breakdown = {
  hotelMadinahIdr: 3_055_000,
  hotelMakkahIdr: 13_747_500,
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
  it("renders hotel lines", () => {
    render(<BudgetBreakdown breakdown={breakdown} pax={1} />)
    expect(screen.getByText("Hotel Madinah")).toBeDefined()
    expect(screen.getByText("Hotel Makkah")).toBeDefined()
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
})
