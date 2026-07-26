import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock @/auth before importing NavBar
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}))

// Keep the nav's visitor read off the real database.
vi.mock("@/lib/stats/visitor-count", () => ({
  getPublicVisitorCount: vi.fn(),
}))

import { auth } from "@/auth"
import { services } from "@/lib/services/catalog"
import { getPublicVisitorCount } from "@/lib/stats/visitor-count"
import { COMMUNITY_SIZE, PILGRIMS_HELPED } from "@/lib/stats/community"
import { NavBar } from "../NavBar"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockVisitorCount = getPublicVisitorCount as ReturnType<typeof vi.fn>

/** The desktop bar and the mobile bar both render; scope queries to one. */
function desktop() {
  return within(screen.getByTestId("desktop-nav"))
}

async function renderNav(
  session: unknown = null,
  props: { isAdmin?: boolean } = {},
  visitorCount: number | null = 8778
) {
  mockAuth.mockResolvedValue(session)
  mockVisitorCount.mockResolvedValue(visitorCount)
  return render(await NavBar(props))
}

const adminSession = {
  user: { name: "Admin SSU", email: "admin@example.com", role: "ADMIN" },
}
const userSession = {
  user: { name: "Bayu Aslama", email: "test@example.com", role: "USER" },
}

describe("NavBar structure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the nav landmark for an anonymous visitor", async () => {
    await renderNav(null)
    expect(screen.getByRole("navigation")).toBeDefined()
  })

  it("keeps Panduan and Komunitas at the top level", async () => {
    await renderNav(null)

    expect(desktop().getByRole("link", { name: "Panduan" })).toHaveAttribute(
      "href",
      "/panduan"
    )
    expect(desktop().getByRole("link", { name: "Komunitas" })).toHaveAttribute(
      "href",
      "/komunitas"
    )
  })

  it("shows the three community figures as compact pills", async () => {
    await renderNav(null, {}, 8778)

    const stats = within(desktop().getByTestId("nav-stats"))
    expect(stats.getByText(COMMUNITY_SIZE)).toBeDefined()
    expect(stats.getByText(PILGRIMS_HELPED)).toBeDefined()
    expect(stats.getByText("8.878+")).toBeDefined()

    // The word labels are dropped for space; meaning stays for screen readers.
    expect(stats.getByText("anggota komunitas")).toBeDefined()
    expect(stats.getByText("pengunjung")).toBeDefined()
  })

  it("drops the visitor pill but keeps the rest when the count is unreadable", async () => {
    await renderNav(null, {}, null)

    const stats = within(desktop().getByTestId("nav-stats"))
    expect(stats.getByText(COMMUNITY_SIZE)).toBeDefined()
    expect(stats.queryByText("pengunjung")).toBeNull()
  })

  it("exposes Layanan and Lainnya as closed popover triggers", async () => {
    await renderNav(null)

    for (const name of ["Layanan", "Lainnya"]) {
      const trigger = desktop().getByRole("button", { name })
      expect(trigger).toHaveAttribute("aria-haspopup", "true")
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    }

    expect(desktop().queryByText("Lihat semua layanan")).toBeNull()
    expect(desktop().queryByRole("link", { name: "FAQ" })).toBeNull()
  })
})

describe("NavBar Layanan mega menu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reveals every catalog service when opened", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Layanan" }))

    const panel = desktop()
    for (const service of services) {
      expect(panel.getByText(service.name)).toBeDefined()
      expect(panel.getByText(service.price)).toBeDefined()
    }

    expect(panel.getAllByText("BARU")).toHaveLength(1)
    expect(
      panel.getByRole("link", { name: /Lihat semua layanan/ })
    ).toHaveAttribute("href", "/layanan")
  })

  it("opens WhatsApp-backed services in a new tab", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Layanan" }))

    const whatsappService = services.find((s) => s.href.startsWith("http"))!
    const link = desktop().getByRole("link", { name: new RegExp(whatsappService.name) })
    expect(link.getAttribute("href")).toContain("https://wa.me/")
    expect(link).toHaveAttribute("target", "_blank")
  })
})

