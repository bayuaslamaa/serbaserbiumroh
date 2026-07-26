import { describe, expect, it } from "vitest"

import { SITE_NAME, SITE_URL } from "../config"
import { noIndexMetadata, pageMetadata, rootMetadata } from "../metadata"

describe("rootMetadata", () => {
  it("sets metadataBase to the canonical host so relative canonicals resolve", () => {
    expect(rootMetadata.metadataBase?.toString()).toBe(`${SITE_URL}/`)
  })

  it("appends the brand via title.template rather than in each page", () => {
    const title = rootMetadata.title as { default: string; template: string }
    expect(title.template).toBe(`%s | ${SITE_NAME}`)
  })

  it("uses a default title that carries the target keyword, not just the brand", () => {
    const title = rootMetadata.title as { default: string; template: string }
    expect(title.default).not.toBe(SITE_NAME)
    expect(title.default.toLowerCase()).toContain("umroh mandiri")
  })

  it("declares an Indonesian-locale OpenGraph website card", () => {
    expect(rootMetadata.openGraph?.locale).toBe("id_ID")
    expect((rootMetadata.openGraph as { type?: string })?.type).toBe("website")
  })

  it("lets the site be indexed", () => {
    expect(rootMetadata.robots).toMatchObject({ index: true, follow: true })
  })
})

describe("pageMetadata", () => {
  const input = {
    title: "FAQ Umroh Mandiri",
    description: "Pertanyaan yang sering ditanyakan tentang umroh mandiri.",
    path: "/faq",
  }

  it("declares the canonical from the given path", () => {
    expect(pageMetadata(input).alternates?.canonical).toBe("/faq")
  })

  it("derives the OpenGraph url from the same path, so the two cannot disagree", () => {
    const meta = pageMetadata(input)
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical)
  })

  it("passes the title through unbranded, leaving the suffix to title.template", () => {
    expect(pageMetadata(input).title).toBe("FAQ Umroh Mandiri")
  })

  it("rejects a title that already carries a brand suffix", () => {
    expect(() =>
      pageMetadata({ ...input, title: "Layanan Umroh Mandiri | Serba Serbi Umroh" }),
    ).toThrow(/brand suffix/i)

    expect(() => pageMetadata({ ...input, title: "Visa Umroh | SSU" })).toThrow(/brand suffix/i)
  })

  it("accepts a title containing a pipe that is not a brand suffix", () => {
    expect(() => pageMetadata({ ...input, title: "Hotel A | Hotel B" })).not.toThrow()
  })
})

describe("noIndexMetadata", () => {
  it("keeps protected pages out of the index", () => {
    expect(noIndexMetadata("Dashboard").robots).toMatchObject({ index: false, follow: false })
  })

  it("still sets a title so the browser tab is meaningful", () => {
    expect(noIndexMetadata("Admin — Pengguna").title).toBe("Admin — Pengguna")
  })
})
