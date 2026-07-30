import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WebinarComingSoonBanner } from "../WebinarComingSoonBanner"

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
    render(<WebinarComingSoonBanner />)

    // Querying by role is what actually proves non-interactivity: a disabled
    // button or a dead link would still surface here.
    expect(screen.queryAllByRole("link")).toHaveLength(0)
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.queryAllByRole("textbox")).toHaveLength(0)
    expect(screen.queryAllByRole("form")).toHaveLength(0)
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
