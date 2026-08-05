import { describe, expect, it } from "vitest"

import {
  BODY_LANGUAGE_LABEL,
  emailTemplates,
  type EmailTemplate,
} from "../content"

const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g

function tokensIn(template: EmailTemplate): string[] {
  return Array.from(template.body.matchAll(TOKEN_PATTERN)).map((m) => m[1])
}

describe("emailTemplates", () => {
  it("tidak punya token tanpa field pasangannya", () => {
    for (const template of emailTemplates) {
      const keys = new Set(template.fields.map((f) => f.key))

      for (const token of tokensIn(template)) {
        expect(keys.has(token), `${template.id}: token {{${token}}} tidak punya field`).toBe(true)
      }
    }
  })

  it("tidak punya field yang tidak dipakai body", () => {
    for (const template of emailTemplates) {
      const tokens = new Set(tokensIn(template))

      for (const field of template.fields) {
        expect(
          tokens.has(field.key),
          `${template.id}: field ${field.key} tidak dipakai body mana pun`,
        ).toBe(true)
      }
    }
  })

  it("memberi setiap template id yang unik", () => {
    const ids = emailTemplates.map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it("mengarahkan setiap template ke alamat email yang berbentuk valid", () => {
    for (const template of emailTemplates) {
      expect(template.to, `${template.id}: alamat tujuan tidak valid`).toMatch(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      )
    }
  })

  it("memberi setiap template subject, tujuan, dan minimal satu lampiran", () => {
    for (const template of emailTemplates) {
      expect(template.subject.trim(), `${template.id}: subject kosong`).not.toBe("")
      expect(template.purpose.trim(), `${template.id}: purpose kosong`).not.toBe("")
      expect(template.attachments.length, `${template.id}: tidak punya lampiran`).toBeGreaterThan(0)
    }
  })

  it("memakai bahasa body yang punya keterangan tampilnya", () => {
    for (const template of emailTemplates) {
      expect(BODY_LANGUAGE_LABEL[template.bodyLanguage]).toBeTruthy()
    }
  })

  it("membawa template reset ID Nusuk ke Nusuk Care", () => {
    const nusuk = emailTemplates.find((t) => t.id === "nusuk-reset-id")

    expect(nusuk).toBeDefined()
    expect(nusuk!.to).toBe("care@haj.gov.sa")
    expect(nusuk!.subject).toBe("Reset ID NUSUK")
    expect(nusuk!.attachments).toHaveLength(2)
  })
})
