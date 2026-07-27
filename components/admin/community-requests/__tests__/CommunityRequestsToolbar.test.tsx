import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockReplace = vi.fn()
let currentParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => currentParams,
}))

import { CommunityRequestsToolbar } from "../CommunityRequestsToolbar"

function searchBox() {
  return screen.getByLabelText("Cari nama, nomor telepon, atau username sosial")
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  currentParams = new URLSearchParams()
  mockReplace.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("CommunityRequestsToolbar", () => {
  it("writes the search term to the URL after the debounce", () => {
    render(<CommunityRequestsToolbar q="" />)

    fireEvent.change(searchBox(), { target: { value: "irham" } })
    expect(mockReplace).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledWith("/admin/community-requests?q=irham")
  })

  it("collapses rapid keystrokes into a single navigation", () => {
    render(<CommunityRequestsToolbar q="" />)

    const input = searchBox()
    fireEvent.change(input, { target: { value: "i" } })
    vi.advanceTimersByTime(100)
    fireEvent.change(input, { target: { value: "ir" } })
    vi.advanceTimersByTime(100)
    fireEvent.change(input, { target: { value: "irh" } })
    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith("/admin/community-requests?q=irh")
  })

  it("drops the q param entirely when the box is cleared", () => {
    currentParams = new URLSearchParams("q=irham")
    render(<CommunityRequestsToolbar q="irham" />)

    fireEvent.change(searchBox(), { target: { value: "" } })
    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledWith("/admin/community-requests")
  })

  it("resets to the first page when the search changes", () => {
    currentParams = new URLSearchParams("status=NEW&page=40")
    render(<CommunityRequestsToolbar q="" />)

    fireEvent.change(searchBox(), { target: { value: "irham" } })
    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledWith("/admin/community-requests?status=NEW&q=irham")
  })

  it("keeps the other active filters", () => {
    currentParams = new URLSearchParams("status=MATCHED&dup=1")
    render(<CommunityRequestsToolbar q="" />)

    fireEvent.change(searchBox(), { target: { value: "0812" } })
    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledWith(
      "/admin/community-requests?status=MATCHED&dup=1&q=0812"
    )
  })

  it("does not navigate on mount", () => {
    currentParams = new URLSearchParams("q=irham")
    render(<CommunityRequestsToolbar q="irham" />)

    vi.advanceTimersByTime(1000)

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("seeds the box from the active search term", () => {
    currentParams = new URLSearchParams("q=irham")
    render(<CommunityRequestsToolbar q="irham" />)

    expect((searchBox() as HTMLInputElement).value).toBe("irham")
  })

  it("labels the search box for assistive technology", () => {
    render(<CommunityRequestsToolbar q="" />)

    expect(searchBox()).toBeDefined()
  })
})
