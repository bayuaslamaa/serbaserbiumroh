import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HeroSection } from "../HeroSection"
import { COMMUNITY_SIZE } from "@/lib/stats/community"

describe("HeroSection", () => {
  it("renders the heading, the community figures, and the calls to action together", () => {
    render(<HeroSection visitorCount={8778} />)

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    // The figures render as one sentence with each number in its own element,
    // so match the enclosing text rather than a single node.
    expect(screen.getByText(COMMUNITY_SIZE).parentElement?.textContent).toContain("Komunitas")
    expect(screen.getByText("8.878+").parentElement?.textContent).toContain("Pengunjung")
    expect(screen.getByRole("link", { name: /Pelajari Panduan Umroh/ })).toBeDefined()
    expect(screen.getByRole("link", { name: "Lihat Cerita Jamaah" })).toBeDefined()
  })

  it("leads with one primary action and keeps the figures beneath it", () => {
    // The figures are corroboration, not the ask. Sitting between the copy and
    // the buttons, they pushed the only thing worth clicking below three lines
    // of numbers.
    const { container } = render(<HeroSection visitorCount={8778} />)

    const text = container.textContent ?? ""
    const copyAt = text.indexOf("Rencanakan perjalanan umroh mandiri")
    const ctaAt = text.indexOf("Pelajari Panduan Umroh")
    const statsAt = text.indexOf(COMMUNITY_SIZE)

    expect(copyAt).toBeGreaterThanOrEqual(0)
    expect(ctaAt).toBeGreaterThan(copyAt)
    expect(statsAt).toBeGreaterThan(ctaAt)
  })

  it("still renders heading and buttons when the visitor count is unavailable", () => {
    render(<HeroSection visitorCount={null} />)

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByRole("link", { name: /Pelajari Panduan Umroh/ })).toBeDefined()
    expect(screen.queryByText(/Pengunjung/)).toBeNull()
  })

  it("spends the H1 on search intent rather than repeating the brand", () => {
    render(<HeroSection visitorCount={1} />)

    // The brand already appears in the navbar, the logo, and every page title
    // via title.template. An H1 that is only the brand wastes the strongest
    // on-page signal the homepage has.
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.textContent).not.toBe("Serba Serbi Umroh")
    expect(heading.textContent?.toLowerCase()).toContain("umroh mandiri")
  })

  it("no longer invites RSVPs to the webinar that has already run", () => {
    // The 2 Agustus 2026 session has happened. Registration copy above the fold
    // would send visitors to a closed RSVP; the recording lives in PromoWebinar
    // further down the page instead.
    const { container } = render(<HeroSection visitorCount={8778} />)

    expect(screen.queryByRole("region", { name: "Pengumuman webinar" })).toBeNull()
    expect(screen.queryByRole("link", { name: /RSVP/i })).toBeNull()
    expect(screen.queryByRole("link", { name: /daftar sekarang/i })).toBeNull()
    expect(container.querySelector('a[href*="webinar"]')).toBeNull()
    expect(container.textContent).not.toContain("Jangan Nekat Umroh Mandiri")
  })

  it("opens on the page H1", () => {
    // Nothing above the H1 may introduce a heading of its own — the hero's first
    // heading is the page's strongest on-page signal.
    render(<HeroSection visitorCount={8778} />)

    const headings = screen.getAllByRole("heading")
    expect(headings[0]).toBe(screen.getByRole("heading", { level: 1 }))
    expect(headings[0].textContent).toContain("Panduan Umroh Mandiri")
  })

  it("offers no estimator control, pressable or otherwise", () => {
    // For everyone but an admin the estimator rendered here as a disabled
    // button, spending a third of the page's main action row on something
    // nobody could press. Its home is the navigation grid now, where an
    // unreleased feature reads as one entry on a map.
    const { container } = render(<HeroSection visitorCount={1} />)

    expect(screen.queryByRole("link", { name: /Estimasi/i })).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(container.textContent).not.toContain("Coming Soon")
  })

  it("keeps the action row to two links so the primary one stays primary", () => {
    const { container } = render(<HeroSection visitorCount={8778} />)

    expect(container.querySelectorAll("a")).toHaveLength(2)
  })
})
