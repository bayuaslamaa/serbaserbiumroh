import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { memberLinks, moreLinks } from "../links"
import { MoreMenu } from "../MoreMenu"

const onToggle = vi.fn()
const onNavigate = vi.fn()

function renderMenu(props: Partial<Parameters<typeof MoreMenu>[0]> = {}) {
  return render(
    <MoreMenu
      isOpen
      isLoggedIn={false}
      onToggle={onToggle}
      onNavigate={onNavigate}
      {...props}
    />
  )
}

describe("MoreMenu", () => {
  it("keeps the panel closed until it is opened", () => {
    renderMenu({ isOpen: false })

    expect(screen.getByRole("button", { name: /Lainnya/ })).toBeDefined()
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("renders every public destination whether or not there is a session", () => {
    renderMenu()

    for (const link of moreLinks) {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href
      )
    }
  })

  it("renders the member-only destinations for a signed-in user", () => {
    renderMenu({ isLoggedIn: true })

    expect(memberLinks.length).toBeGreaterThan(0)
    for (const link of memberLinks) {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href
      )
    }
    expect(screen.getByRole("link", { name: "Pricelist Hotel" })).toHaveAttribute(
      "href",
      "/pricelist-hotel"
    )
  })

  it("omits the member-only destinations for an anonymous visitor", () => {
    // These hrefs sit outside isPublicPath, so rendering one without a session
    // is not a harmless extra link -- it is a login-wall dead end in the
    // public nav.
    renderMenu({ isLoggedIn: false })

    for (const link of memberLinks) {
      expect(
        screen.queryByRole("link", { name: link.label }),
        `${link.href} must not be linked without a session`
      ).toBeNull()
    }
  })
})
