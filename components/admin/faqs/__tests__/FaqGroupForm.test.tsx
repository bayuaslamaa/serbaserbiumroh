import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FaqGroupForm } from "../FaqGroupForm"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe("FaqGroupForm", () => {
  it("renders empty state when no groups exist", () => {
    render(<FaqGroupForm groups={[]} />)

    expect(screen.getByText("Belum ada grup FAQ.")).toBeDefined()
    expect(screen.getByRole("button", { name: "Tambah Grup" })).toBeDefined()
  })

  it("renders editable group fields", () => {
    render(<FaqGroupForm groups={[{ id: "group-1", name: "Umum", sortOrder: 0 }]} />)

    expect(screen.getByDisplayValue("Umum")).toBeDefined()
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Hapus" })).toBeDefined()
  })
})
