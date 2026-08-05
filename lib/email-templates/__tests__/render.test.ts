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
  it("menyisipkan nilai isian tanpa menyisakan token atau kurung siku", () => {
    const body = renderBody(template(), { nama: "Bayu Aslama" })

    expect(body).toContain("Bayu Aslama")
    expect(body).not.toContain("{{")
    expect(body).not.toContain("[")
  })

  it("menyisipkan placeholder berlabel ketika isian masih kosong", () => {
    const body = renderBody(template(), {})

    expect(body).toContain("[Nama Lengkap]")
  })

  it("memperlakukan isian berisi spasi saja sama dengan kosong", () => {
    const body = renderBody(template(), { nama: "   " })

    expect(body).toContain("[Nama Lengkap]")
  })

  it("memangkas spasi di ujung nilai isian", () => {
    const body = renderBody(template(), { nama: "  Bayu  " })

    expect(body).toContain("Regards,\nBayu")
  })

  it("mengganti token yang muncul lebih dari sekali di setiap posisinya", () => {
    const body = renderBody(
      template({ body: "Halo {{nama}}, ini email untuk {{nama}}." }),
      { nama: "Bayu" },
    )

    expect(body).toBe("Halo Bayu, ini email untuk Bayu.")
  })

  it("mengabaikan nilai untuk key yang tidak dikenal template", () => {
    const body = renderBody(template(), { nama: "Bayu", tidakDikenal: "abaikan" })

    expect(body).not.toContain("abaikan")
  })
})

describe("buildMailtoHref", () => {
  it("mengarah ke alamat tujuan template dengan subject ter-encode", () => {
    const { href } = buildMailtoHref(template(), { nama: "Bayu" })

    expect(href.startsWith("mailto:care@example.com?")).toBe(true)
    expect(href).toContain("subject=Fixture%20Subject")
  })

  it("mengirim pemisah baris sebagai CRLF ter-encode", () => {
    const { href } = buildMailtoHref(template(), { nama: "Bayu" })

    expect(href).toContain("%0D%0A")
    expect(href).not.toMatch(/(?<!%0D)%0A/)
  })

  it("meng-encode karakter yang bisa dikira parameter tambahan", () => {
    const { href } = buildMailtoHref(template(), { nama: "A & B #1" })

    expect(href).toContain("A%20%26%20B%20%231")
    expect(href.split("&")).toHaveLength(2)
  })

  it("menandai draft yang masih di bawah ambang panjang sebagai aman", () => {
    const draft = buildMailtoHref(template(), { nama: "Bayu" })

    expect(draft.withinLimit).toBe(true)
    expect(draft.href.length).toBeLessThan(MAILTO_MAX_LENGTH)
  })

  it("menandai draft yang melewati ambang panjang sebagai tidak aman", () => {
    const draft = buildMailtoHref(template({ body: "x".repeat(MAILTO_MAX_LENGTH + 1) }), {})

    expect(draft.withinLimit).toBe(false)
  })

  it("menghitung ambang setelah encoding, bukan dari panjang body mentah", () => {
    // Setiap spasi jadi %20 -- body mentah masih pendek, href-nya tidak.
    const body = " ".repeat(Math.ceil(MAILTO_MAX_LENGTH / 2))

    expect(body.length).toBeLessThan(MAILTO_MAX_LENGTH)
    expect(buildMailtoHref(template({ body }), {}).withinLimit).toBe(false)
  })
})
