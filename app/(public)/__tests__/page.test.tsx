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

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
  })

  it("still renders the homepage when the count is unreadable", async () => {
    // R9 at the page level: the hero degrades to the static figures rather
    // than the route failing.
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(null)

    render(await HomePage())

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByText(/3\.500\+ Komunitas/)).toBeDefined()
    expect(screen.queryByText(/Pengunjung/)).toBeNull()
  })

  it("keeps the page H1 as the first heading in the document", async () => {
    // The subtree tests in HeroSection.test.tsx cannot see a heading added by the
    // layout or prepended as a sibling of HeroSection. The webinar banner sets the
    // precedent that announcements go at the top, so that is the likely next change.
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)

    const { container } = render(await HomePage())
    const headings = container.querySelectorAll("h1,h2,h3,h4,h5,h6")

    expect(headings[0]?.tagName).toBe("H1")
  })
})
