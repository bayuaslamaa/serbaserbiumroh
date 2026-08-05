import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CopyButton } from "../CopyButton"

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  })
}

function button() {
  return screen.getByRole("button", { name: "Salin alamat tujuan" })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("CopyButton", () => {
  it("menyalin teks yang diberikan dan mengonfirmasi", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<CopyButton text="care@haj.gov.sa" describes="alamat tujuan" />)

    fireEvent.click(button())

    await waitFor(() => expect(screen.getByText("Tersalin")).toBeInTheDocument())
    expect(writeText).toHaveBeenCalledWith("care@haj.gov.sa")
  })

  it("kembali ke label semula setelah konfirmasi lewat", async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    render(<CopyButton text="care@haj.gov.sa" describes="alamat tujuan" />)

    fireEvent.click(button())
    await waitFor(() => expect(screen.getByText("Tersalin")).toBeInTheDocument())

    vi.advanceTimersByTime(1500)

    await waitFor(() => expect(screen.getByText("Salin")).toBeInTheDocument())
  })

  it("melaporkan kegagalan alih-alih terlihat diabaikan", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("not allowed")))
    render(<CopyButton text="care@haj.gov.sa" describes="alamat tujuan" />)

    fireEvent.click(button())

    await waitFor(() => expect(screen.getByText("Gagal salin")).toBeInTheDocument())
  })

  // Di luar secure context navigator.clipboard tidak ada sama sekali.
  it("bertahan ketika clipboard tidak tersedia", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    })
    render(<CopyButton text="care@haj.gov.sa" describes="alamat tujuan" />)

    fireEvent.click(button())

    await waitFor(() => expect(screen.getByText("Gagal salin")).toBeInTheDocument())
  })
})