describe("NavBar single-open coordination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("points every Lainnya entry at its real destination", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Lainnya" }))

    const expected = [
      ["Cerita Jamaah", "/cerita-jamaah"],
      ["Hotel Nusuk", "/hotel-nusuk"],
      ["FAQ", "/faq"],
      ["Webinar", "/webinar-umroh-mandiri"],
    ]
    for (const [label, href] of expected) {
      expect(desktop().getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href
      )
    }
  })

  it("closes Layanan when Lainnya is opened", async () => {
    await renderNav(null)

    fireEvent.click(desktop().getByRole("button", { name: "Layanan" }))
    expect(desktop().getByText("Lihat semua layanan")).toBeDefined()

    fireEvent.click(desktop().getByRole("button", { name: "Lainnya" }))
    expect(desktop().queryByText("Lihat semua layanan")).toBeNull()
    expect(desktop().getByRole("link", { name: "FAQ" })).toBeDefined()
  })

  it("closes the open menu on an outside mousedown", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Lainnya" }))
    expect(desktop().getByRole("link", { name: "FAQ" })).toBeDefined()

    fireEvent.mouseDown(document.body)
    expect(desktop().queryByRole("link", { name: "FAQ" })).toBeNull()
  })

  it("keeps the menu open on a mousedown inside it", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Lainnya" }))

    fireEvent.mouseDown(desktop().getByRole("link", { name: "FAQ" }))
    expect(desktop().getByRole("link", { name: "FAQ" })).toBeDefined()
  })

  it("closes the open menu on Escape", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Lainnya" }))

    fireEvent.keyDown(document, { key: "Escape" })
    expect(desktop().queryByRole("link", { name: "FAQ" })).toBeNull()
  })
})

describe("NavBar account area", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows Masuk and no avatar when signed out", async () => {
    await renderNav(null)

    expect(desktop().getByRole("link", { name: "Masuk" })).toHaveAttribute(
      "href",
      "/login"
    )
    expect(desktop().queryByRole("button", { name: "Menu akun" })).toBeNull()
  })

  it("shows the account menu with Dashboard and Keluar for a signed-in user", async () => {
    await renderNav(userSession)
    fireEvent.click(desktop().getByRole("button", { name: "Menu akun" }))

    expect(desktop().getByText("test@example.com")).toBeDefined()
    expect(desktop().getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    )
    expect(desktop().getByRole("button", { name: "Keluar" })).toBeDefined()
    expect(desktop().queryByRole("button", { name: /Panel Admin/ })).toBeNull()
  })

  it("derives the avatar initial from the name, then the email, then a fallback", async () => {
    await renderNav({ user: { name: "bayu aslama", email: "b@x.com", role: "USER" } })
    expect(desktop().getByRole("button", { name: "Menu akun" }).textContent).toBe("B")

    document.body.innerHTML = ""
    await renderNav({ user: { email: "zaid@example.com", role: "USER" } })
    expect(desktop().getByRole("button", { name: "Menu akun" }).textContent).toBe("Z")

    document.body.innerHTML = ""
    await renderNav({ user: { role: "USER" } })
    expect(desktop().getByRole("button", { name: "Menu akun" }).textContent).toBe("?")
  })

  it("collapses the admin group when the account menu is reopened", async () => {
    await renderNav(adminSession)
    fireEvent.click(desktop().getByRole("button", { name: "Menu akun" }))
    fireEvent.click(desktop().getByRole("button", { name: /Panel Admin/ }))
    expect(desktop().getByRole("link", { name: "Kelola Harga" })).toBeDefined()

    fireEvent.click(desktop().getByRole("button", { name: "Menu akun" }))
    fireEvent.click(desktop().getByRole("button", { name: "Menu akun" }))

    expect(desktop().queryByRole("link", { name: "Kelola Harga" })).toBeNull()
  })

  it("exposes every admin sub-page behind the Panel Admin group for an admin", async () => {
    await renderNav(adminSession)
    fireEvent.click(desktop().getByRole("button", { name: "Menu akun" }))
    fireEvent.click(desktop().getByRole("button", { name: /Panel Admin/ }))

    const hrefs = [
      "/admin/pricing",
      "/admin/users",
      "/admin/community-requests",
      "/admin/content/stories",
      "/admin/content/hotels",
      "/admin/content/faqs",
      "/admin/visitor-stats",
    ]
    const rendered = desktop()
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))

    for (const href of hrefs) {
      expect(rendered).toContain(href)
    }
  })
})

describe("NavBar Buat Estimasi gating", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("disables the CTA for a non-admin", async () => {
    await renderNav(userSession)

    const cta = desktop().getByRole("button", { name: /Buat Estimasi/ })
    expect(cta).toBeDisabled()
    expect(desktop().queryByRole("link", { name: /Buat Estimasi/ })).toBeNull()
  })

  it("links the CTA to the estimator for an admin", async () => {
    await renderNav(adminSession)

    expect(
      desktop().getByRole("link", { name: /Buat Estimasi/ })
    ).toHaveAttribute("href", "/estimate/new")
  })
})
