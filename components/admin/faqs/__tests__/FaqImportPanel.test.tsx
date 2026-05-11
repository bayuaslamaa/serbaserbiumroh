import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FaqImportPanel } from "../FaqImportPanel"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("FaqImportPanel", () => {
  it("shows import controls and template link", () => {
    render(<FaqImportPanel />)

    fireEvent.click(screen.getByRole("button", { name: /Import FAQ CSV/ }))

    expect(screen.getByText("Kolom CSV: group, question, answer.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Download Template" })).toHaveAttribute(
      "href",
      "/api/admin/faqs/import/template"
    )
    expect(screen.getByRole("button", { name: "Konfirmasi Import" })).toBeDisabled()
  })

  it("previews row counts and row-level errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        preview: {
          fileErrors: [],
          summary: { create: 1, update: 0, invalid: 1, conflict: 0 },
          groupSummary: { create: 1 },
          rows: [
            {
              rowNumber: 2,
              status: "create",
              errors: [],
              data: { groupName: "Umum", question: "Apa itu umroh mandiri?", willCreateGroup: true },
            },
            {
              rowNumber: 3,
              status: "invalid",
              errors: ["answer is required"],
            },
          ],
        },
      }),
    } as Response)

    render(<FaqImportPanel />)
    fireEvent.click(screen.getByRole("button", { name: /Import FAQ CSV/ }))
    fireEvent.change(screen.getByPlaceholderText("Tempel isi CSV FAQ di sini..."), {
      target: { value: "group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban\n" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    await waitFor(() => {
      expect(screen.getByText("Invalid")).toBeInTheDocument()
      expect(screen.getByText("answer is required")).toBeInTheDocument()
      expect(screen.getByText("Grup Baru")).toBeInTheDocument()
    })
  })
})
