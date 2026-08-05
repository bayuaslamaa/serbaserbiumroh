import { describe, expect, it } from "vitest"

import { BODY_LANGUAGE_LABEL, emailTemplates } from "../content"
import { templateTokens } from "../render"

describe("emailTemplates", () => {
  it("carries no token without a matching field", () => {
    for (const template of emailTemplates) {
      const keys = new Set(template.fields.map((f) => f.key))

      for (const token of templateTokens(template)) {
        expect(keys.has(token), `${template.id}: {{${token}}} has no field`).toBe(true)
      }
    }
  })

  it("carries no field the body never uses", () => {
    for (const template of emailTemplates) {
      const tokens = new Set(templateTokens(template))

      for (const field of template.fields) {
        expect(
          tokens.has(field.key),
          `${template.id}: field ${field.key} appears in no body`,
        ).toBe(true)
      }
    }
  })

  it("gives every template a unique id", () => {
    const ids = emailTemplates.map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it("points every template at a well-formed address", () => {
    for (const template of emailTemplates) {
      expect(template.to, `${template.id}: malformed recipient`).toMatch(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      )
    }
  })

  it("gives every template a subject, a purpose, and at least one attachment", () => {
    for (const template of emailTemplates) {
      expect(template.subject.trim(), `${template.id}: empty subject`).not.toBe("")
      expect(template.purpose.trim(), `${template.id}: empty purpose`).not.toBe("")
      expect(template.attachments.length, `${template.id}: no attachments`).toBeGreaterThan(0)
    }
  })

  it("uses a body language that has a note to display", () => {
    for (const template of emailTemplates) {
      expect(BODY_LANGUAGE_LABEL[template.bodyLanguage]).toBeTruthy()
    }
  })

  it("carries the Nusuk ID reset request addressed to Nusuk Care", () => {
    const nusuk = emailTemplates.find((t) => t.id === "nusuk-reset-id")

    expect(nusuk).toBeDefined()
    expect(nusuk!.to).toBe("care@haj.gov.sa")
    expect(nusuk!.subject).toBe("Reset ID NUSUK")
    expect(nusuk!.attachments).toHaveLength(2)
  })
})
