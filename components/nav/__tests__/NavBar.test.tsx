import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock @/auth before importing NavBar
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}))

import { auth } from "@/auth"
import { NavBar } from "../NavBar"

const mockAuth = auth as ReturnType<typeof vi.fn>

/** The desktop bar and the mobile bar both render; scope queries to one. */
function desktop() {
  return within(screen.getByTestId("desktop-nav"))
}

async function renderNav(session: unknown = null, props: { isAdmin?: boolean } = {}) {
  mockAuth.mockResolvedValue(session)
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
    expect(panel.getByText("Visa Umroh")).toBeDefined()
    expect(panel.getByText("Badalin — Badal Umroh")).toBeDefined()
    expect(panel.getByText("Sewa Transportasi")).toBeDefined()
    expect(panel.getByText("Booking Hotel")).toBeDefined()
    expect(panel.getByText("Booking HHR")).toBeDefined()
    expect(panel.getByText("Muthowwif")).toBeDefined()

    expect(panel.getAllByText("BARU")).toHaveLength(1)
    expect(
      panel.getByRole("link", { name: /Lihat semua layanan/ })
    ).toHaveAttribute("href", "/layanan")
  })

  it("opens WhatsApp-backed services in a new tab", async () => {
    await renderNav(null)
    fireEvent.click(desktop().getByRole("button", { name: "Layanan" }))

    const hhr = desktop().getByRole("link", { name: /Booking HHR/ })
    expect(hhr.getAttribute("href")).toContain("https://wa.me/")
    expect(hhr).toHaveAttribute("target", "_blank")
  })
})

describe("NavBar single-open coordination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
