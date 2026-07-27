import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import { EstimatorRail } from "../EstimatorRail"
import { MobileTotalBar } from "../MobileTotalBar"
import { applyOverrides } from "@/lib/budget/overrides"
import { rp } from "@/lib/export/summary"
import { buildWhatsAppMessage } from "@/lib/export/whatsapp"
import type { BudgetBreakdown as Breakdown, BreakdownDisplay, EstimateParams } from "@/types"

const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT_JED_MAKKAH"],
  fullboard: true,
}

const breakdown: Breakdown = {
  hotelMadinahIdr: 3_055_000,
  hotelMakkahIdr: 13_747_500,
  hotelMadinahDetail: {
    label: "Kayan Hotel",
    tier: "STANDARD",
    sarPerNight: 650,
    nights: 4,
    roomPax: 4,
    roomCount: 1,
    totalPax: 4,
    roomMultiplier: 1,
  },
  hotelMakkahDetail: {
    label: "Olayan Ajyad",
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
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 2_854_500, divideByPax: false },
    { key: "SISKOPATUH", label: "Siskopatuh", amountDisplay: "Rp 200.000", unitAmount: 200_000, currency: "IDR", idr: 200_000, divideByPax: false },
    { key: "TRANSPORT_JED_MAKKAH", label: "Transportasi", amountDisplay: "SAR 325", unitAmount: 325, currency: "SAR", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 14_500_000,
  totalIdrPax: 35_884_500,
  totalIdrGrp: 35_884_500,
  sarRate: 4700,
  usdRate: 17300,
}

// Bucket sums for the fixture above, mirroring EstimatorRail's own categoryBuckets aggregation:
// hotel = hotelMadinahIdr + hotelMakkahIdr, flight = flightIdr, services = the rest.
const HOTEL_BUCKET = 3_055_000 + 13_747_500 // 16,802,500
const FLIGHT_BUCKET = 14_500_000
const SERVICES_BUCKET = 2_854_500 + 200_000 + 1_527_500 // 4,582,000

const display: BreakdownDisplay = applyOverrides(breakdown, null, params.pax)

function renderRail(opts: { waOpen?: boolean; onWaOpenChange?: (open: boolean) => void; display?: BreakdownDisplay } = {}) {
  const onWaOpenChange = opts.onWaOpenChange ?? vi.fn()
  const onSave = vi.fn()
  render(
    <EstimatorRail
      display={opts.display ?? display}
      pax={params.pax}
      params={params}
      onSave={onSave}
      saveLabel="Simpan Estimasi"
      waOpen={opts.waOpen ?? false}
      onWaOpenChange={onWaOpenChange}
    />,
  )
  return { onSave, onWaOpenChange }
}

describe("EstimatorRail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("renders the total, the three category breakdown amounts, and both CTA buttons", () => {
    renderRail()

    // Exactly once — the rail renders only its own total card. Rincian Biaya lives in the wide main
    // column, so a second occurrence here means BudgetBreakdown was re-nested into the 352px rail,
    // the layout bug that collapsed the table's label column (formula wrapped one word per line).
    expect(screen.getAllByText(rp(display.totalIdrPax))).toHaveLength(1)

    // Category breakdown bucket amounts.
    expect(screen.getByText("Hotel Madinah & Makkah")).toBeDefined()
    expect(screen.getByText(rp(HOTEL_BUCKET))).toBeDefined()
    expect(screen.getByText("Penerbangan")).toBeDefined()
    expect(screen.getByText(rp(FLIGHT_BUCKET))).toBeDefined()
    expect(screen.getByText("Visa & layanan")).toBeDefined()
    expect(screen.getByText(rp(SERVICES_BUCKET))).toBeDefined()

    // Save CTA.
    expect(screen.getByRole("button", { name: "Simpan Estimasi" })).toBeDefined()
    // WA toggle CTA.
    expect(screen.getByRole("button", { name: /whatsapp/i })).toBeDefined()
  })

  it("toggling the controlled waOpen prop shows/hides the WA preview panel", () => {
    const { rerender } = render(
      <EstimatorRail
        display={display}
        pax={params.pax}
        params={params}
        onSave={vi.fn()}
        saveLabel="Simpan Estimasi"
        waOpen={false}
        onWaOpenChange={vi.fn()}
      />,
    )

    expect(screen.queryByText(/Assalamu'alaikum/)).toBeNull()

    rerender(
      <EstimatorRail
        display={display}
        pax={params.pax}
        params={params}
        onSave={vi.fn()}
        saveLabel="Simpan Estimasi"
        waOpen={true}
        onWaOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/Assalamu'alaikum/)).toBeDefined()
  })

  it("clicking the WA toggle reports the intent via onWaOpenChange (controlled, not internal state)", () => {
    const { onWaOpenChange } = renderRail({ waOpen: false })
    fireEvent.click(screen.getByRole("button", { name: /whatsapp/i }))
    expect(onWaOpenChange).toHaveBeenCalledWith(true)
  })

  it("'Salin pesan' copies the composed WA message and shows a transient copied state that reverts after ~1.8s", async () => {
    vi.useFakeTimers()
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>

    renderRail({ waOpen: true })

    const copyButton = screen.getByLabelText("Salin pesan WhatsApp")
    fireEvent.click(copyButton)

    // Flush the pending clipboard promise microtask (state update needs act()).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(writeText).toHaveBeenCalledWith(buildWhatsAppMessage(display, params, params.pax))
    expect(screen.getByText("Tersalin")).toBeDefined()

    // Reverts after exactly 1800ms, matching the copy-feedback window BudgetBreakdown uses.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1799)
    })
    expect(screen.getByText("Tersalin")).toBeDefined()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByText("Salin pesan")).toBeDefined()
  })

  it("category breakdown bar widths are proportional to the largest bucket", () => {
    renderRail()
    const max = Math.max(HOTEL_BUCKET, FLIGHT_BUCKET, SERVICES_BUCKET)

    expect(screen.getByTestId("category-bar-hotel").style.width).toBe(`${(HOTEL_BUCKET / max) * 100}%`)
    expect(screen.getByTestId("category-bar-flight").style.width).toBe(`${(FLIGHT_BUCKET / max) * 100}%`)
    expect(screen.getByTestId("category-bar-services").style.width).toBe(`${(SERVICES_BUCKET / max) * 100}%`)
  })

  it("category breakdown bars are 0% (not NaN) when every bucket totals zero", () => {
    const zeroDisplay: BreakdownDisplay = { rows: [], totalIdrPax: 0, totalIdrGrp: 0, sarRate: 4700, usdRate: 17300 }
    renderRail({ display: zeroDisplay })

    for (const key of ["hotel", "flight", "services"]) {
      const el = screen.getByTestId(`category-bar-${key}`)
      expect(el.style.width).toBe("0%")
      expect(el.style.width).not.toContain("NaN")
    }
  })
})

