import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { emailTemplates } from "@/lib/email-templates/content"
import TemplateEmailPage, { metadata } from "../page"

describe("TemplateEmailPage", () => {
  it("membawa deskripsi dan canonical-nya sendiri", () => {
    expect(metadata.description).toBeTruthy()
    expect(metadata.alternates?.canonical).toBe("/template-email")
  })

  it("menampilkan judul dan alamat tujuan template Nusuk", () => {
    render(<TemplateEmailPage />)

    expect(screen.getByText("Reset ID Nusuk yang dipakai pihak lain")).toBeInTheDocument()
    expect(screen.getByText("care@haj.gov.sa")).toBeInTheDocument()
  })

  it("merender satu kartu per template yang terdaftar", () => {
    render(<TemplateEmailPage />)

    for (const template of emailTemplates) {
      expect(screen.getByText(template.title)).toBeInTheDocument()
    }
  })

  it("mengelompokkan template di bawah nama instansinya", () => {
    render(<TemplateEmailPage />)

    for (const institution of new Set(emailTemplates.map((t) => t.institution))) {
      expect(screen.getByRole("heading", { name: institution })).toBeInTheDocument()
    }
  })

  it("menerangkan bahwa email berangkat dari alamat pembacanya sendiri", () => {
    render(<TemplateEmailPage />)

    expect(screen.getByText(/dikirim dari alamat Anda sendiri/)).toBeInTheDocument()
  })
})
