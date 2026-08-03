import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/stats/visitor-count", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stats/visitor-count")>()
  return { ...actual, getPublicVisitorCount: vi.fn() }
})

import { COMMUNITY_SIZE } from "@/lib/stats/community"
import { getPublicVisitorCount } from "@/lib/stats/visitor-count"
import LayananPage from "../page"

const mockCount = getPublicVisitorCount as ReturnType<typeof vi.fn>

afterEach(() => {
  mockCount.mockReset()
})

describe("LayananPage", () => {
  it("renders the community figures for a resolved count", async () => {
    mockCount.mockResolvedValue(8778)

    render(await LayananPage())

    // Read from the constant, not spelled out: the figure is hand-maintained
    // in lib/stats/community.ts, and a literal here goes stale the moment it
    // is bumped — which is exactly how this test came to be failing.
    expect(screen.getByText(`${COMMUNITY_SIZE} Komunitas`)).toBeDefined()
    expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
  })

  it("still renders the page when the count is unreadable", async () => {
    // R9: a database failure degrades the badge, it does not take the route
    // down. Proven here at the page level, not just in the helper.
    mockCount.mockResolvedValue(null)

    render(await LayananPage())

    expect(screen.getByText("Layanan Serba Serbi Umroh")).toBeDefined()
    expect(screen.getByText(`${COMMUNITY_SIZE} Komunitas`)).toBeDefined()
    expect(screen.queryByText(/Pengunjung/)).toBeNull()
  })
})
