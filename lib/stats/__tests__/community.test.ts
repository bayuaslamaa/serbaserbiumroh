import { describe, expect, it } from "vitest"
import {
  COMMUNITY_SIZE,
  PILGRIMS_HELPED,
  VISITOR_BASELINE_OFFSET,
  formatVisitorCount,
} from "../community"

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

  it("stays free of any database import", async () => {
    // The navbar renders these from a client component. Pulling the db in
    // here drags `pg` into the client bundle and the build fails on `fs`.
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../community.ts", import.meta.url), "utf8")
    )

    expect(source).not.toMatch(/from ["']@\/lib\/db/)
    expect(source).not.toMatch(/drizzle-orm/)
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
