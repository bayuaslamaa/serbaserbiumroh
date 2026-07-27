import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { CommunityRequestRow } from "../CommunityRequestRow"
import type { CommunityJoinRequestWithDuplicateFlags } from "@/lib/community/admin-requests"

function makeRequest(
  overrides: Partial<CommunityJoinRequestWithDuplicateFlags> = {}
): CommunityJoinRequestWithDuplicateFlags {
  return {
    id: "join-1",
    userId: null,
    fullName: "Irham Ghifari",
    phone: "081284051103",
    normalizedPhone: "6281284051103",
    socialUsername: "@irhamghifarii",
    normalizedSocialUsername: "irhamghifarii",
    intent: "mau tau update info umroh mandiri",
    status: "NEW",
    adminNote: "",
    createdAt: new Date(Date.now() - 6 * 3600 * 1000),
    updatedAt: new Date(),
    possibleDuplicate: false,
    duplicateByPhone: false,
    duplicateBySocial: false,
    ...overrides,
  } as CommunityJoinRequestWithDuplicateFlags
}

function renderRow(overrides: Partial<CommunityJoinRequestWithDuplicateFlags> = {}) {
  return render(
    <table>
      <tbody>
        <CommunityRequestRow request={makeRequest(overrides)} />
      </tbody>
    </table>
  )
}

describe("CommunityRequestRow", () => {
  it("shows the applicant, contact, and reason", () => {
    renderRow()

    expect(screen.getByText("Irham Ghifari")).toBeInTheDocument()
    expect(screen.getByText("mau tau update info umroh mandiri")).toBeInTheDocument()
    expect(screen.getByText("@irhamghifarii")).toBeInTheDocument()
  })

  it("links the phone to WhatsApp in 62 form, not the stored 0 form", () => {
    renderRow()

    const link = screen.getByRole("link", { name: /Buka WhatsApp/ })
    expect(link).toHaveAttribute("href", "https://wa.me/6281284051103")
    expect(link).toHaveTextContent("0812-8405-1103")
  })

  it("names the copy control after the number it copies", () => {
    renderRow()

    expect(screen.getByRole("button", { name: "Salin nomor 081284051103" })).toBeInTheDocument()
  })

  it("keeps the full reason in the DOM even though it is clamped visually", () => {
    const intent = "a".repeat(400)
    renderRow({ intent })

    expect(screen.getByText(intent)).toBeInTheDocument()
  })

  it("renders a placeholder rather than the word null for a missing reason", () => {
    renderRow({ intent: null })

    expect(screen.getByText("Tidak diisi")).toBeInTheDocument()
    expect(screen.queryByText("null")).toBeNull()
  })

  it("shows the account link only when the request is tied to a user", () => {
    renderRow({ userId: "user-1" })
    expect(screen.getByText(/Terhubung dengan akun/)).toBeInTheDocument()
  })

  it("omits the account link for an anonymous submission", () => {
    renderRow({ userId: null })
    expect(screen.queryByText(/Terhubung dengan akun/)).toBeNull()
  })

  it("omits the social handle when none was given", () => {
    renderRow({ socialUsername: null })
    expect(screen.queryByText("@irhamghifarii")).toBeNull()
  })

  it("shows arrival as relative time with the exact timestamp on hover", () => {
    const { container } = renderRow()

    const cell = container.querySelector("td[title]")
    expect(cell?.textContent).toMatch(/jam/)
    expect(cell?.getAttribute("title")).toMatch(/2026|2025/)
  })

  it("labels the status", () => {
    renderRow({ status: "MATCHED" })
    expect(screen.getByText("Sudah dicocokkan")).toBeInTheDocument()
  })

  it("names what the duplicate matched on", () => {
    renderRow({ possibleDuplicate: true, duplicateByPhone: true, duplicateBySocial: true })

    expect(screen.getByText("Duplikat: nomor + sosial")).toBeInTheDocument()
  })

  it("shows no duplicate badge when the request is unique", () => {
    renderRow()
    expect(screen.queryByText(/Duplikat:/)).toBeNull()
  })

  it("surfaces an existing admin note", () => {
    renderRow({ adminNote: "Sudah dihubungi lewat WA" })
    expect(screen.getByText(/Sudah dihubungi lewat WA/)).toBeInTheDocument()
  })

  it("collapses editing into a single control instead of an inline form", () => {
    renderRow()

    expect(screen.getByRole("button", { name: "Kelola" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Catatan admin")).toBeNull()
    expect(screen.queryByRole("button", { name: "Simpan" })).toBeNull()
  })
})
