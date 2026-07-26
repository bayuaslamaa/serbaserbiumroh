import { describe, expect, it } from "vitest"

import { SITE_NAME, SITE_URL } from "../config"
import { buildBreadcrumbSchema, buildOrganizationSchema, buildWebSiteSchema } from "../schema"

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
