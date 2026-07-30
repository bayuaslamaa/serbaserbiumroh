import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  ENHANCED_TOGGLE_HELP,
  ENHANCED_TOGGLE_LABEL,
  InputPanel,
} from "../InputPanel"

// The catalogue-grounded parse toggle (U4/D4). Three things are worth a test here:
//
//   1. It is off on first render and only appears when the caller supplies a handler — the non-admin
//      case is "no control", not "a control that 403s".
//   2. The D4 copy is verbatim, including "~15-20 detik". That number is the whole reason the helper
//      text exists: an operator who does not expect the wait reads it as a hang and reloads, which
//      spends one of the 25 capped daily calls for nothing.
//   3. The ⌘/Ctrl+Enter submit path still fires. The toggle sits in the same block as the button, so
//      a layout change there is exactly what would break it.

function renderPanel(props: Partial<React.ComponentProps<typeof InputPanel>> = {}) {
  const onParse = vi.fn()
  const onChange = vi.fn()
  const onEnhancedChange = vi.fn()
  const utils = render(
    <InputPanel
      value="umroh 12 hari maret"
      onChange={onChange}
      onParse={onParse}
      loading={false}
      {...props}
    />,
  )
  return { onParse, onChange, onEnhancedChange, ...utils }
}

function toggle() {
  return screen.getByRole("checkbox", { name: ENHANCED_TOGGLE_LABEL })
}

describe("InputPanel enhanced-parse toggle", () => {
  it("renders no toggle when the caller supplies no handler", () => {
    // How a non-admin sees nothing: the component knows nothing about roles, it just has no handler.
    renderPanel()

    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.queryByText(ENHANCED_TOGGLE_LABEL)).toBeNull()
    expect(screen.queryByText(ENHANCED_TOGGLE_HELP)).toBeNull()
  })

  it("is unchecked on first render", () => {
    const onEnhancedChange = vi.fn()
    renderPanel({ onEnhancedChange })

    expect((toggle() as HTMLInputElement).checked).toBe(false)
    expect(onEnhancedChange).not.toHaveBeenCalled()
  })

  it("uses the settled D4 copy verbatim, seconds included", () => {
    renderPanel({ onEnhancedChange: vi.fn() })

    expect(screen.getByText("Pakai harga katalog (lebih lambat)")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Hotel dipilih dari tarif katalog asli untuk bulan yang diminta. Berguna saat ada batas budget atau bulan tertentu. Perlu ~15-20 detik.",
      ),
    ).toBeInTheDocument()
    // Asserted on its own too: a well-meaning copy edit that softens the wait is the regression this
    // catches, and it would still leave the sentence above recognisable.
    expect(ENHANCED_TOGGLE_HELP).toContain("~15-20 detik")
  })

  it("reports a tick to the caller instead of holding the state itself", () => {
    const onEnhancedChange = vi.fn()
    renderPanel({ onEnhancedChange })

    fireEvent.click(toggle())
    expect(onEnhancedChange).toHaveBeenCalledWith(true)

    // Controlled: the checkbox reflects the prop, so it stays off until the owner says otherwise.
    expect((toggle() as HTMLInputElement).checked).toBe(false)
  })

  it("reports a untick when the caller has it on", () => {
    const onEnhancedChange = vi.fn()
    renderPanel({ enhanced: true, onEnhancedChange })

    expect((toggle() as HTMLInputElement).checked).toBe(true)
    fireEvent.click(toggle())
    expect(onEnhancedChange).toHaveBeenCalledWith(false)
  })

  it("disables the toggle while a parse is in flight", () => {
    renderPanel({ onEnhancedChange: vi.fn(), loading: true })

    expect((toggle() as HTMLInputElement).disabled).toBe(true)
  })
})

describe("InputPanel submit paths survive the toggle", () => {
  it("still parses on ⌘/Ctrl+Enter with the toggle absent", () => {
    const { onParse } = renderPanel()
    const textarea = screen.getByRole("textbox")

    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true })
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
    expect(onParse).toHaveBeenCalledTimes(2)
  })

  it("still parses on ⌘/Ctrl+Enter with the toggle on", () => {
    const { onParse } = renderPanel({ enhanced: true, onEnhancedChange: vi.fn() })
    const textarea = screen.getByRole("textbox")

    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true })
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
    expect(onParse).toHaveBeenCalledTimes(2)
  })

  it("does not parse on a bare Enter", () => {
    const { onParse } = renderPanel({ onEnhancedChange: vi.fn() })

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
    expect(onParse).not.toHaveBeenCalled()
  })

  it("keeps the button and the example chips working alongside the toggle", () => {
    const { onParse, onChange } = renderPanel({ onEnhancedChange: vi.fn() })

    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))
    expect(onParse).toHaveBeenCalledTimes(1)

    // The chips are buttons too; the toggle must not have stolen their slot in the tree.
    const chips = screen.getAllByRole("button").filter((b) => b.textContent?.endsWith("…"))
    expect(chips.length).toBeGreaterThan(0)
    fireEvent.click(chips[0])
    expect(onChange).toHaveBeenCalled()
  })
})
