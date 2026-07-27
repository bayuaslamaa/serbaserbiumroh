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

  // The clear-filter escape hatch, a stat card, and browser Back all change `q`
  // from outside. If the box keeps the old term it re-arms the debounce and
  // navigates the search straight back.
  it("adopts an externally cleared search instead of restoring it", () => {
    currentParams = new URLSearchParams("q=irham")
    const { rerender } = render(<CommunityRequestsToolbar q="irham" />)

    currentParams = new URLSearchParams()
    rerender(<CommunityRequestsToolbar q="" />)
    vi.advanceTimersByTime(1000)

    expect((searchBox() as HTMLInputElement).value).toBe("")
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("adopts an externally changed search term", () => {
    currentParams = new URLSearchParams("q=irham")
    const { rerender } = render(<CommunityRequestsToolbar q="irham" />)

    currentParams = new URLSearchParams("q=dessy")
    rerender(<CommunityRequestsToolbar q="dessy" />)
    vi.advanceTimersByTime(1000)

    expect((searchBox() as HTMLInputElement).value).toBe("dessy")
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("still debounces the user's own typing after an external change", () => {
    currentParams = new URLSearchParams("q=irham")
    const { rerender } = render(<CommunityRequestsToolbar q="irham" />)

    currentParams = new URLSearchParams()
    rerender(<CommunityRequestsToolbar q="" />)
    vi.advanceTimersByTime(1000)

    fireEvent.change(searchBox(), { target: { value: "dessy" } })
    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledWith("/admin/community-requests?q=dessy")
  })

  // A filter link clicked mid-debounce must not be undone by params the effect
  // closed over before the click.
  it("writes against the params current at fire time, not at capture time", () => {
    currentParams = new URLSearchParams()
    const { rerender } = render(<CommunityRequestsToolbar q="" />)

    fireEvent.change(searchBox(), { target: { value: "irham" } })
    vi.advanceTimersByTime(100)

    // A stat card was clicked mid-debounce; the navigation re-renders us.
    currentParams = new URLSearchParams("status=MATCHED")
    rerender(<CommunityRequestsToolbar q="" />)

    vi.advanceTimersByTime(300)

    expect(mockReplace).toHaveBeenCalledWith("/admin/community-requests?status=MATCHED&q=irham")
  })

  it("labels the search box for assistive technology", () => {
    render(<CommunityRequestsToolbar q="" />)

    expect(searchBox()).toBeDefined()
  })
})
