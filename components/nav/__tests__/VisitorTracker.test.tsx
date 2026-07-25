import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockPathname = vi.fn(() => "/")

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}))

import { VisitorTracker } from "../VisitorTracker"

function okResponse() {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, uniqueVisitors: 1 }),
  })
}

describe("VisitorTracker", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/")
    vi.stubGlobal("fetch", vi.fn(okResponse))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("POSTs the current path on a public route", async () => {
    mockPathname.mockReturnValue("/panduan")
    render(<VisitorTracker />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("/api/visitor")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ path: "/panduan" })
    expect(init.headers).toEqual({ "Content-Type": "application/json" })
  })

  it.each(["/dashboard", "/admin/pricing", "/login", "/api/estimate"])(
    "makes no request at all on the blacklisted path %s",
    async (path) => {
      mockPathname.mockReturnValue(path)
      render(<VisitorTracker />)

      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it("renders nothing into the DOM", async () => {
    const { container } = render(<VisitorTracker />)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("swallows a failed request without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => render(<VisitorTracker />)).not.toThrow()
    await waitFor(() => expect(consoleError).toHaveBeenCalled())

    consoleError.mockRestore()
  })
})
