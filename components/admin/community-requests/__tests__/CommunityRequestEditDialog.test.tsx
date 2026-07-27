import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

import { CommunityRequestEditDialog } from "../CommunityRequestEditDialog"

function renderDialog(props: Partial<Parameters<typeof CommunityRequestEditDialog>[0]> = {}) {
  return render(
    <CommunityRequestEditDialog
      id="join-1"
      fullName="Irham Ghifari"
      status="NEW"
      adminNote=""
      {...props}
    />
  )
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Kelola" }))
}

function mockFetch(response: { ok: boolean; body?: unknown }) {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok: response.ok,
    json: async () => response.body ?? {},
  } as Response)
}

beforeEach(() => {
  vi.restoreAllMocks()
  refresh.mockClear()
})

describe("CommunityRequestEditDialog", () => {
  it("keeps the edit form out of the row until it is opened", () => {
    renderDialog()

    expect(screen.queryByLabelText("Catatan admin")).toBeNull()
    expect(screen.getByRole("button", { name: "Kelola" })).toBeInTheDocument()
  })

  it("seeds the form from the request's current values", () => {
    renderDialog({ status: "MATCHED", adminNote: "Sudah dihubungi" })
    openDialog()

    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("MATCHED")
    expect((screen.getByLabelText("Catatan admin") as HTMLTextAreaElement).value).toBe(
      "Sudah dihubungi"
    )
  })

  it("names the applicant so the dialog is unambiguous", () => {
    renderDialog({ fullName: "Dessy Dwi Lestari" })
    openDialog()

    expect(screen.getByText("Dessy Dwi Lestari")).toBeInTheDocument()
  })

  it("saves status and admin note changes", async () => {
    mockFetch({ ok: true, body: { request: { id: "join-1" } } })
    renderDialog()
    openDialog()

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "MATCHED" } })
    fireEvent.change(screen.getByLabelText("Catatan admin"), {
      target: { value: "Cocok dari pengajuan WA" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/community-requests/join-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "MATCHED", adminNote: "Cocok dari pengajuan WA" }),
        })
      )
    })
    expect(refresh).toHaveBeenCalled()
  })

  it("closes on success so the refreshed row is visible", async () => {
    mockFetch({ ok: true })
    renderDialog()
    openDialog()

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(screen.queryByLabelText("Catatan admin")).toBeNull()
    })
  })

  it("shows a local error when save fails", async () => {
    mockFetch({ ok: false, body: { error: "Status tidak valid" } })
    renderDialog()
    openDialog()

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Status tidak valid")
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it("stays open with the typed note intact when save fails", async () => {
    mockFetch({ ok: false, body: { error: "Status tidak valid" } })
    renderDialog()
    openDialog()

    fireEvent.change(screen.getByLabelText("Catatan admin"), {
      target: { value: "Draf catatan panjang" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })
    expect((screen.getByLabelText("Catatan admin") as HTMLTextAreaElement).value).toBe(
      "Draf catatan panjang"
    )
  })

  it("falls back to a generic message when the network throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"))
    renderDialog()
    openDialog()

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Gagal menyimpan.")
    })
  })

  it("falls back to a generic message when the error body has no reason", async () => {
    mockFetch({ ok: false, body: {} })
    renderDialog()
    openDialog()

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Gagal menyimpan.")
    })
  })

  it("does not save when the dialog is dismissed", () => {
    const fetchSpy = mockFetch({ ok: true })
    renderDialog()
    openDialog()

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "REJECTED" } })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("discards an abandoned edit when reopened", async () => {
    mockFetch({ ok: true })
    renderDialog({ adminNote: "Catatan asli" })

    openDialog()
    fireEvent.change(screen.getByLabelText("Catatan admin"), {
      target: { value: "Diketik lalu ditinggalkan" },
    })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

    await waitFor(() => expect(screen.queryByLabelText("Catatan admin")).toBeNull())

    openDialog()
    expect((screen.getByLabelText("Catatan admin") as HTMLTextAreaElement).value).toBe(
      "Catatan asli"
    )
  })
})
