import { describe, expect, it } from "vitest"

import { buildStoryMeta, travelPeriod, type StoryMetaSource } from "../metadata"

function story(overrides: Partial<StoryMetaSource> = {}): StoryMetaSource {
  return {
    authorName: "Zahra Shafiyah",
    departureCity: "Jakarta",
    travelMonth: 3,
    travelYear: 2026,
    pax: 4,
    hotelTier: "ECONOMY",
    makkahNights: 5,
    madinahNights: 4,
    totalBudgetIdr: 79_346_000,
    ...overrides,
  }
}

describe("travelPeriod", () => {
  it("spells the month out in Indonesian", () => {
    expect(travelPeriod(story())).toBe("Maret 2026")
  })

  it("falls back to the year alone when the month is unknown", () => {
    expect(travelPeriod(story({ travelMonth: null }))).toBe("2026")
  })

  it("returns null when there is no year, rather than a dangling month", () => {
    expect(travelPeriod(story({ travelYear: null }))).toBeNull()
  })
})

describe("buildStoryMeta", () => {
  it("puts the author, group size, and night count in the title", () => {
    const { title } = buildStoryMeta(story())

    expect(title).toContain("Zahra Shafiyah")
    expect(title).toContain("4 Orang")
    expect(title).toContain("9 Malam")
  })

  it("carries the concrete figures a searcher compares", () => {
    const { description } = buildStoryMeta(story())

    expect(description).toContain("Jakarta")
    expect(description).toContain("Maret 2026")
    expect(description).toContain("5 malam Makkah")
    expect(description).toContain("4 malam Madinah")
  })

  it("quotes cost per person, not the group total", () => {
    // totalBudgetIdr is the whole group's spend; per-person is what people
    // actually compare between stories.
    const { description } = buildStoryMeta(story({ totalBudgetIdr: 80_000_000, pax: 4 }))

    expect(description).toContain("20.000.000")
    expect(description).not.toContain("80.000.000")
  })

  it("gives two different stories different titles and descriptions", () => {
    const first = buildStoryMeta(story())
    const second = buildStoryMeta(
      story({
        authorName: "Revina",
        departureCity: "Bandung",
        travelMonth: 2,
        pax: 2,
        makkahNights: 4,
        madinahNights: 3,
        totalBudgetIdr: 42_000_000,
      }),
    )

    expect(second.title).not.toBe(first.title)
    expect(second.description).not.toBe(first.description)
  })

  it("omits the period cleanly when the travel date is unknown", () => {
    const { description } = buildStoryMeta(story({ travelMonth: null, travelYear: null }))

    expect(description).not.toContain("pada ")
    expect(description).toContain("Zahra Shafiyah dari Jakarta")
  })

  it("omits the night breakdown when no nights are recorded", () => {
    const { title, description } = buildStoryMeta(story({ makkahNights: 0, madinahNights: 0 }))

    expect(title).not.toContain("Malam")
    expect(description).not.toContain("malam Makkah")
  })

  it("does not divide by zero when pax is missing", () => {
    const { description } = buildStoryMeta(story({ pax: 0 }))

    expect(description).not.toContain("NaN")
    expect(description).not.toContain("per orang")
  })
})
