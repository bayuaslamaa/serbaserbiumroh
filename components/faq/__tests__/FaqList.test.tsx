import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FaqList } from "../FaqList"
import type { PublishedFaqGroup } from "@/lib/faq"

const groups: PublishedFaqGroup[] = [
  {
    id: "group-1",
    name: "Estimasi Biaya",
    sortOrder: 0,
    items: [
      {
        id: "faq-1",
        groupId: "group-1",
        groupName: "Estimasi Biaya",
        question: "Apakah harga final dijamin sama?",
        answer: "Tidak. Harga mengikuti **ketersediaan** dan musim.",
        sortOrder: 0,
      },
    ],
  },
  {
    id: "group-2",
    name: "Dokumen",
    sortOrder: 10,
    items: [
      {
        id: "faq-2",
        groupId: "group-2",
        groupName: "Dokumen",
        question: "Dokumen apa yang perlu disiapkan?",
        answer: "Paspor, foto, dan dokumen pendukung.",
        sortOrder: 0,
      },
    ],
  },
]

describe("FaqList", () => {
  it("renders FAQ grouped by category", () => {
    render(<FaqList groups={groups} />)

    expect(screen.getByText("Estimasi Biaya")).toBeDefined()
    expect(screen.getByText("Dokumen")).toBeDefined()
    expect(screen.getByText("Apakah harga final dijamin sama?")).toBeDefined()
    expect(screen.getByText("Dokumen apa yang perlu disiapkan?")).toBeDefined()
  })

  it("filters by question and preserves matching group context", () => {
    render(<FaqList groups={groups} />)

    fireEvent.change(screen.getByLabelText("Cari FAQ"), { target: { value: "paspor" } })

    expect(screen.getByText("Dokumen")).toBeDefined()
    expect(screen.getByText("Dokumen apa yang perlu disiapkan?")).toBeDefined()
    expect(screen.queryByText("Apakah harga final dijamin sama?")).toBeNull()
  })

  it("shows an empty state when search has no matches", () => {
    render(<FaqList groups={groups} />)

    fireEvent.change(screen.getByLabelText("Cari FAQ"), { target: { value: "xyz" } })

    expect(screen.getByText("Tidak ada FAQ yang cocok dengan pencarian.")).toBeDefined()
  })
})
