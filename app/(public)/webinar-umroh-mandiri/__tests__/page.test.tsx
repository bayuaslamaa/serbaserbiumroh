import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

import { auth } from "@/auth"
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

    expect(screen.getByText("Ahad, 14 Juni 2026")).toBeInTheDocument()
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

    expect(screen.getByText("Ahad, 14 Juni 2026")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "RSVP Sekarang" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Masuk untuk RSVP" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Fwebinar-umroh-mandiri"
    )
    expect(screen.queryByText("https://example.com/rsvp")).not.toBeInTheDocument()
  })

  it("shows unavailable state for logged-in users when RSVP URL is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } })
    delete process.env.WEBINAR_RSVP_URL

    render(await WebinarUmrohMandiriPage())

    expect(screen.getByText(/Link RSVP belum tersedia/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "RSVP Sekarang" })).not.toBeInTheDocument()
  })
})
