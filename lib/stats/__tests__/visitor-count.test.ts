import { beforeEach, describe, expect, it, vi } from "vitest"

// unstable_cache wraps the read; make it a pass-through so the test exercises
// the query, not Next's cache machinery — but keep the spy so the cache key
// and TTL it was configured with can still be asserted.
const unstableCacheSpy = vi.hoisted(() => vi.fn((fn: unknown) => fn))

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheSpy,
}))

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/lib/db"
import { getPublicVisitorCount } from "../visitor-count"

const mockSelect = db.select as ReturnType<typeof vi.fn>

/** db.select({...}).from(table) resolves to the row array. */
function selectResolves(rows: unknown) {
  mockSelect.mockReturnValue({ from: vi.fn().mockResolvedValue(rows) })
}

function selectRejects(error: Error) {
  mockSelect.mockReturnValue({ from: vi.fn().mockRejectedValue(error) })
}

describe("getPublicVisitorCount", () => {
  beforeEach(() => {
    // Only the db spy — unstable_cache was called once at import time, and
    // clearing it would erase the config these tests assert against.
    mockSelect.mockReset()
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

  it("keeps the failure OUTSIDE the cache so a blip is not memoized", async () => {
    // The cached function must reject on failure — unstable_cache stores what
    // its callback resolves to, so a caught null in there would blank the
    // figure for the whole TTL on every page sharing the key.
    const cachedFn = unstableCacheSpy.mock.calls[0][0] as () => Promise<number>
    selectRejects(new Error("connection refused"))

    await expect(cachedFn()).rejects.toThrow("connection refused")
  })

  it("configures the cache with a stable key and a 60 second window", () => {
    const [, keyParts, options] = unstableCacheSpy.mock.calls[0] as [
      unknown,
      string[],
      { revalidate: number },
    ]

    expect(keyParts).toEqual(["public-visitor-count"])
    expect(options.revalidate).toBe(60)
  })
})
