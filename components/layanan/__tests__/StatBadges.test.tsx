import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StatBadges } from "../StatBadges"

function respondWith(uniqueVisitors: number) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, uniqueVisitors }),
    })
  )
}

describe("StatBadges", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", respondWith(0))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("renders the two static community pills", async () => {
    render(<StatBadges />)

    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.getByText(/3\.000\+ Jamaah Terbantu/)).toBeDefined()
  })

  it("shows a fixed-size skeleton before the count arrives", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    render(<StatBadges />)

    const skeleton = screen.getByTestId("visitor-skeleton")
    expect(skeleton.style.width).toBe("150px")
    expect(skeleton.style.height).toBe("26px")
  })

  it("formats the visitor count with id-ID grouping and the baseline offset", async () => {
    vi.stubGlobal("fetch", respondWith(8778))
    render(<StatBadges />)

    await waitFor(() =>
      expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
    )
  })

  it("issues a GET so it never records a pageview", async () => {
    render(<StatBadges />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("/api/visitor")
    expect(init.method).toBe("GET")
  })

  it("keeps the static pills and the skeleton when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(<StatBadges />)

    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.getByTestId("visitor-skeleton")).toBeDefined()

    consoleError.mockRestore()
  })
})
