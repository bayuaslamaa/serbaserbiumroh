import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { FieldTray } from "../FieldTray"

describe("FieldTray", () => {
  it("renders its children and calls onClose when its close button is clicked", () => {
    const onClose = vi.fn()
    render(
      <FieldTray title="Bulan Keberangkatan" onClose={onClose}>
        <p>Isi tray</p>
      </FieldTray>
    )

    expect(screen.getByText("Isi tray")).toBeDefined()
    expect(screen.getByText("Bulan Keberangkatan")).toBeDefined()

    fireEvent.click(screen.getByLabelText("Tutup"))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn()
    render(
      <FieldTray title="Bulan Keberangkatan" onClose={onClose}>
        <p>Isi tray</p>
      </FieldTray>
    )

    fireEvent.keyDown(document, { key: "Escape" })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose for other key presses", () => {
    const onClose = vi.fn()
    render(
      <FieldTray title="Bulan Keberangkatan" onClose={onClose}>
        <p>Isi tray</p>
      </FieldTray>
    )

    fireEvent.keyDown(document, { key: "Enter" })

    expect(onClose).not.toHaveBeenCalled()
  })

  it("moves focus to its first focusable element on mount", () => {
    const onClose = vi.fn()
    render(
      <FieldTray title="Bulan Keberangkatan" onClose={onClose}>
        <input aria-label="Cari" />
        <button type="button">Lainnya</button>
      </FieldTray>
    )

    expect(document.activeElement).toBe(screen.getByLabelText("Cari"))
  })

  it("removes its Escape listener on unmount", () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <FieldTray title="Bulan Keberangkatan" onClose={onClose}>
        <p>Isi tray</p>
      </FieldTray>
    )

    unmount()
    fireEvent.keyDown(document, { key: "Escape" })

    expect(onClose).not.toHaveBeenCalled()
  })
})
