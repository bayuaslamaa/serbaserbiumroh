import { describe, expect, it } from "vitest"

import { SITE_NAME, SITE_URL } from "../config"
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "../schema"

describe("buildOrganizationSchema", () => {
  const schema = buildOrganizationSchema()

  it("declares the schema.org context and Organization type", () => {
    expect(schema["@context"]).toBe("https://schema.org")
    expect(schema["@type"]).toBe("Organization")
  })

  it("uses absolute URLs for the site and the logo", () => {
    expect(schema.url).toBe(SITE_URL)
    expect(schema.logo).toBe(`${SITE_URL}/logo.png`)
  })

  it("carries the brand name", () => {
    expect(schema.name).toBe(SITE_NAME)
  })

  it("omits sameAs rather than claiming a profile we do not own", () => {
    // The only social link in the codebase is a personal Instagram account.
    // Asserting it as an organisation profile would be a claim we cannot back.
    expect(schema.sameAs).toBeUndefined()
  })
})

describe("buildWebSiteSchema", () => {
  const schema = buildWebSiteSchema()

  it("declares the schema.org context and WebSite type", () => {
    expect(schema["@context"]).toBe("https://schema.org")
    expect(schema["@type"]).toBe("WebSite")
  })

  it("uses the canonical absolute URL", () => {
    expect(schema.url).toBe(SITE_URL)
  })

  it("declares no SearchAction, because the site has no search endpoint", () => {
    expect(schema.potentialAction).toBeUndefined()
  })
})

describe("buildFaqPageSchema", () => {
  const entries = [
    { question: "Berapa biaya visa umroh mandiri?", answer: "Berkisar Rp 2,5 juta." },
    { question: "Apakah bisa berangkat sendiri?", answer: "Bisa, sejak UU 14/2025." },
  ]

  it("wraps each entry as a Question with an accepted Answer", () => {
    const schema = buildFaqPageSchema(entries)!

    expect(schema["@type"]).toBe("FAQPage")
    const questions = schema.mainEntity as Array<{
      "@type": string
      name: string
      acceptedAnswer: { text: string }
    }>
    expect(questions).toHaveLength(2)
    expect(questions[0].name).toBe("Berapa biaya visa umroh mandiri?")
    expect(questions[0].acceptedAnswer.text).toBe("Berkisar Rp 2,5 juta.")
  })

  it("returns null when nothing is published", () => {
    // The page renders "FAQ belum tersedia" in this state; emitting an empty
    // FAQPage alongside it is a markup/content mismatch.
    expect(buildFaqPageSchema([])).toBeNull()
  })

  it("returns null when every entry is blank", () => {
    expect(buildFaqPageSchema([{ question: "  ", answer: "" }])).toBeNull()
  })

  it("drops individual entries missing a question or an answer", () => {
    const schema = buildFaqPageSchema([...entries, { question: "Kosong?", answer: "   " }])!

    expect(schema.mainEntity).toHaveLength(2)
  })

  it("trims surrounding whitespace from the text it emits", () => {
    const schema = buildFaqPageSchema([{ question: "  Tanya?  ", answer: "  Jawab.  " }])!
    const questions = schema.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>

    expect(questions[0].name).toBe("Tanya?")
    expect(questions[0].acceptedAnswer.text).toBe("Jawab.")
  })
})

describe("buildBreadcrumbSchema", () => {
  const schema = buildBreadcrumbSchema([
    { name: "Beranda", path: "/" },
    { name: "Hotel Nusuk", path: "/hotel-nusuk" },
    { name: "Safwa Tower 3", path: "/hotel-nusuk/safwa-tower-3" },
  ])

  it("numbers the items from one, in order", () => {
    const items = schema.itemListElement as Array<{ position: number; name: string }>
    expect(items.map((i) => i.position)).toEqual([1, 2, 3])
    expect(items.map((i) => i.name)).toEqual(["Beranda", "Hotel Nusuk", "Safwa Tower 3"])
  })

  it("resolves every item to an absolute URL", () => {
    const items = schema.itemListElement as Array<{ item: string }>
    expect(items.map((i) => i.item)).toEqual([
      SITE_URL,
      `${SITE_URL}/hotel-nusuk`,
      `${SITE_URL}/hotel-nusuk/safwa-tower-3`,
    ])
  })

  it("produces an empty list for no items rather than throwing", () => {
    expect(buildBreadcrumbSchema([]).itemListElement).toEqual([])
  })
})
