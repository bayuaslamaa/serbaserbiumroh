import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WEBINAR_STARTS_AT, WebinarComingSoonBanner } from "../WebinarComingSoonBanner"

describe("WebinarComingSoonBanner", () => {
  it("announces the free webinar with its schedule and coming-soon state", () => {
    render(<WebinarComingSoonBanner />)

    expect(screen.getByText(/webinar gratis/i)).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    // The headline is one paragraph with its closing clause wrapped in a gold
    // span, so match on the paragraph's full text rather than a text node.
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent === "Jangan Nekat Umroh Mandiri Sebelum Tahu Risiko Ini!"
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Ahad, 2 Agustus 2026")).toBeInTheDocument()
    expect(screen.getByText("09.00 WIB")).toBeInTheDocument()
  })

  it("states in words that registration will open soon", () => {
    render(<WebinarComingSoonBanner />)

    // The state must survive with colour and the status dot ignored, so it is
    // asserted as literal visible text rather than as a style.
    expect(screen.getByText(/Pendaftaran segera dibuka/)).toBeInTheDocument()
  })

  it("exposes no interactive control while registration is closed", () => {
    const { container } = render(<WebinarComingSoonBanner />)

    // Two complementary checks. The role queries cover controls that are
    // exposed to assistive tech — a disabled button or a dead link still
    // surfaces here — but they only see elements whose accessible name is
    // computed, so on their own they miss an <a> without href, a bare <form>,
    // or a click-handler <div>. The selector sweep below is the one that
    // catches those: it looks for the affordance itself, not the ARIA role.
    expect(screen.queryAllByRole("link")).toHaveLength(0)
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.queryAllByRole("textbox")).toHaveLength(0)
    expect(screen.queryAllByRole("form")).toHaveLength(0)

    expect(
      container.querySelectorAll(
        'a, button, form, input, select, textarea, summary, [onclick], [tabindex], [role="button"], [role="link"], .cursor-pointer'
      )
    ).toHaveLength(0)
  })

  it("is still announcing a future event", () => {
    // Red here means the webinar has passed. The fix is to update or remove the
    // banner — never to relax this assertion. The homepage's first above-the-fold
    // content would otherwise keep saying "Pendaftaran segera dibuka" for an event
    // that already happened.
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
