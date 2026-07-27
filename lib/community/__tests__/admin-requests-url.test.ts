import { describe, expect, it } from "vitest"
import { ADMIN_REQUESTS_PATH, buildAdminRequestsHref } from "../admin-requests-url"

describe("buildAdminRequestsHref", () => {
  it("returns the bare path when nothing is set", () => {
    expect(buildAdminRequestsHref({})).toBe(ADMIN_REQUESTS_PATH)
  })

  it("carries the existing params forward", () => {
    expect(buildAdminRequestsHref({ status: "NEW", q: "irham" })).toBe(
      `${ADMIN_REQUESTS_PATH}?status=NEW&q=irham`
    )
  })

  it("keeps the current filters when only the page moves", () => {
    expect(buildAdminRequestsHref({ status: "NEW", dup: "1" }, { page: "3" })).toBe(
      `${ADMIN_REQUESTS_PATH}?status=NEW&dup=1&page=3`
    )
  })

  // The guard that keeps narrowing a filter from landing on an empty page.
  it("resets the page whenever a filter changes", () => {
    expect(buildAdminRequestsHref({ status: "NEW", page: "40" }, { status: "MATCHED" })).toBe(
      `${ADMIN_REQUESTS_PATH}?status=MATCHED`
    )
    expect(buildAdminRequestsHref({ page: "40" }, { q: "irham" })).toBe(
      `${ADMIN_REQUESTS_PATH}?q=irham`
    )
    expect(buildAdminRequestsHref({ page: "40" }, { dup: "1" })).toBe(
      `${ADMIN_REQUESTS_PATH}?dup=1`
    )
  })

  it("drops a param set to null", () => {
    expect(buildAdminRequestsHref({ status: "NEW", q: "irham" }, { q: null })).toBe(
      `${ADMIN_REQUESTS_PATH}?status=NEW`
    )
  })

  it("treats an empty override as a removal", () => {
    expect(buildAdminRequestsHref({ q: "irham" }, { q: "" })).toBe(ADMIN_REQUESTS_PATH)
  })

  it("omits the redundant page=1", () => {
    expect(buildAdminRequestsHref({ status: "NEW" }, { page: "1" })).toBe(
      `${ADMIN_REQUESTS_PATH}?status=NEW`
    )
  })

  it("uses the first value when a param arrives repeated", () => {
    expect(buildAdminRequestsHref({ status: ["NEW", "MATCHED"] })).toBe(
      `${ADMIN_REQUESTS_PATH}?status=NEW`
    )
  })
})
