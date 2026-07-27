import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/faq", () => ({ getPublishedFaqGroups: vi.fn() }))

import { getPublishedFaqGroups } from "@/lib/faq"
import FaqPage, { metadata } from "../page"

const mockGroups = getPublishedFaqGroups as ReturnType<typeof vi.fn>

const group = {
  id: "g-1",
  name: "Visa",
  sortOrder: 0,
  items: [
    {
      id: "i-1",
      groupId: "g-1",
      groupName: "Visa",
      question: "Berapa biaya visa umroh mandiri?",
      answer: "Berkisar Rp 2,5 juta tergantung jalur pengurusan.",
      sortOrder: 0,
    },
  ],
}

function schemas(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((b) =>
    JSON.parse(b.innerHTML),
  )
}

afterEach(() => mockGroups.mockReset())

describe("FaqPage", () => {
  it("emits FAQPage structured data for published questions", async () => {
    mockGroups.mockResolvedValue([group])

    const { container } = render(await FaqPage())
    const faq = schemas(container).find((s) => s["@type"] === "FAQPage")

    expect(faq).toBeDefined()
    expect(faq.mainEntity).toHaveLength(1)
    expect(faq.mainEntity[0].name).toBe("Berapa biaya visa umroh mandiri?")
  })

  it("emits no FAQPage schema while the page says nothing is available", async () => {
    mockGroups.mockResolvedValue([])

    const { container } = render(await FaqPage())

    expect(screen.getByText(/FAQ belum tersedia/)).toBeDefined()
    expect(schemas(container).some((s) => s["@type"] === "FAQPage")).toBe(false)
  })

  it("includes questions from every published group", async () => {
    mockGroups.mockResolvedValue([
      group,
      {
        ...group,
        id: "g-2",
        name: "Hotel",
        items: [
          {
            id: "i-2",
            groupId: "g-2",
            groupName: "Hotel",
            question: "Bagaimana memilih hotel dekat Haram?",
            answer: "Perhatikan jarak tempuh jalan kaki, bukan jarak garis lurus.",
            sortOrder: 0,
          },
        ],
      },
    ])

    const { container } = render(await FaqPage())
    const faq = schemas(container).find((s) => s["@type"] === "FAQPage")

    expect(faq.mainEntity).toHaveLength(2)
  })

  it("carries a description and a canonical", () => {
    expect(metadata.description).toBeTruthy()
    expect(metadata.alternates?.canonical).toBe("/faq")
  })
})
