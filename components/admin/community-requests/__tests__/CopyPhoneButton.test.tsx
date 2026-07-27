import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CopyPhoneButton } from "../CopyPhoneButton"

function button() {
  return screen.getByRole("button", { name: "Salin nomor 081284051103" })
}

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("CopyPhoneButton", () => {
  it("copies the number and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<CopyPhoneButton phone="081284051103" />)

    fireEvent.click(button())

    await waitFor(() => expect(screen.getByText("Tersalin")).toBeInTheDocument())
    expect(writeText).toHaveBeenCalledWith("081284051103")
  })

  it("returns to its resting label after the confirmation", async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    render(<CopyPhoneButton phone="081284051103" />)

    fireEvent.click(button())
    await waitFor(() => expect(screen.getByText("Tersalin")).toBeInTheDocument())

    vi.advanceTimersByTime(1500)

    await waitFor(() => expect(screen.getByText("Salin")).toBeInTheDocument())
  })

  // Outside a secure context navigator.clipboard is undefined, and a click that
  // reports nothing is indistinguishable from a broken button.
  it("reports failure rather than looking ignored", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("not allowed")))
    render(<CopyPhoneButton phone="081284051103" />)

    fireEvent.click(button())

    await waitFor(() => expect(screen.getByText("Gagal salin")).toBeInTheDocument())
  })

  it("survives clipboard being absent entirely", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    })
    render(<CopyPhoneButton phone="081284051103" />)

    fireEvent.click(button())

    await waitFor(() => expect(screen.getByText("Gagal salin")).toBeInTheDocument())
  })

  it("names the number it copies for assistive technology", () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    render(<CopyPhoneButton phone="081284051103" />)

    expect(button()).toBeInTheDocument()
  })
})
