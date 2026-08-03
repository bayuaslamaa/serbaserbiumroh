import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SiteFooter } from "../SiteFooter"
import { CONTACT_NUMBERS, SOCIAL_LINKS } from "@/lib/contact"

describe("SiteFooter", () => {
  it("offers both admins, each dialling their own number", () => {
    // Listing one number sends every visitor to the same inbox, which is not
    // how the rest of the site routes people (see the transportasi picker).
    render(<SiteFooter />)

    for (const contact of CONTACT_NUMBERS) {
      const link = screen.getByRole("link", { name: new RegExp(contact.name) })
      expect(link.getAttribute("href")).toBe(`https://wa.me/${contact.number}`)
    }
  })

  it("shows each number in readable form alongside whose it is", () => {
    render(<SiteFooter />)

    expect(screen.getByText(/\+62 851-6113-4844/).textContent).toContain("(Nurul)")
    expect(screen.getByText(/\+62 851-7211-7757/).textContent).toContain("(Bayu)")
  })

  it("links every social badge and names it for screen readers", () => {
    // The visible mark is two letters, which reads as nothing useful when
    // announced, so the accessible name has to come from the label.
    render(<SiteFooter />)

    for (const social of SOCIAL_LINKS) {
      const link = screen.getByRole("link", { name: social.label })
      expect(link.getAttribute("href")).toBe(social.href)
    }
  })

  it("opens every outbound link in a new tab without leaking the opener", () => {
    const { container } = render(<SiteFooter />)

    const outbound = container.querySelectorAll('a[href^="http"]')
    expect(outbound.length).toBe(CONTACT_NUMBERS.length + SOCIAL_LINKS.length)
    for (const link of outbound) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toContain("noopener")
      expect(link.getAttribute("rel")).toContain("noreferrer")
    }
  })

  it("carries the secondary navigation the site had nowhere else", () => {
    const { container } = render(<SiteFooter />)

    for (const href of ["/panduan", "/cerita-jamaah", "/komunitas", "/faq", "/layanan"]) {
      expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull()
    }
  })

  it("groups the columns under their own headings", () => {
    render(<SiteFooter />)

    const services = screen.getByRole("navigation", { name: "Layanan" })
    expect(within(services).getByRole("link", { name: /Badalin/ })).toBeDefined()
    expect(within(services).queryByRole("link", { name: "FAQ" })).toBeNull()
  })

  it("introduces no heading, so it cannot disturb a page's heading outline", () => {
    // The footer renders below every public page, including ones whose H1/H2
    // order is asserted elsewhere.
    const { container } = render(<SiteFooter />)

    expect(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).toHaveLength(0)
  })
})
