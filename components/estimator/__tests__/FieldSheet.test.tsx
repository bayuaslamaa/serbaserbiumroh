import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { FieldSheet } from "../FieldSheet"

describe("FieldSheet", () => {
  it("renders its children inside a Dialog when open is true", () => {
    render(
      <FieldSheet open title="Bulan Keberangkatan" onOpenChange={vi.fn()}>
        <p>Isi sheet</p>
      </FieldSheet>
    )

    expect(screen.getByText("Isi sheet")).toBeDefined()
    expect(screen.getByText("Bulan Keberangkatan")).toBeDefined()
  })

  it("renders nothing when open is false", () => {
    render(
      <FieldSheet open={false} title="Bulan Keberangkatan" onOpenChange={vi.fn()}>
        <p>Isi sheet</p>
      </FieldSheet>
    )

    expect(screen.queryByText("Isi sheet")).toBeNull()
  })

  it("calls onOpenChange(false) when its close affordance is used", () => {
    const onOpenChange = vi.fn()
    render(
      <FieldSheet open title="Bulan Keberangkatan" onOpenChange={onOpenChange}>
        <p>Isi sheet</p>
      </FieldSheet>
    )

    fireEvent.click(screen.getByRole("button", { name: /close/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes via Radix's default outside-pointer-down behavior when disableOutsideClose is not set", async () => {
    const onOpenChange = vi.fn()
    render(
      <FieldSheet open title="Bulan Keberangkatan" onOpenChange={onOpenChange}>
        <p>Isi sheet</p>
      </FieldSheet>
    )

    // Radix's DismissableLayer registers its outside-pointer-down listener via
    // a deferred setTimeout(0), so it can ignore the same event that opened
    // the dialog. Wait a tick before dispatching the outside pointerdown.
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.pointerDown(document.body)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("does NOT close on a simulated outside-pointer/backdrop event when disableOutsideClose is set", async () => {
    const onOpenChange = vi.fn()
    render(
      <FieldSheet open title="Layanan Tambahan" onOpenChange={onOpenChange} disableOutsideClose>
        <p>Isi sheet</p>
      </FieldSheet>
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.pointerDown(document.body)

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText("Isi sheet")).toBeDefined()
  })
})
