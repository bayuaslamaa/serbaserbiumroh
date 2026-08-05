import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { emailTemplates } from "@/lib/email-templates/content"
import TemplateEmailPage, { metadata } from "../page"

describe("TemplateEmailPage", () => {
  it("carries a description and a canonical", () => {
    expect(metadata.description).toBeTruthy()
    expect(metadata.alternates?.canonical).toBe("/template-email")
  })

  it("shows the Nusuk template's title and recipient", () => {
    render(<TemplateEmailPage />)

    expect(screen.getByText("Reset ID Nusuk yang dipakai pihak lain")).toBeInTheDocument()
    expect(screen.getByText("care@haj.gov.sa")).toBeInTheDocument()
  })

  it("renders one card per listed template", () => {
    render(<TemplateEmailPage />)

    for (const template of emailTemplates) {
      expect(screen.getByText(template.title)).toBeInTheDocument()
    }
  })

  it("groups templates under their institution", () => {
    render(<TemplateEmailPage />)

    for (const institution of new Set(emailTemplates.map((t) => t.institution))) {
      expect(screen.getByRole("heading", { name: institution })).toBeInTheDocument()
    }
  })

  it("says the email leaves from the reader's own address", () => {
    render(<TemplateEmailPage />)

    expect(screen.getByText(/dikirim dari alamat Anda sendiri/)).toBeInTheDocument()
  })
})
