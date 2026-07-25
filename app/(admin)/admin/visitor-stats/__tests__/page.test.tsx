import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }))

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

import { db } from "@/lib/db"
import { VISITOR_BASELINE_OFFSET } from "@/lib/stats/community"
import VisitorStatsPage from "../page"

const mockSelect = db.select as ReturnType<typeof vi.fn>

/**
 * The page runs three reads off one `db.select`: the summary row, the
 * per-path rollup, then the recent-log list. Each has a different chain, so
 * they are queued in call order.
 */
function queueQueries(uniqueVisitors: number) {
  mockSelect
    .mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([{ totalViews: 999, uniqueVisitors }]),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        groupBy: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    })
}

afterEach(() => {
  mockSelect.mockReset()
})

describe("VisitorStatsPage promotional figure", () => {
  it("applies the shared offset to the raw count", async () => {
    // R6: the admin figure is the one a visitor is shown. Pinning the constant
    // alone does not prove this page reads it — this does.
    queueQueries(8778)

    render(await VisitorStatsPage())

    expect(screen.getByText("8.878+")).toBeDefined()
    expect(
      screen.getByText(new RegExp(`offset promo \\(${VISITOR_BASELINE_OFFSET}\\)`))
    ).toBeDefined()
  })

  it("labels the figure with the surfaces that actually show it", async () => {
    queueQueries(0)

    render(await VisitorStatsPage())

    expect(screen.getByText(/Angka Promosi \(Beranda & Layanan\)/)).toBeDefined()
    expect(screen.queryByText(/Navbar/)).toBeNull()
  })
})
