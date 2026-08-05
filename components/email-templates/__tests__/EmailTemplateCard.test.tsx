import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { EmailTemplate } from "@/lib/email-templates/content"
import { MAILTO_MAX_LENGTH } from "@/lib/email-templates/render"
import { EmailTemplateCard } from "../EmailTemplateCard"

function template(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id: "nusuk-reset-id",
    institution: "Nusuk Care",
    title: "Reset ID Nusuk yang dipakai pihak lain",
    purpose: "Dipakai ketika ID Nusuk dikuasai pihak lain.",
    to: "care@haj.gov.sa",
    subject: "Reset ID NUSUK",
    bodyLanguage: "en",
    body: "Dear Nusuk Care,\n\nYours,\n{{nama}}",
    fields: [{ key: "nama", label: "Nama Lengkap", placeholder: "Nama sesuai paspor" }],
    attachments: ["Screenshot ID yang dipakai orang lain", "Visa umroh yang masih aktif"],
    ...overrides,
  }
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  })
  return writeText
}

function nameInput() {
  return screen.getByLabelText("Nama Lengkap")
}

describe("EmailTemplateCard", () => {
  it("menampilkan tujuan, subject, dan body dengan placeholder saat isian kosong", () => {
    render(<EmailTemplateCard template={template()} />)

    expect(screen.getByText("care@haj.gov.sa")).toBeInTheDocument()
    expect(screen.getByText("Reset ID NUSUK")).toBeInTheDocument()
    expect(screen.getByText(/\[Nama Lengkap\]/)).toBeInTheDocument()
  })

  it("memperbarui preview body saat isian nama diketik", () => {
    render(<EmailTemplateCard template={template()} />)

    fireEvent.change(nameInput(), { target: { value: "Bayu Aslama" } })

    expect(screen.getByText(/Bayu Aslama/)).toBeInTheDocument()
    expect(screen.queryByText(/\[Nama Lengkap\]/)).not.toBeInTheDocument()
  })

  it("menyalin body hasil render, bukan body mentah bertoken", async () => {
    const writeText = stubClipboard()
    render(<EmailTemplateCard template={template()} />)

    fireEvent.change(nameInput(), { target: { value: "Bayu Aslama" } })
    fireEvent.click(screen.getByRole("button", { name: "Salin body email" }))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain("Bayu Aslama")
    expect(copied).not.toContain("{{nama}}")
  })

  it("menyalin alamat tujuan dan subject masing-masing nilainya sendiri", async () => {
    const writeText = stubClipboard()
    render(<EmailTemplateCard template={template()} />)

    fireEvent.click(screen.getByRole("button", { name: "Salin alamat tujuan" }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("care@haj.gov.sa"))

    fireEvent.click(screen.getByRole("button", { name: "Salin subject email" }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Reset ID NUSUK"))
  })

  it("menampilkan status gagal ketika clipboard menolak", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("not allowed")) },
      configurable: true,
      writable: true,
    })
    render(<EmailTemplateCard template={template()} />)

    fireEvent.click(screen.getByRole("button", { name: "Salin body email" }))

    await waitFor(() => expect(screen.getByText("Gagal salin")).toBeInTheDocument())
  })

  it("menautkan tombol buka draft ke alamat tujuan template", () => {
    render(<EmailTemplateCard template={template()} />)

    const link = screen.getByRole("link", { name: /Buka di aplikasi email/ })

    expect(link.getAttribute("href")).toMatch(/^mailto:care@haj\.gov\.sa\?/)
  })

  it("menonaktifkan tombol buka draft ketika body melewati ambang panjang", () => {
    render(<EmailTemplateCard template={template({ body: "x".repeat(MAILTO_MAX_LENGTH + 1) })} />)

    expect(screen.queryByRole("link", { name: /Buka di aplikasi email/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Buka di aplikasi email/ })).toBeDisabled()
    expect(screen.getByText(/terlalu panjang untuk dibuka sebagai draft/)).toBeInTheDocument()
  })

  it("mendaftar setiap lampiran beserta pengingat melampirkannya sendiri", () => {
    render(<EmailTemplateCard template={template()} />)

    expect(screen.getByText("Screenshot ID yang dipakai orang lain")).toBeInTheDocument()
    expect(screen.getByText("Visa umroh yang masih aktif")).toBeInTheDocument()
    expect(screen.getByText(/tambahkan sendiri di aplikasi email/)).toBeInTheDocument()
  })

  it("menerangkan bahasa body supaya tidak diterjemahkan sendiri", () => {
    render(<EmailTemplateCard template={template()} />)

    expect(screen.getByText(/Body dalam bahasa Inggris/)).toBeInTheDocument()
  })

  it("memberi setiap tombol salin dalam satu kartu nama yang berbeda", () => {
    render(<EmailTemplateCard template={template()} />)

    const names = screen
      .getAllByRole("button", { name: /^Salin / })
      .map((b) => b.getAttribute("aria-label"))

    expect(names).toHaveLength(3)
    expect(new Set(names).size).toBe(3)
  })
})
