import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CommunityJoinForm } from "../CommunityJoinForm"

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("CommunityJoinForm", () => {
  it("submits minimal request and shows WhatsApp success actions", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ request: { id: "join-1" } }),
    } as Response)

    render(
      <CommunityJoinForm
        groupRequestUrl="https://chat.whatsapp.com/group"
        adminChatUrl="https://wa.me/6285172117757"
      />
    )

    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Bayu Aslama" },
    })
    fireEvent.change(screen.getByLabelText("Nomor HP"), {
      target: { value: "085172117757" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan Lanjutkan" }))

    await waitFor(() => {
      expect(screen.getByText("Data sudah tercatat")).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/community/join",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Bayu Aslama"),
      })
    )
    expect(screen.getByRole("link", { name: "Ajukan Masuk Grup" })).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/group"
    )
    expect(screen.getByRole("link", { name: "Hubungi Admin" })).toHaveAttribute(
      "href",
      expect.stringContaining("text=")
    )
    expect(screen.getByText(/Gunakan nama dan nomor HP yang sama/)).toBeInTheDocument()
  })

  it("includes optional social username and intent in the submitted payload", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ request: { id: "join-1" } }),
    } as Response)

    render(<CommunityJoinForm />)

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Aisyah" } })
    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "081200001111" } })
    fireEvent.change(screen.getByLabelText("Username sosial media"), {
      target: { value: "@aisyah.umroh" },
    })
    fireEvent.change(screen.getByLabelText("Alasan bergabung"), {
      target: { value: "Mau belajar umroh mandiri" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan Lanjutkan" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
    expect(body).toEqual({
      fullName: "Aisyah",
      phone: "081200001111",
      socialUsername: "@aisyah.umroh",
      intent: "Mau belajar umroh mandiri",
    })
  })

  it("shows API validation errors without losing form values", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Nomor HP wajib diisi" }),
    } as Response)

    render(<CommunityJoinForm />)

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Bayu" } })
    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "bad" } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan Lanjutkan" }))

    await waitFor(() => {
      expect(screen.getByText("Nomor HP wajib diisi")).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue("Bayu")).toBeInTheDocument()
    expect(screen.getByDisplayValue("bad")).toBeInTheDocument()
  })

  it("handles missing WhatsApp configuration without crashing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ request: { id: "join-1" } }),
    } as Response)

    render(<CommunityJoinForm />)

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Bayu" } })
    fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: "085172117757" } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan Lanjutkan" }))

    await waitFor(() => {
      expect(screen.getByText(/Link WhatsApp belum tersedia/)).toBeInTheDocument()
    })
  })
})
