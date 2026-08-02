import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PromoWebinar } from "../PromoWebinar"
import { WEBINAR_HEADLINE } from "@/lib/webinar"

/** youtu.be/<id> and img.youtube.com/vi/<id>/... both carry the same video id. */
function videoIdFrom(url: string): string | null {
  return url.match(/youtu\.be\/([\w-]+)/)?.[1] ?? url.match(/\/vi\/([\w-]+)\//)?.[1] ?? null
}

describe("PromoWebinar", () => {
  it("lists the 2 Agustus 2026 webinar recording alongside the earlier ones", () => {
    render(<PromoWebinar />)

    const links = screen.getAllByRole("link")
    const hrefs = links.map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("https://youtu.be/Cv8flQcwTH4")
    // The two recordings that were already published stay listed — the new one
    // is an addition, not a replacement.
    expect(hrefs.some((href) => href?.includes("qkeENfXQg8I"))).toBe(true)
    expect(hrefs.some((href) => href?.includes("zw4s8_KnxKQ"))).toBe(true)
  })

  it("titles the new recording with the campaign headline it was announced under", () => {
    render(<PromoWebinar />)

    const card = screen.getByRole("link", { name: new RegExp(WEBINAR_HEADLINE.slice(0, 24), "i") })
    expect(card).toHaveAttribute("href", "https://youtu.be/Cv8flQcwTH4")
    // The visitor arrived from a campaign carrying this exact wording, so the
    // card has to repeat it rather than paraphrase.
    expect(card.textContent).toContain(WEBINAR_HEADLINE)
  })

  it("opens every recording in a new tab without leaking the opener", () => {
    render(<PromoWebinar />)

    const links = screen.getAllByRole("link")
    expect(links.length).toBeGreaterThanOrEqual(3)
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
      expect(link.getAttribute("rel")).toContain("noreferrer")
    }
  })

  it("points each thumbnail at the same video its link opens", () => {
    // A recording is added by copying the card above it, so the thumbnail keeps
    // the previous video's id while the href moves on. That mismatch is silent
    // in review and obvious to a visitor, who sees the wrong preview image.
    const { container } = render(<PromoWebinar />)

    const cards = container.querySelectorAll("a[href*='youtu.be']")
    expect(cards.length).toBeGreaterThanOrEqual(3)
    for (const card of cards) {
      const href = card.getAttribute("href") ?? ""
      const thumbnail = within(card as HTMLElement).getByRole("img")
      expect(videoIdFrom(thumbnail.getAttribute("src") ?? "")).toBe(videoIdFrom(href))
    }
  })
})
