import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/stats/community", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stats/community")>()
  return { ...actual, getPublicVisitorCount: vi.fn() }
})

import { getPublicVisitorCount } from "@/lib/stats/community"
import LayananPage from "../page"

const mockCount = getPublicVisitorCount as ReturnType<typeof vi.fn>

afterEach(() => {
  mockCount.mockReset()
})

describe("LayananPage", () => {
  it("renders the community figures for a resolved count", async () => {
    mockCount.mockResolvedValue(8778)

    render(await LayananPage())

    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
  })

  it("still renders the page when the count is unreadable", async () => {
    // R9: a database failure degrades the badge, it does not take the route
    // down. Proven here at the page level, not just in the helper.
    mockCount.mockResolvedValue(null)

    render(await LayananPage())

    expect(screen.getByText("Layanan Serba Serbi Umroh")).toBeDefined()
    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.queryByText(/Pengunjung/)).toBeNull()
  })
})
