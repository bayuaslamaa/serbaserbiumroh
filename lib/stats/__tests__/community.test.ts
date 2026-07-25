import { beforeEach, describe, expect, it, vi } from "vitest"

// unstable_cache wraps the query helper; make it a pass-through so the test
// exercises the query, not Next's cache machinery.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}))

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/lib/db"
import {
  COMMUNITY_SIZE,
  PILGRIMS_HELPED,
  VISITOR_BASELINE_OFFSET,
  formatVisitorCount,
  getPublicVisitorCount,
} from "../community"

const mockSelect = db.select as ReturnType<typeof vi.fn>

/** db.select({...}).from(table) resolves to the row array. */
function selectResolves(rows: unknown) {
  mockSelect.mockReturnValue({ from: vi.fn().mockResolvedValue(rows) })
}

function selectRejects(error: Error) {
  mockSelect.mockReturnValue({ from: vi.fn().mockRejectedValue(error) })
}

describe("community figures", () => {
  it("exposes both static figures as non-empty strings", () => {
    expect(COMMUNITY_SIZE.length).toBeGreaterThan(0)
    expect(PILGRIMS_HELPED.length).toBeGreaterThan(0)
  })

  it("pins the visitor offset at 100", () => {
    // Both the public badge and the admin dashboard read this. Changing it
    // moves a customer-facing number, so it is pinned deliberately.
    expect(VISITOR_BASELINE_OFFSET).toBe(100)
  })
})

describe("formatVisitorCount", () => {
  it("applies the offset and groups the result id-ID style", () => {
    expect(formatVisitorCount(8778)).toBe("8.878")
  })

  it("still formats a zero count", () => {
    expect(formatVisitorCount(0)).toBe("100")
  })

  it("returns null for a null count rather than NaN or a string 'null'", () => {
    expect(formatVisitorCount(null)).toBeNull()
  })
})

describe("getPublicVisitorCount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the raw count with no offset applied", async () => {
    selectResolves([{ uniqueVisitors: 8778 }])

    await expect(getPublicVisitorCount()).resolves.toBe(8778)
  })

  it("returns 0 when the table is empty", async () => {
    selectResolves([{ uniqueVisitors: 0 }])

    await expect(getPublicVisitorCount()).resolves.toBe(0)
  })

  it("returns 0 when the query yields no row at all", async () => {
    selectResolves([])

    await expect(getPublicVisitorCount()).resolves.toBe(0)
  })

  it("resolves to null instead of rejecting when the query fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    selectRejects(new Error("connection refused"))

    await expect(getPublicVisitorCount()).resolves.toBeNull()
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
