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

  it("shows the estimate link only for an admin", () => {
    const { rerender } = render(<HeroSection visitorCount={1} />)
    expect(screen.queryByRole("link", { name: /Buat Estimasi/ })).toBeNull()

    rerender(<HeroSection visitorCount={1} isAdmin />)
    expect(screen.getByRole("link", { name: /Buat Estimasi/ })).toBeDefined()
  })
})
