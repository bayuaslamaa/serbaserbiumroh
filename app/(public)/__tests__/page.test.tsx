import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    })),
  },
}))

vi.mock("@/lib/stats/visitor-count", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stats/visitor-count")>()
  return { ...actual, getPublicVisitorCount: vi.fn() }
})

import { auth } from "@/auth"
import { getPublicVisitorCount } from "@/lib/stats/visitor-count"
import HomePage from "../page"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockCount = getPublicVisitorCount as ReturnType<typeof vi.fn>

afterEach(() => {
  mockAuth.mockReset()
  mockCount.mockReset()
})

describe("HomePage", () => {
  it("renders the community figures in the hero for a resolved count", async () => {
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)

    render(await HomePage())

    expect(screen.getByRole("heading", { name: "Serba Serbi Umroh" })).toBeDefined()
    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
  })

  it("still renders the homepage when the count is unreadable", async () => {
    // R9 at the page level: the hero degrades to the static figures rather
    // than the route failing.
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(null)

    render(await HomePage())

    expect(screen.getByRole("heading", { name: "Serba Serbi Umroh" })).toBeDefined()
    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.queryByText(/Pengunjung/)).toBeNull()
  })
})
