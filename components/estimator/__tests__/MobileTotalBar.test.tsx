import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MobileTotalBar } from "../MobileTotalBar"
import type { BreakdownDisplay } from "@/types"

function display(totalIdrPax: number): BreakdownDisplay {
  return { rows: [], totalIdrPax, totalIdrGrp: totalIdrPax, sarRate: 4700, usdRate: 17300 }
}

describe("MobileTotalBar", () => {
  it("formats totals under Rp 1.000.000 as a plain rupiah figure, not a '... jt' compaction", () => {
    render(<MobileTotalBar display={display(750_000)} waOpen={false} onWaOpenChange={vi.fn()} />)
    expect(screen.getByText("Rp 750.000")).toBeDefined()
  })

  it("formats totals at or above Rp 1.000.000 as a compact '... jt' figure", () => {
    render(<MobileTotalBar display={display(47_780_000)} waOpen={false} onWaOpenChange={vi.fn()} />)
    expect(screen.getByText(/^Rp [\d.,]+ jt$/)).toBeDefined()
  })

  it("toggles waOpen and swaps the button label when tapped again while open", () => {
    const onWaOpenChange = vi.fn()
    const { rerender } = render(
      <MobileTotalBar display={display(47_780_000)} waOpen={false} onWaOpenChange={onWaOpenChange} />
    )
    fireEvent.click(screen.getByText("Kirim WA"))
    expect(onWaOpenChange).toHaveBeenCalledWith(true)

    rerender(<MobileTotalBar display={display(47_780_000)} waOpen={true} onWaOpenChange={onWaOpenChange} />)
    fireEvent.click(screen.getByText("Tutup"))
    expect(onWaOpenChange).toHaveBeenCalledWith(false)
  })
})
