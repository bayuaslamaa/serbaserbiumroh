import { describe, expect, it } from "vitest"

import {
  buildStoryMeta,
  formatCompactBudget,
  storyCardSummary,
  travelPeriod,
  type StoryMetaSource,
} from "../metadata"

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

describe("formatCompactBudget", () => {
  it("shortens millions to one decimal with the Indonesian comma", () => {
    // A period would read as a thousands separator to an id-ID reader, which
    // is the whole reason this does not reuse formatCompactIdr.
    expect(formatCompactBudget(27_400_000)).toBe("Rp 27,4 jt")
  })

  it("drops the decimal when the figure is a whole number of millions", () => {
    expect(formatCompactBudget(31_000_000)).toBe("Rp 31 jt")
  })

  it("rounds to one decimal rather than truncating", () => {
    expect(formatCompactBudget(27_460_000)).toBe("Rp 27,5 jt")
  })

  it("falls back to thousands below a million", () => {
    expect(formatCompactBudget(900_000)).toBe("Rp 900 rb")
  })
})

describe("storyCardSummary", () => {
  it("leads with the cost per person, not the group total", () => {
    const summary = storyCardSummary(story({ totalBudgetIdr: 80_000_000, pax: 4 }))

    expect(summary.pricePerPax).toBe("Rp 20 jt")
  })

  it("labels the group size, hotel tier, and total nights", () => {
    const summary = storyCardSummary(story())

    expect(summary.pax).toBe("4 orang")
    expect(summary.tier).toBe("Ekonomi")
    expect(summary.nights).toBe("9 malam")
  })

  it("builds the attribution line from city and travel period", () => {
    const summary = storyCardSummary(story())

    expect(summary.initial).toBe("Z")
    expect(summary.meta).toBe("Jakarta · Maret 2026")
  })

  it("drops the period from the attribution when the story has no year", () => {
    const summary = storyCardSummary(story({ travelYear: null }))

    expect(summary.meta).toBe("Jakarta")
  })

  it("returns no price rather than dividing by zero when pax is unrecorded", () => {
    // An admin-entered story with pax 0 must not put "RpNaN" on the homepage.
    const summary = storyCardSummary(story({ pax: 0 }))

    expect(summary.pricePerPax).toBeNull()
  })

  it("omits the duration when neither city recorded a night", () => {
    const summary = storyCardSummary(story({ makkahNights: 0, madinahNights: 0 }))

    expect(summary.nights).toBeNull()
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
