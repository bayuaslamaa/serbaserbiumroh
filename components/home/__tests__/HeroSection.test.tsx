import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HeroSection } from "../HeroSection"
import { COMMUNITY_SIZE } from "@/lib/stats/community"

describe("HeroSection", () => {
  it("renders the heading, the community figures, and the calls to action together", () => {
    render(<HeroSection visitorCount={8778} />)

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByText(`${COMMUNITY_SIZE} Komunitas`)).toBeDefined()
    expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
    expect(screen.getByRole("link", { name: "Lihat Cerita Jamaah" })).toBeDefined()
    expect(screen.getByRole("link", { name: "Gabung Komunitas" })).toBeDefined()
    expect(screen.getByRole("link", { name: "RSVP Webinar" })).toBeDefined()
  })

  it("places the figures between the descriptive copy and the first button", () => {
    const { container } = render(<HeroSection visitorCount={8778} />)

    const text = container.textContent ?? ""
    const copyAt = text.indexOf("Rencanakan perjalanan umroh mandiri")
    const statsAt = text.indexOf(COMMUNITY_SIZE)
    const ctaAt = text.indexOf("Lihat Cerita Jamaah")

    expect(copyAt).toBeGreaterThanOrEqual(0)
    expect(statsAt).toBeGreaterThan(copyAt)
    expect(ctaAt).toBeGreaterThan(statsAt)
  })

  it("still renders heading and buttons when the visitor count is unavailable", () => {
    render(<HeroSection visitorCount={null} />)

    expect(screen.getByRole("heading", { name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(screen.getByRole("link", { name: "Lihat Cerita Jamaah" })).toBeDefined()
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

  it("announces the webinar before the page heading", () => {
    const { container } = render(<HeroSection visitorCount={8778} />)

    const banner = screen.getByRole("region", { name: "Pengumuman webinar" })
    const heading = screen.getByRole("heading", { level: 1 })

    expect(container.contains(banner)).toBe(true)
    // DOCUMENT_POSITION_FOLLOWING: the H1 comes after the banner.
    expect(banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const text = container.textContent ?? ""
    expect(text.indexOf("Jangan Nekat Umroh Mandiri")).toBeGreaterThanOrEqual(0)
    expect(text.indexOf("Panduan Umroh Mandiri")).toBeGreaterThan(
      text.indexOf("Jangan Nekat Umroh Mandiri"),
    )
  })

  it("keeps the page H1 as the first heading even with the announcement above it", () => {
    // The banner's campaign line is deliberately a <p>. If a later refactor
    // "tidies" it into an h2, the hero would open on a heading that is not the
    // page H1 — the accessibility cost this assertion exists to catch.
    render(<HeroSection visitorCount={8778} />)

    const headings = screen.getAllByRole("heading")
    expect(headings[0]).toBe(screen.getByRole("heading", { level: 1 }))
    expect(headings[0].textContent).toContain("Panduan Umroh Mandiri")
  })

  // The hero is text-center; the banner is text-left, and that only holds while the alignment sits
  // on the banner's outermost element. Move it to an inner column and the hero's centring inherits
  // straight through — silently centring the pills, headline, and schedule. jsdom can't compute
  // that, so pin the class: it's the cheap guard on the one break a className tidy would cause.
  it("keeps the announcement left-aligned inside the centred hero", () => {
    render(<HeroSection visitorCount={8778} />)

    const banner = screen.getByRole("region", { name: "Pengumuman webinar" })
    expect(banner).toHaveClass("text-left")
  })

  it("shows the estimate link only for an admin", () => {
    const { rerender } = render(<HeroSection visitorCount={1} />)
    expect(screen.queryByRole("link", { name: /Buat Estimasi/ })).toBeNull()

    rerender(<HeroSection visitorCount={1} isAdmin />)
    expect(screen.getByRole("link", { name: /Buat Estimasi/ })).toBeDefined()
  })
})
