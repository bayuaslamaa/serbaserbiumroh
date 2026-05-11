import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FaqForm } from "../FaqForm"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe("FaqForm", () => {
  it("disables submission when no groups exist", () => {
    render(<FaqForm groups={[]} />)

    expect(screen.getByText("Buat grup FAQ terlebih dahulu sebelum menambah pertanyaan.")).toBeDefined()
    expect(screen.getByRole("button", { name: "Tambah FAQ" })).toBeDisabled()
  })

  it("renders initial FAQ data for editing", () => {
    render(
      <FaqForm
        groups={[{ id: "group-1", name: "Umum" }]}
        initialData={{
          id: "faq-1",
          groupId: "group-1",
          question: "Pertanyaan lama?",
          answer: "Jawaban lama.",
          sortOrder: 2,
          isPublished: true,
        }}
      />
    )

    expect(screen.getByDisplayValue("Pertanyaan lama?")).toBeDefined()
    expect(screen.getByDisplayValue("Jawaban lama.")).toBeDefined()
    expect(screen.getByRole("button", { name: "Simpan Perubahan" })).toBeDefined()
  })
})
