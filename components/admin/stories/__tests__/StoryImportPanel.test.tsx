import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StoryImportPanel } from "../StoryImportPanel"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("StoryImportPanel", () => {
  it("shows import controls and template link", () => {
    render(<StoryImportPanel />)

    expect(screen.getByText("Import Cerita Jamaah CSV")).toBeInTheDocument()
    expect(screen.getByText(/Kolom CSV: slug, author_name/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Download Template" })).toHaveAttribute(
      "href",
      "/api/admin/stories/import/template"
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
          rows: [
            {
              rowNumber: 2,
              status: "create",
              errors: [],
              data: {
                slug: "inka-umroh",
                authorName: "Inka",
                totalBudgetIdr: 54000000,
              },
            },
            {
              rowNumber: 3,
              status: "invalid",
              errors: ["hotel_tier is required"],
            },
          ],
        },
      }),
    } as Response)

    render(<StoryImportPanel />)
    fireEvent.change(screen.getByPlaceholderText("Tempel isi CSV cerita jamaah di sini..."), {
      target: { value: "slug,author_name,departure_city,pax,hotel_tier,total_budget_idr\ninka,Inka,Jakarta,2,STANDARD,54000000\n" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    await waitFor(() => {
      expect(screen.getByText("Invalid")).toBeInTheDocument()
      expect(screen.getByText("hotel_tier is required")).toBeInTheDocument()
      expect(screen.getByText("inka-umroh")).toBeInTheDocument()
    })
  })

  it("disables confirm when preview has conflicts", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        preview: {
          fileErrors: [],
          summary: { create: 0, update: 0, invalid: 0, conflict: 2 },
          rows: [
            { rowNumber: 2, status: "conflict", errors: ["duplicate row in uploaded CSV for the same slug"] },
            { rowNumber: 3, status: "conflict", errors: ["duplicate row in uploaded CSV for the same slug"] },
          ],
        },
      }),
    } as Response)

    render(<StoryImportPanel />)
    fireEvent.change(screen.getByPlaceholderText("Tempel isi CSV cerita jamaah di sini..."), {
      target: { value: "slug,author_name,departure_city,pax,hotel_tier,total_budget_idr\nsame,Inka,Jakarta,2,STANDARD,54000000\nsame,Zahra,Jakarta,2,STANDARD,54000000\n" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    await waitFor(() => {
      expect(screen.getByText("Konflik")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Konfirmasi Import" })).toBeDisabled()
    })
  })
})