describe("MobileTotalBar", () => {
  afterEach(() => cleanup())

  it("calls onWaOpenChange(true) when 'Kirim WA' is tapped", () => {
    const onWaOpenChange = vi.fn()
    render(<MobileTotalBar display={display} waOpen={false} onWaOpenChange={onWaOpenChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Kirim WA" }))
    expect(onWaOpenChange).toHaveBeenCalledWith(true)
  })

  it("renders the same total (from the same display.totalIdrPax) that EstimatorRail renders", () => {
    render(
      <EstimatorRail
        display={display}
        pax={params.pax}
        params={params}
        onSave={vi.fn()}
        saveLabel="Simpan Estimasi"
        waOpen={false}
        onWaOpenChange={vi.fn()}
      />,
    )
    // The rail shows the full-precision figure straight from display.totalIdrPax, exactly once.
    expect(screen.getAllByText(rp(display.totalIdrPax))).toHaveLength(1)
    cleanup()

    render(<MobileTotalBar display={display} waOpen={false} onWaOpenChange={vi.fn()} />)
    // The mobile bar shows a compact "Rp X,XX jt" rendering of the very same field.
    const compact = screen.getByText(/^Rp [\d.,]+ jt$/)
    const numeric = compact.textContent!.replace("Rp ", "").replace(" jt", "").replace(",", ".")
    const reconstructed = Math.round(parseFloat(numeric) * 1_000_000)
    // Within the rounding tolerance of a 2-decimal-place "jt" compaction.
    expect(Math.abs(reconstructed - display.totalIdrPax)).toBeLessThanOrEqual(5_000)
  })
})
