import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/auth", () => ({ auth: vi.fn() }))

const limit = vi.fn().mockResolvedValue([])

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit })),
        })),
      })),
    })),
  },
}))

vi.mock("@/lib/stats/visitor-count", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stats/visitor-count")>()
  return { ...actual, getPublicVisitorCount: vi.fn() }
})

import { auth } from "@/auth"
import { COMMUNITY_SIZE } from "@/lib/stats/community"
import { getPublicVisitorCount } from "@/lib/stats/visitor-count"
import HomePage from "../page"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockCount = getPublicVisitorCount as ReturnType<typeof vi.fn>

afterEach(() => {
  mockAuth.mockReset()
  mockCount.mockReset()
  limit.mockReset()
  limit.mockResolvedValue([])
})

/** Section headings in the order the document presents them. */
function headingTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(
    (heading) => heading.textContent ?? ""
  )
}

describe("HomePage", () => {
  it("renders the community figures in the hero for a resolved count", async () => {
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)

    render(await HomePage())

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByText(COMMUNITY_SIZE).parentElement?.textContent).toContain("Komunitas")
    expect(screen.getByText("8.878+").parentElement?.textContent).toContain("Pengunjung")
  })

  it("still renders the homepage when the count is unreadable", async () => {
    // R9 at the page level: the hero degrades to the static figures rather
    // than the route failing.
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(null)

    render(await HomePage())

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByText(COMMUNITY_SIZE).parentElement?.textContent).toContain("Komunitas")
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

  it("puts the site map ahead of the webinar archive", async () => {
    // The archive is a record of sessions that already ran. As the loudest
    // block directly under the hero it outshouted the grid that tells a first
    // visitor what the site is for.
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)

    const { container } = render(await HomePage())
    const headings = headingTexts(container)

    const gridAt = headings.findIndex((text) => text.includes("Mulai Perencanaan"))
    const archiveAt = headings.findIndex((text) => text.includes("Rekaman Webinar"))

    expect(gridAt).toBeGreaterThanOrEqual(0)
    expect(archiveAt).toBeGreaterThan(gridAt)
  })

  it("offers a route to the paid services, which only the navbar used to carry", async () => {
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)

    const { container } = render(await HomePage())

    expect(container.querySelector('a[href="/layanan"]')).not.toBeNull()
  })

  it("closes the page even when no story is featured", async () => {
    // FeaturedStories renders nothing without a featured story, so without the
    // CTA band the homepage ended mid-grid with no ending at all.
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)
    limit.mockResolvedValue([])

    const { container } = render(await HomePage())

    expect(screen.queryByText(/Berapa Biaya Riil/)).toBeNull()
    expect(screen.getByText("Masih bingung mulai dari mana?")).toBeDefined()
    expect(container.querySelector('a[href*="wa.me"]')).not.toBeNull()
  })

  it("leads a featured story with its cost per person", async () => {
    mockAuth.mockResolvedValue(null)
    mockCount.mockResolvedValue(8778)
    limit.mockResolvedValue([
      {
        id: "story-1",
        slug: "umroh-berdua-maret",
        authorName: "Zahra Shafiyah",
        departureCity: "Jakarta",
        travelMonth: 3,
        travelYear: 2026,
        pax: 2,
        hotelTier: "ECONOMY",
        makkahNights: 5,
        madinahNights: 4,
        totalBudgetIdr: 54_800_000,
      },
    ])

    render(await HomePage())

    // 54,8 jt for two, so 27,4 jt each — the per-person figure, not the total.
    expect(screen.getByText("Rp 27,4 jt")).toBeDefined()
    expect(screen.queryByText("Rp 54,8 jt")).toBeNull()
    expect(screen.getByText("Zahra Shafiyah")).toBeDefined()
  })

  it("shows the estimator as unreleased to a visitor and reachable to an admin", async () => {
    mockCount.mockResolvedValue(8778)

    mockAuth.mockResolvedValue(null)
    const visitor = render(await HomePage())
    expect(visitor.container.querySelector('a[href="/estimate/new"]')).toBeNull()
    expect(visitor.getByText("SEGERA")).toBeDefined()
    visitor.unmount()

    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    const admin = render(await HomePage())
    expect(admin.container.querySelector('a[href="/estimate/new"]')).not.toBeNull()
    expect(admin.queryByText("SEGERA")).toBeNull()
  })
})
