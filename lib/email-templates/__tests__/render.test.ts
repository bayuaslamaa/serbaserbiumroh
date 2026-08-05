import { describe, expect, it } from "vitest"

import type { EmailTemplate } from "../content"
import { MAILTO_MAX_LENGTH, buildMailtoHref, renderBody } from "../render"

function template(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id: "fixture",
    institution: "Fixture Care",
    title: "Fixture",
    purpose: "Fixture.",
    to: "care@example.com",
    subject: "Fixture Subject",
    bodyLanguage: "en",
    body: "Dear Fixture,\n\nRegards,\n{{nama}}",
    fields: [{ key: "nama", label: "Nama Lengkap", placeholder: "Nama" }],
    attachments: ["Lampiran"],
    ...overrides,
  }
}

describe("renderBody", () => {
  it("substitutes the field value, leaving no token or bracket behind", () => {
    const body = renderBody(template(), { nama: "Bayu Aslama" })

    expect(body).toContain("Bayu Aslama")
    expect(body).not.toContain("{{")
    expect(body).not.toContain("[")
  })

  it("falls back to a labelled placeholder while the field is empty", () => {
    const body = renderBody(template(), {})

    expect(body).toContain("[Nama Lengkap]")
  })

  it("treats a whitespace-only value as empty", () => {
    const body = renderBody(template(), { nama: "   " })

    expect(body).toContain("[Nama Lengkap]")
  })

  it("trims the surrounding whitespace off a value", () => {
    const body = renderBody(template(), { nama: "  Bayu  " })

    expect(body).toContain("Regards,\nBayu")
  })

  it("replaces a token at every position it appears", () => {
    const body = renderBody(
      template({ body: "Halo {{nama}}, ini email untuk {{nama}}." }),
      { nama: "Bayu" },
    )

    expect(body).toBe("Halo Bayu, ini email untuk Bayu.")
  })

  it("ignores a value whose key the template does not declare", () => {
    const body = renderBody(template(), { nama: "Bayu", tidakDikenal: "abaikan" })

    expect(body).not.toContain("abaikan")
  })
})

describe("buildMailtoHref", () => {
  it("addresses the template's recipient with an encoded subject", () => {
    const { href } = buildMailtoHref(template(), { nama: "Bayu" })

    expect(href.startsWith("mailto:care@example.com?")).toBe(true)
    expect(href).toContain("subject=Fixture%20Subject")
  })

  it("sends line breaks as encoded CRLF", () => {
    const { href } = buildMailtoHref(template(), { nama: "Bayu" })

    expect(href).toContain("%0D%0A")
    expect(href).not.toMatch(/(?<!%0D)%0A/)
  })

  // A value carrying & or ? must not read as another mailto parameter.
  it("encodes characters that could pass for extra parameters", () => {
    const { href } = buildMailtoHref(template(), { nama: "A & B #1" })

    expect(href).toContain("A%20%26%20B%20%231")
    expect(href.split("&")).toHaveLength(2)
  })

  it("marks a draft under the length ceiling as safe to open", () => {
    const draft = buildMailtoHref(template(), { nama: "Bayu" })

    expect(draft.withinLimit).toBe(true)
    expect(draft.href.length).toBeLessThan(MAILTO_MAX_LENGTH)
  })

  it("marks a draft over the length ceiling as unsafe", () => {
    const draft = buildMailtoHref(template({ body: "x".repeat(MAILTO_MAX_LENGTH + 1) }), {})

    expect(draft.withinLimit).toBe(false)
  })

  it("measures the ceiling after encoding, not against the raw body", () => {
    // Every space becomes %20 -- the raw body is still short, the href is not.
    const body = " ".repeat(Math.ceil(MAILTO_MAX_LENGTH / 2))

    expect(body.length).toBeLessThan(MAILTO_MAX_LENGTH)
    expect(buildMailtoHref(template({ body }), {}).withinLimit).toBe(false)
  })
})
