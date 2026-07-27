import { describe, expect, it } from "vitest"

import { assignHotelSlugs, nextAvailableSlug, toHotelSlug } from "../slug"

describe("toHotelSlug", () => {
  it("kebab-cases a plain hotel label", () => {
    expect(toHotelSlug("Safwa Tower 3")).toBe("safwa-tower-3")
  })

  it("keeps digits, which distinguish towers and wings", () => {
    expect(toHotelSlug("Jabal Omar Marriott 2")).toBe("jabal-omar-marriott-2")
  })

  it("strips accents down to ASCII", () => {
    expect(toHotelSlug("Hôtel Anwār Al Madinah")).toBe("hotel-anwar-al-madinah")
  })

  it("collapses punctuation without leaving doubled or trailing hyphens", () => {
    expect(toHotelSlug("Al Safwah -- Royale  Orchid, Makkah!")).toBe(
      "al-safwah-royale-orchid-makkah",
    )
  })

  it("turns an ampersand into a word so two names do not merge", () => {
    expect(toHotelSlug("Dar Al Eiman & Tower")).toBe("dar-al-eiman-dan-tower")
  })

  it("falls back rather than returning an empty slug", () => {
    expect(toHotelSlug("!!!")).toBe("hotel")
    expect(toHotelSlug("   ")).toBe("hotel")
    expect(toHotelSlug("")).toBe("hotel")
  })
})

describe("assignHotelSlugs", () => {
  it("assigns one slug per row", () => {
    const assigned = assignHotelSlugs([
      { importKey: "b", label: "Safwa Tower 3" },
      { importKey: "a", label: "Anwar Al Madinah" },
    ])

    expect(assigned).toEqual([
      { importKey: "b", slug: "safwa-tower-3" },
      { importKey: "a", slug: "anwar-al-madinah" },
    ])
  })

  it("suffixes collisions deterministically by importKey, not by input order", () => {
    const forward = assignHotelSlugs([
      { importKey: "zeta", label: "Safwa Tower" },
      { importKey: "alpha", label: "Safwa  Tower" },
    ])
    const reversed = assignHotelSlugs([
      { importKey: "alpha", label: "Safwa  Tower" },
      { importKey: "zeta", label: "Safwa Tower" },
    ])

    const byKey = (rows: typeof forward) =>
      Object.fromEntries(rows.map((r) => [r.importKey, r.slug]))

    // alpha sorts first, so it keeps the bare slug in both orderings.
    expect(byKey(forward)).toEqual({ alpha: "safwa-tower", zeta: "safwa-tower-2" })
    expect(byKey(reversed)).toEqual(byKey(forward))
  })

  it("numbers a three-way collision 2 and 3, never reusing a suffix", () => {
    const slugs = assignHotelSlugs([
      { importKey: "a", label: "Hilton" },
      { importKey: "b", label: "hilton" },
      { importKey: "c", label: "HILTON" },
    ]).map((r) => r.slug)

    expect(slugs).toEqual(["hilton", "hilton-2", "hilton-3"])
    expect(new Set(slugs).size).toBe(3)
  })

  it("leaves an already-assigned slug untouched, so indexed URLs never move", () => {
    const assigned = assignHotelSlugs([
      { importKey: "a", label: "Renamed Since Launch", slug: "original-name" },
      { importKey: "b", label: "Brand New" },
    ])

    expect(assigned).toEqual([
      { importKey: "a", slug: "original-name" },
      { importKey: "b", slug: "brand-new" },
    ])
  })

  it("does not collide a new row with an existing slug it would otherwise match", () => {
    const assigned = assignHotelSlugs([
      { importKey: "a", label: "Whatever", slug: "safwa-tower" },
      { importKey: "b", label: "Safwa Tower" },
    ])

    expect(assigned.find((r) => r.importKey === "b")?.slug).toBe("safwa-tower-2")
  })

  it("is idempotent -- re-running over its own output changes nothing", () => {
    const rows = [
      { importKey: "a", label: "Safwa Tower" },
      { importKey: "b", label: "Safwa  Tower" },
      { importKey: "c", label: "Anwar" },
    ]

    const first = assignHotelSlugs(rows)
    const second = assignHotelSlugs(
      rows.map((r) => ({ ...r, slug: first.find((f) => f.importKey === r.importKey)!.slug })),
    )

    expect(second).toEqual(first)
  })

  it("returns an empty list for no rows", () => {
    expect(assignHotelSlugs([])).toEqual([])
  })
})

describe("nextAvailableSlug", () => {
  it("uses the bare slug when nothing has claimed it", () => {
    expect(nextAvailableSlug("Safwa Tower 3", [])).toBe("safwa-tower-3")
  })

  it("suffixes past every taken variant rather than reusing one", () => {
    expect(nextAvailableSlug("Hilton", ["hilton", "hilton-2"])).toBe("hilton-3")
  })

  it("ignores unrelated taken slugs", () => {
    expect(nextAvailableSlug("Hilton", ["anwar", "safwa-tower"])).toBe("hilton")
  })
})
