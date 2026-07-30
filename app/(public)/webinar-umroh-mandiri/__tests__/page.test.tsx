import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

import { auth } from "@/auth"
import { WEBINAR_DATE_LABEL, WEBINAR_TIME_LABEL } from "@/lib/webinar"
import WebinarUmrohMandiriPage from "../page"

const mockAuth = auth as ReturnType<typeof vi.fn>
const originalRsvpUrl = process.env.WEBINAR_RSVP_URL

afterEach(() => {
  mockAuth.mockReset()
  if (originalRsvpUrl === undefined) {
    delete process.env.WEBINAR_RSVP_URL
  } else {
    process.env.WEBINAR_RSVP_URL = originalRsvpUrl
  }
})

describe("WebinarUmrohMandiriPage", () => {
  it("shows RSVP link for logged-in users when configured", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } })
    process.env.WEBINAR_RSVP_URL = "https://example.com/rsvp"

    render(await WebinarUmrohMandiriPage())

    // Read from lib/webinar, not a copy of the string: the duplicated literal
    // is exactly what let this assertion drift three event dates behind the page.
    expect(screen.getByText(WEBINAR_DATE_LABEL)).toBeInTheDocument()
    expect(screen.getByText(WEBINAR_TIME_LABEL)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "RSVP Sekarang" })).toHaveAttribute(
      "href",
      "https://example.com/rsvp"
    )
    expect(screen.queryByRole("link", { name: "Masuk untuk RSVP" })).not.toBeInTheDocument()
  })

  it("hides RSVP link from anonymous visitors and keeps callback URL", async () => {
    mockAuth.mockResolvedValue(null)
    process.env.WEBINAR_RSVP_URL = "https://example.com/rsvp"

    render(await WebinarUmrohMandiriPage())

    expect(screen.getByText(WEBINAR_DATE_LABEL)).toBeInTheDocument()
    expect(screen.getByText(WEBINAR_TIME_LABEL)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "RSVP Sekarang" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Masuk untuk RSVP" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Fwebinar-umroh-mandiri"
    )
    expect(screen.queryByText("https://example.com/rsvp")).not.toBeInTheDocument()
  })

  // The env var is deploy config today, but the href guard belongs with the
  // render: the day this value becomes admin- or DB-editable, an unguarded href
  // is a stored `javascript:` link on a logged-in page.
  it.each(["javascript:alert(1)", "http://example.com/rsvp", "/rsvp", "example.com/rsvp"])(
    "treats a non-https RSVP URL (%s) as unavailable rather than rendering it",
    async (configured) => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } })
      process.env.WEBINAR_RSVP_URL = configured

      render(await WebinarUmrohMandiriPage())

      expect(screen.getByText(/Link RSVP belum tersedia/)).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "RSVP Sekarang" })).not.toBeInTheDocument()
    }
  )

  it("shows unavailable state for logged-in users when RSVP URL is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } })
    delete process.env.WEBINAR_RSVP_URL

    render(await WebinarUmrohMandiriPage())

    expect(screen.getByText(/Link RSVP belum tersedia/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "RSVP Sekarang" })).not.toBeInTheDocument()
  })
})
