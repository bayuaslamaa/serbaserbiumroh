import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FaqPreview } from "../FaqPreview"
import type { PublishedFaqItem } from "@/lib/faq"

const items: PublishedFaqItem[] = [
  {
    id: "faq-1",
    groupId: "group-1",
    groupName: "Umum",
    question: "Apa itu Umroh Planner?",
    answer: "Alat estimasi biaya umroh mandiri.",
    sortOrder: 0,
  },
]

describe("FaqPreview", () => {
  it("renders preview items and all FAQ link", () => {
    render(<FaqPreview items={items} title="FAQ Umroh Mandiri" />)

    expect(screen.getByText("FAQ Umroh Mandiri")).toBeDefined()
    expect(screen.getByText("Apa itu Umroh Planner?")).toBeDefined()
    expect(screen.getByRole("link", { name: "Lihat semua" })).toHaveAttribute("href", "/faq")
  })

  it("renders nothing when there are no items", () => {
    const { container } = render(<FaqPreview items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
