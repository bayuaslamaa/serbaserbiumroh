import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, it, expect, vi } from "vitest"
import { BudgetBreakdown } from "../BudgetBreakdown"
import { applyOverrides } from "@/lib/budget/overrides"
import type { BudgetBreakdown as Breakdown, CustomRow, ManualOverrides } from "@/types"

const breakdown: Breakdown = {
  hotelMadinahIdr: 3_055_000,
  hotelMakkahIdr: 13_747_500,
  hotelMadinahDetail: {
    label: "Standard Madinah", tier: "STANDARD", sarPerNight: 650, nights: 4,
    roomPax: 4, roomCount: 1, totalPax: 4, roomMultiplier: 1,
  },
  hotelMakkahDetail: {
    label: "Safwa Tower 3", tier: "STANDARD", sarPerNight: 1300, nights: 9,
    roomPax: 4, roomCount: 1, totalPax: 4, roomMultiplier: 1,
  },
  servicesIdr: 4_582_000,
  serviceItems: [
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 2_854_500, divideByPax: false },
    { key: "SISKOPATUH", label: "Siskopatuh", amountDisplay: "Rp 200.000", unitAmount: 200_000, currency: "IDR", idr: 200_000, divideByPax: false },
    { key: "TRANSPORT", label: "Transportasi", amountDisplay: "SAR 325", unitAmount: 325, currency: "SAR", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 14_500_000,
  totalIdrPax: 35_884_500,
  totalIdrGrp: 35_884_500,
  sarRate: 4700,
  usdRate: 17300,
}

const noopHandlers = {
  onSetAmount: vi.fn(),
  onSetUnitPrice: vi.fn(),
  onSetLabel: vi.fn(),
  onToggleHidden: vi.fn(),
  onResetRow: vi.fn(),
  onAddCustom: vi.fn(),
  onSetCustomLabel: vi.fn(),
  onSetCustomAmount: vi.fn(),
  onRemoveCustom: vi.fn(),
}

function renderPanel(opts: { overrides?: ManualOverrides; customRows?: CustomRow[]; pax?: number; editable?: boolean } = {}) {
  const pax = opts.pax ?? 1
  const display = applyOverrides(breakdown, opts.overrides ?? null, pax)
  const handlers = { ...noopHandlers }
  render(
    <BudgetBreakdown
      display={display}
      customRows={opts.customRows ?? []}
      pax={pax}
      editable={opts.editable}
      {...handlers}
    />,
  )
  return handlers
}

describe("BudgetBreakdown editor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it("renders computed rows, hotel formula, and the total", () => {
    renderPanel()
    expect(screen.getByDisplayValue("Hotel Madinah - Standard Madinah")).toBeDefined()
    expect(screen.getByDisplayValue("Hotel Makkah - Safwa Tower 3")).toBeDefined()
    expect(screen.getByText("SAR 650 × 4 malam × 1 kamar ÷ 4 orang (4 orang/kamar)")).toBeDefined()
    expect(screen.getByText("Rp 35.884.500")).toBeDefined()
  })

  it("editing an amount calls onSetAmount with the row key and parsed value", () => {
    const h = renderPanel()
    const amountInputs = screen.getAllByLabelText("Nilai (Rp)")
    fireEvent.change(amountInputs[1], { target: { value: "13000000" } }) // hotelMakkah
    expect(h.onSetAmount).toHaveBeenCalledWith("hotelMakkah", 13_000_000)
  })

  it("shows each row's native unit price in its own currency", () => {
    renderPanel()
    const unitInputs = screen.getAllByLabelText("Harga satuan")
    // hotels in SAR, visa in USD, transport in SAR, flight in IDR
    expect((unitInputs[0] as HTMLInputElement).value).toBe("650") // hotelMadinah SAR
    expect((unitInputs[1] as HTMLInputElement).value).toBe("1.300") // hotelMakkah SAR (formatted)
    expect((unitInputs[2] as HTMLInputElement).value).toBe("165") // VISA USD
    expect((unitInputs[5] as HTMLInputElement).value).toBe("14.500.000") // flight IDR
  })

  it("editing a unit price calls onSetUnitPrice with the row key and parsed value", () => {
    const h = renderPanel()
    const unitInputs = screen.getAllByLabelText("Harga satuan")
    fireEvent.change(unitInputs[0], { target: { value: "700" } }) // hotelMadinah SAR/night
    expect(h.onSetUnitPrice).toHaveBeenCalledWith("hotelMadinah", 700)
  })

  it("a unit-price override rescales the row value linearly", () => {
    // 650 → 715 SAR is a 1.1× bump; 3,055,000 × 1.1 = 3,360,500
    const overrides: ManualOverrides = { overrides: { hotelMadinah: { unitPrice: 715 } }, customRows: [] }
    renderPanel({ overrides })
    const unitInputs = screen.getAllByLabelText("Harga satuan")
    expect((unitInputs[0] as HTMLInputElement).value).toBe("715")
    const valueInputs = screen.getAllByLabelText("Nilai (Rp)")
    expect((valueInputs[0] as HTMLInputElement).value).toBe("3.360.500")
  })

  it("clearing an amount calls onSetAmount with null (empty = no override)", () => {
    const h = renderPanel()
    const amountInputs = screen.getAllByLabelText("Nilai (Rp)")
    fireEvent.change(amountInputs[0], { target: { value: "" } })
    expect(h.onSetAmount).toHaveBeenCalledWith("hotelMadinah", null)
  })

  it("editing a label calls onSetLabel", () => {
    const h = renderPanel()
    const labelInputs = screen.getAllByLabelText("Nama baris")
    fireEvent.change(labelInputs[1], { target: { value: "Hotel Nego" } })
    expect(h.onSetLabel).toHaveBeenCalledWith("hotelMakkah", "Hotel Nego")
  })

  it("hiding a row calls onToggleHidden", () => {
    const h = renderPanel()
    fireEvent.click(screen.getAllByLabelText("Sembunyikan baris")[5]) // flight
    expect(h.onToggleHidden).toHaveBeenCalledWith("flight")
  })

  it("adding a custom row calls onAddCustom", () => {
    const h = renderPanel()
    fireEvent.click(screen.getByLabelText("Tambah baris"))
    expect(h.onAddCustom).toHaveBeenCalled()
  })

  it("an overridden row shows the manual badge and a working reset", () => {
    const overrides: ManualOverrides = { overrides: { hotelMakkah: { idr: 20_000_000 } }, customRows: [] }
    const h = renderPanel({ overrides })
    expect(screen.getByText("manual")).toBeDefined()
    fireEvent.click(screen.getByLabelText("Kembalikan ke nilai otomatis"))
    expect(h.onResetRow).toHaveBeenCalledWith("hotelMakkah")
  })

  it("a stale override shows the usang warning", () => {
    const overrides: ManualOverrides = {
      overrides: { hotelMakkah: { idr: 20_000_000, autoIdrAtOverride: 10_000_000 } },
      customRows: [],
    }
    renderPanel({ overrides })
    expect(screen.getByText("⚠ nilai mungkin usang")).toBeDefined()
  })

  it("a hidden row is excluded from the total and shows the disembunyikan badge", () => {
    const overrides: ManualOverrides = { overrides: { flight: { hidden: true } }, customRows: [] }
    renderPanel({ overrides })
    expect(screen.getByText("disembunyikan")).toBeDefined()
    expect(screen.getByText("Rp 21.384.500")).toBeDefined() // 35,884,500 - 14,500,000
  })

  it("renders per-person custom rows and wires delete", () => {
    const customRows: CustomRow[] = [{ id: "c1", label: "Manasik", idr: 300_000 }]
    const overrides: ManualOverrides = { overrides: {}, customRows }
    const h = renderPanel({ overrides, customRows })
    expect(screen.getByDisplayValue("Manasik")).toBeDefined()
    expect(screen.getByText("per orang")).toBeDefined()
    fireEvent.click(screen.getByLabelText("Hapus baris"))
    expect(h.onRemoveCustom).toHaveBeenCalledWith("c1")
  })

  it("custom rows edit only the total; the unit price is a read-only mirror", () => {
    const customRows: CustomRow[] = [{ id: "c1", label: "Manasik", idr: 300_000 }]
    const h = renderPanel({ overrides: { overrides: {}, customRows }, customRows })
    // the custom row is rendered after the computed rows, so its fields are the last of each label
    const unitInputs = screen.getAllByLabelText("Harga satuan")
    const valueInputs = screen.getAllByLabelText("Nilai (Rp)")
    // unit price mirrors the total, non-editable
    expect(unitInputs[unitInputs.length - 1]).toHaveAttribute("readonly")
    // the total remains editable and wires to the custom-amount handler
    fireEvent.change(valueInputs[valueInputs.length - 1], { target: { value: "450000" } })
    expect(h.onSetCustomAmount).toHaveBeenCalledWith("c1", 450_000)
  })

  it("copies overridden rows, custom rows, and override-aware totals while omitting hidden rows", async () => {
    const customRows: CustomRow[] = [{ id: "c1", label: "Manasik", idr: 300_000 }]
    const overrides: ManualOverrides = {
      overrides: {
        hotelMakkah: { label: "Hotel Nego", idr: 15_000_000 },
        flight: { hidden: true },
      },
      customRows,
    }
    renderPanel({ overrides, customRows, pax: 2 })

    fireEvent.click(screen.getByLabelText("Salin rincian estimasi"))

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(copied).toContain("• Hotel Nego")
    expect(copied).toContain("Rp 15.000.000")
    expect(copied).toContain("• Manasik")
    expect(copied).toContain("Rp 300.000")
    expect(copied).not.toContain("Penerbangan")
    expect(copied).toContain("*TOTAL PER ORANG: Rp 22.937.000*")
    expect(copied).toContain("*TOTAL 2 ORANG: Rp 45.874.000*")
  })

  it("copy text uses a basis header and clean component labels", async () => {
    renderPanel()
    fireEvent.click(screen.getByLabelText("Salin rincian estimasi"))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(copied).toContain("Rincian per orang (basis 4 orang/kamar):")
    expect(copied).toContain("• Visa Umroh Reguler\n") // "($165)" suffix stripped from the label
    expect(copied).not.toContain("Reguler ($165)")
  })

  it("shows a 'harga real' badge on a hotel row priced from the real catalog", () => {
    const withReal: Breakdown = {
      ...breakdown,
      hotelMakkahDetail: { ...breakdown.hotelMakkahDetail, priceSource: "real" },
      hotelMadinahDetail: { ...breakdown.hotelMadinahDetail, priceSource: "estimate" },
    }
    render(
      <BudgetBreakdown display={applyOverrides(withReal, null, 1)} customRows={[]} pax={1} {...noopHandlers} />,
    )
    expect(screen.getByText("harga real")).toBeDefined()
    expect(screen.getByText("estimasi")).toBeDefined()
  })

  it("drops the source badge once the hotel amount is overridden (no longer layer-priced)", () => {
    const withReal: Breakdown = {
      ...breakdown,
      hotelMakkahDetail: { ...breakdown.hotelMakkahDetail, priceSource: "real" },
    }
    const overrides: ManualOverrides = { overrides: { hotelMakkah: { idr: 20_000_000 } }, customRows: [] }
    render(
      <BudgetBreakdown display={applyOverrides(withReal, overrides, 1)} customRows={[]} pax={1} {...noopHandlers} />,
    )
    expect(screen.queryByText("harga real")).toBeNull()
  })

  it("drops the source badge on a unit-price override (hand-typed rate is not 'harga real')", () => {
    // A unit-price override keeps hotelDetail (formula shown at the edited rate), but the SAR/night
    // is now manual — the catalog attribution must not survive.
    const withReal: Breakdown = {
      ...breakdown,
      hotelMakkahDetail: { ...breakdown.hotelMakkahDetail, priceSource: "real" },
    }
    const overrides: ManualOverrides = { overrides: { hotelMakkah: { unitPrice: 1600 } }, customRows: [] }
    render(
      <BudgetBreakdown display={applyOverrides(withReal, overrides, 1)} customRows={[]} pax={1} {...noopHandlers} />,
    )
    expect(screen.queryByText("harga real")).toBeNull()
    expect(screen.getByText("manual")).toBeDefined()
  })

  it("stops the amount column being full-width once rows go side-by-side (tablet / Z Fold band)", () => {
    // Between sm: and lg: (640-1023px — tablet and an unfolded Z Fold) the row is a flex-row. An
    // amounts column that stays w-full there, with shrink-0, claims the whole row and starves the
    // min-w-0 label column: the label input collapses to a sliver and the hotel formula wraps one
    // word per line. jsdom cannot evaluate media queries, so assert the class contract instead —
    // every full-width ancestor of an amount field must release that width at sm:.
    renderPanel()
    const unitInput = screen.getAllByLabelText("Harga satuan")[0]

    let el: HTMLElement | null = unitInput.parentElement
    let fullWidthAncestors = 0
    while (el && !el.className.includes("rounded-[14px]")) {
      if (el.className.includes("w-full")) {
        expect(el.className).toMatch(/sm:w-auto/)
        fullWidthAncestors++
      }
      el = el.parentElement
    }
    // Guard the guard: if the markup stops using w-full entirely the loop would pass vacuously.
    expect(fullWidthAncestors).toBeGreaterThan(0)
  })

  it("renders override controls read-only for non-admin viewers", () => {
    const customRows: CustomRow[] = [{ id: "c1", label: "Manasik", idr: 300_000 }]
    renderPanel({ overrides: { overrides: {}, customRows }, customRows, editable: false })

    expect(screen.queryByLabelText("Tambah baris")).toBeNull()
    expect(screen.queryAllByLabelText("Sembunyikan baris")).toHaveLength(0)
    expect(screen.queryByLabelText("Hapus baris")).toBeNull()
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).toHaveAttribute("readonly")
    }
  })
})
