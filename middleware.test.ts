import { describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  default: () => ({ auth: vi.fn() }),
}))

describe("middleware public route matching", () => {
  it("allows public community page and submit API without login", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/komunitas")).toBe(true)
    expect(isPublicPath("/komunitas/")).toBe(true)
    expect(isPublicPath("/api/community/join")).toBe(true)
  })

  it("keeps dashboard and admin routes protected", async () => {
    const { isPublicPath } = await import("./middleware")

    expect(isPublicPath("/dashboard")).toBe(false)
    expect(isPublicPath("/admin/community-requests")).toBe(false)
  })
})
