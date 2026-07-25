import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockPathname = vi.fn(() => "/")

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}))

import { MobileMenu } from "../MobileMenu"

const signOutAction = vi.fn(async () => {})

function renderMenu(props: Partial<Parameters<typeof MobileMenu>[0]> = {}) {
  return render(
    <MobileMenu
      isLoggedIn
      isAdmin={false}
      showAdmin={false}
      userEmail="test@example.com"
      signOutAction={signOutAction}
      {...props}
    />
  )
}

function openOverlay() {
  fireEvent.click(screen.getByRole("button", { name: "Buka menu" }))
}

afterEach(() => {
  document.body.style.overflow = ""
  mockPathname.mockReturnValue("/")
  vi.clearAllMocks()
})

describe("MobileMenu bar", () => {
  it("exposes an accessible hamburger and keeps the overlay closed", () => {
    renderMenu()

    expect(screen.getByRole("button", { name: "Buka menu" })).toBeDefined()
    expect(screen.queryByRole("button", { name: "Tutup menu" })).toBeNull()
    expect(screen.queryByText("JELAJAHI")).toBeNull()
  })

  it("renders the brand as type, never as an image", () => {
    const { container } = renderMenu()

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("SSU")).toBeDefined()
  })
})

describe("MobileMenu overlay", () => {
  it("locks body scroll while open and restores it on close", () => {
    renderMenu()

    openOverlay()
    expect(document.body.style.overflow).toBe("hidden")

    fireEvent.click(screen.getByRole("button", { name: "Tutup menu" }))
    expect(document.body.style.overflow).toBe("unset")
  })

  it("restores body scroll when unmounted while open", () => {
    const { unmount } = renderMenu()

    openOverlay()
    expect(document.body.style.overflow).toBe("hidden")

    unmount()
    expect(document.body.style.overflow).toBe("unset")
  })

  it("renders every catalog service under LAYANAN with one BARU badge", () => {
    renderMenu()
    openOverlay()

    expect(screen.getByText("LAYANAN")).toBeDefined()
    for (const name of [
      "Visa Umroh",
      "Badalin — Badal Umroh",
      "Sewa Transportasi",
      "Booking Hotel",
      "Booking HHR",
      "Muthowwif",
    ]) {
      expect(screen.getByText(name)).toBeDefined()
    }
    expect(screen.getAllByText("BARU")).toHaveLength(1)
    expect(screen.getByRole("link", { name: /Lihat semua/ })).toHaveAttribute(
      "href",
      "/layanan"
    )
  })

  it("renders every secondary destination under JELAJAHI", () => {
    renderMenu()
    openOverlay()

    const expected = [
      ["Panduan", "/panduan"],
      ["Cerita Jamaah", "/cerita-jamaah"],
      ["Hotel Nusuk", "/hotel-nusuk"],
      ["Komunitas", "/komunitas"],
      ["Webinar", "/webinar-umroh-mandiri"],
      ["FAQ", "/faq"],
    ]
    for (const [label, href] of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href)
    }
  })

  it("closes when a link is activated", () => {
    renderMenu()
    openOverlay()

    fireEvent.click(screen.getByRole("link", { name: "Panduan" }))
    expect(screen.queryByText("JELAJAHI")).toBeNull()
    expect(document.body.style.overflow).toBe("unset")
  })

  it("exposes dialog semantics so assistive tech treats it as modal", () => {
    renderMenu()
    openOverlay()

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-label")
  })

  it("closes on Escape, matching the desktop menus", () => {
    renderMenu()
    openOverlay()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.body.style.overflow).toBe("unset")
  })

  it("closes on a route change that did not come from its own links", () => {
    const { rerender } = renderMenu()
    openOverlay()
    expect(screen.getByRole("dialog")).toBeDefined()

    // Browser back/forward: the pathname changes with no click on the overlay.
    mockPathname.mockReturnValue("/panduan")
    rerender(
      <MobileMenu
        isLoggedIn
        isAdmin={false}
        showAdmin={false}
        userEmail="test@example.com"
        signOutAction={signOutAction}
      />
    )

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.body.style.overflow).toBe("unset")
  })

  it("moves focus to the close button on open and back to the hamburger on close", () => {
    renderMenu()
    openOverlay()
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Tutup menu" })
    )

    fireEvent.click(screen.getByRole("button", { name: "Tutup menu" }))
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Buka menu" })
    )
  })

  it("collapses the admin group when the overlay is reopened", () => {
    renderMenu({ showAdmin: true, isAdmin: true })
    openOverlay()
    fireEvent.click(screen.getByRole("button", { name: /Panel Admin/ }))
    expect(screen.getByRole("link", { name: "Kelola Harga" })).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Tutup menu" }))
    openOverlay()

    expect(screen.queryByRole("link", { name: "Kelola Harga" })).toBeNull()
  })
})

describe("MobileMenu account section", () => {
  it("shows Dashboard and Keluar for a signed-in user and hides the admin group", () => {
    renderMenu()
    openOverlay()

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    )
    expect(screen.getByRole("button", { name: "Keluar" })).toBeDefined()
    expect(screen.queryByRole("button", { name: /Panel Admin/ })).toBeNull()
  })

  it("shows Masuk instead of the account rows when signed out", () => {
    renderMenu({ isLoggedIn: false, userEmail: null })
    openOverlay()

    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute(
      "href",
      "/login"
    )
    expect(screen.queryByRole("button", { name: "Keluar" })).toBeNull()
  })

  it("exposes every admin sub-page for an admin", () => {
    renderMenu({ showAdmin: true, isAdmin: true })
    openOverlay()
    fireEvent.click(screen.getByRole("button", { name: /Panel Admin/ }))

    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"))
    for (const href of [
      "/admin/pricing",
      "/admin/users",
      "/admin/community-requests",
      "/admin/content/stories",
      "/admin/content/hotels",
      "/admin/content/faqs",
      "/admin/visitor-stats",
    ]) {
      expect(hrefs).toContain(href)
    }
  })
})

describe("MobileMenu Buat Estimasi gating", () => {
  it("disables both CTAs for a non-admin", () => {
    renderMenu({ isAdmin: false })

    expect(screen.getByRole("button", { name: /Buat Estimasi/ })).toBeDisabled()

    openOverlay()
    const ctas = screen.getAllByRole("button", { name: /Buat Estimasi/ })
    expect(ctas).toHaveLength(2)
    for (const cta of ctas) expect(cta).toBeDisabled()
    expect(screen.queryByRole("link", { name: /Buat Estimasi/ })).toBeNull()
  })

  it("links both CTAs to the estimator for an admin", () => {
    renderMenu({ isAdmin: true })
    openOverlay()

    const ctas = screen.getAllByRole("link", { name: /Buat Estimasi/ })
    expect(ctas).toHaveLength(2)
    for (const cta of ctas) expect(cta).toHaveAttribute("href", "/estimate/new")
  })
})
