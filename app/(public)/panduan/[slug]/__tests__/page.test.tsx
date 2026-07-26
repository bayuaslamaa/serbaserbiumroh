import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import GuideDetailPage, { generateMetadata, generateStaticParams } from "../page"

function params(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

function textOf(container: HTMLElement) {
  return container.textContent ?? ""
}

describe("panduan-umroh-mandiri (published as HTML)", () => {
  it("renders the guide as readable HTML rather than a PDF viewer", async () => {
    const { container } = render(await GuideDetailPage(params("panduan-umroh-mandiri")))

    expect(screen.getByRole("heading", { level: 1, name: /Panduan Umroh Mandiri/ })).toBeDefined()
    expect(textOf(container)).not.toContain("Memuat dokumen PDF")
  })

  it("does not leak the MDX frontmatter into the rendered page", async () => {
    // The frontmatter must stay in the file -- lib/panduan.ts reads it to
    // build the guide index -- so the render path has to skip it. Without
    // remark-frontmatter it rendered as visible body text at the top of the
    // article, and inflated the word count below rather than failing it.
    const { container } = render(await GuideDetailPage(params("panduan-umroh-mandiri")))
    const text = textOf(container)

    expect(text).not.toContain("group: persiapan")
    expect(text).not.toContain("order: 1")
    expect(text).not.toMatch(/title:\s*Panduan Umroh Mandiri/)
    expect(container.querySelector("article > hr")).toBeNull()
  })

  it("carries enough text for a crawler to treat it as a real page", async () => {
    // This page rendered 64 words in production because the PDF viewer
    // replaced the content. The guard is deliberately blunt: a regression to
    // a skeleton is the failure worth catching.
    const { container } = render(await GuideDetailPage(params("panduan-umroh-mandiri")))

    expect(textOf(container).split(/\s+/).filter(Boolean).length).toBeGreaterThan(500)
  })

  it("keeps the PDF available as a download alongside the HTML", async () => {
    render(await GuideDetailPage(params("panduan-umroh-mandiri")))

    const link = screen.getByRole("link", { name: /Unduh versi PDF/ })
    expect(link.getAttribute("href")).toBe("/pdf/panduan-umroh-mandiri.pdf")
  })

  it("links to the other guides so the section is internally connected", async () => {
    const { container } = render(await GuideDetailPage(params("panduan-umroh-mandiri")))
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"))

    expect(hrefs).toContain("/panduan/manasik-umroh")
    expect(hrefs).toContain("/hotel-nusuk")
  })
})

describe("guides still awaiting their HTML version", () => {
  it.each(["manasik-umroh", "doa-dzikir-umroh"])(
    "keeps %s on the PDF viewer rather than publishing a skeleton",
    async (slug) => {
      const { container } = render(await GuideDetailPage(params(slug)))

      // Their authority is the community-authored PDF. A thin HTML stand-in
      // would read worse than what readers have today.
      expect(textOf(container)).toContain("Unduh PDF")
      expect(container.querySelector("a[href='/pdf/panduan-umroh-mandiri.pdf']")).toBeNull()
    },
  )
})

describe("generateMetadata", () => {
  it("declares a canonical containing the slug", async () => {
    const meta = await generateMetadata(params("panduan-umroh-mandiri"))

    expect(meta.alternates?.canonical).toBe("/panduan/panduan-umroh-mandiri")
    expect(meta.title).toBe("Panduan Umroh Mandiri")
  })

  it("returns empty metadata for an unknown slug without throwing", async () => {
    await expect(generateMetadata(params("tidak-ada"))).resolves.toEqual({})
  })
})

describe("generateStaticParams", () => {
  it("returns every guide slug", async () => {
    const slugs = (await generateStaticParams()).map((p) => p.slug)

    expect(slugs).toContain("panduan-umroh-mandiri")
    expect(slugs).toContain("manasik-umroh")
    expect(slugs).toContain("doa-dzikir-umroh")
  })
})
