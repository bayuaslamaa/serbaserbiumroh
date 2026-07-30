import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WebinarComingSoonBanner } from "../WebinarComingSoonBanner"
import {
  WEBINAR_DATE_LABEL,
  WEBINAR_HEADLINE,
  WEBINAR_PATH,
  WEBINAR_STARTS_AT,
  WEBINAR_TIME_LABEL,
} from "@/lib/webinar"

describe("WebinarComingSoonBanner", () => {
  it("announces the free webinar with its schedule", () => {
    render(<WebinarComingSoonBanner />)

    expect(screen.getByText(/webinar gratis/i)).toBeInTheDocument()
    // The headline is one paragraph with its closing clause wrapped in a gold
    // span, so match on the paragraph's full text rather than a text node.
    expect(
      screen.getByText(
        (_, element) => element?.tagName === "P" && element.textContent === WEBINAR_HEADLINE
      )
    ).toBeInTheDocument()
    expect(screen.getByText(WEBINAR_DATE_LABEL)).toBeInTheDocument()
    expect(screen.getByText(WEBINAR_TIME_LABEL)).toBeInTheDocument()
  })

  it("warns in words that the RSVP link is login-gated", () => {
    render(<WebinarComingSoonBanner />)

    // Asserted as literal visible text, with colour and the status dot ignored:
    // a visitor must learn the RSVP link needs an account before they click
    // through, not after. Wording matches the webinar page's "Akses RSVP" row.
    expect(screen.getByText(/khusus user yang sudah login/i)).toBeInTheDocument()
  })

  it("exposes exactly one interactive control: the registration link", () => {
    const { container } = render(<WebinarComingSoonBanner />)

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    // The banner must send visitors to the webinar page, never straight to
    // WEBINAR_RSVP_URL: that env var is server-side and the page is what
    // branches on login and on the URL being unset.
    expect(links[0]).toHaveAttribute("href", WEBINAR_PATH)

    // Two complementary checks. The role queries cover controls exposed to
    // assistive tech, but they only see elements whose accessible name is
    // computed, so on their own they would pass for an <a> without href, a bare
    // <form>, or a click-handler <div>. The selector sweep below is the one that
    // catches those: it looks for the affordance itself, not the ARIA role.
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.queryAllByRole("textbox")).toHaveLength(0)
    expect(screen.queryAllByRole("form")).toHaveLength(0)

    const interactive = container.querySelectorAll(
      'a, button, form, input, select, textarea, summary, [onclick], [tabindex], [role="button"], [role="link"], .cursor-pointer'
    )
    expect(interactive).toHaveLength(1)
    expect(interactive[0]).toBe(links[0])
  })

  it("is still announcing a future event", () => {
    // Red here means the webinar has passed. The fix is to update or remove the
    // banner — never to relax this assertion. The homepage's first above-the-fold
    // content would otherwise keep inviting registrations to an event that
    // already happened.
    expect(WEBINAR_STARTS_AT.getTime()).toBeGreaterThan(Date.now())
  })

  it("renders no heading, so it cannot displace the page H1 it sits above", () => {
    const { container } = render(<WebinarComingSoonBanner />)

    expect(screen.queryAllByRole("heading")).toHaveLength(0)
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(0)
  })

  it("is a labelled region so the announcement is findable out of the hero flow", () => {
    render(<WebinarComingSoonBanner />)

    expect(screen.getByRole("region", { name: "Pengumuman webinar" })).toBeInTheDocument()
  })
})
