import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { EstimateCard } from "../EstimateCard"
import type { Estimate } from "@/lib/db/schema"

const mockEstimate: Estimate = {
  id: "test-id-1",
  userId: "user-1",
  title: "Estimasi Standard Keluarga",
  rawInput: "umroh standard 9 malam",
  aiNotes: null,
  params: {
    nightsMadinah: 4,
    nightsMakkah: 9,
    pax: 3,
    hotelTier: "STANDARD",
    roomType: "TRIPLE",
    airline: "GARUDA",
    services: ["VISA", "SISKOPATUH", "TRANSPORT"],
    fullboard: true,
  },
  manualOverrides: null,
  totalIdrPax: 35_000_000,
  totalIdrGrp: 105_000_000,
  createdAt: new Date("2026-04-01"),
  updatedAt: new Date("2026-04-01"),
}

describe("EstimateCard", () => {
  it("renders title", () => {
    render(<EstimateCard estimate={mockEstimate} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText("Estimasi Standard Keluarga")).toBeDefined()
  })

  it("renders nights summary", () => {
    render(<EstimateCard estimate={mockEstimate} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText(/Madinah 4 mlm \+ Makkah 9 mlm/)).toBeDefined()
  })

  it("renders total per person formatted as Rp", () => {
    render(<EstimateCard estimate={mockEstimate} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText(/35\.000\.000/)).toBeDefined()
  })

  it("renders hotel tier badge", () => {
    render(<EstimateCard estimate={mockEstimate} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText("STANDARD")).toBeDefined()
  })

  it("renders pax and room type", () => {
    render(<EstimateCard estimate={mockEstimate} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText(/3 orang · TRIPLE/)).toBeDefined()
  })

  it("renders Lihat link and action buttons", () => {
    render(<EstimateCard estimate={mockEstimate} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText("Lihat")).toBeDefined()
    expect(screen.getByText("Duplikat")).toBeDefined()
    expect(screen.getByText("Hapus")).toBeDefined()
  })

  it("renders fallback title when title is null", () => {
    const noTitle = { ...mockEstimate, title: null }
    render(<EstimateCard estimate={noTitle} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
    expect(screen.getByText("Tanpa Judul")).toBeDefined()
  })

  it("requests a server-side duplicate from the persisted source estimate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ estimate: { ...mockEstimate, id: "copy-id" } }),
    })
    vi.stubGlobal("fetch", fetchMock)
    render(
      <EstimateCard
        estimate={mockEstimate}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText("Duplikat"))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(request).toEqual({ sourceEstimateId: "test-id-1" })
    vi.unstubAllGlobals()
  })
})
