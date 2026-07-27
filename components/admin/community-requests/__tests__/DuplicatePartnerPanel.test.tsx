import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DuplicatePartnerPanel } from "../DuplicatePartnerPanel"

function partner(overrides: Record<string, unknown> = {}) {
  return {
    id: "join-2",
    fullName: "Dessy Dwi Lestari",
    phone: "081995166383",
    socialUsername: "@dessy",
    status: "NEW",
    adminNote: "",
    createdAt: "2026-07-27T02:53:00.000Z",
    matchedByPhone: true,
    matchedBySocial: false,
    ...overrides,
  }
}

function renderPanel() {
  return render(<DuplicatePartnerPanel id="join-1" fullName="Irham Ghifari" reason="nomor" />)
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: /Lihat pengajuan serupa/ }))
}

function mockFetch(response: { ok: boolean; body?: unknown }) {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok: response.ok,
    json: async () => response.body ?? {},
  } as Response)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("DuplicatePartnerPanel", () => {
  it("fetches nothing until the badge is opened", () => {
    const fetchSpy = mockFetch({ ok: true, body: { duplicates: [] } })
    renderPanel()

    expect(screen.getByText("Duplikat: nomor")).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("lists the matching requests once opened", async () => {
    mockFetch({ ok: true, body: { duplicates: [partner()] } })
    renderPanel()
    openPanel()

    await waitFor(() => {
      expect(screen.getByText("Dessy Dwi Lestari")).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/community-requests/duplicates/join-1",
      expect.objectContaining({ signal: expect.anything() })
    )
  })

  it("says what each partner matched on", async () => {
    mockFetch({
      ok: true,
      body: { duplicates: [partner({ matchedByPhone: true, matchedBySocial: true })] },
    })
    renderPanel()
    openPanel()

    await waitFor(() => {
      expect(screen.getByText(/nomor sama · sosial sama/)).toBeInTheDocument()
    })
  })

  it("shows a loading state while the request is in flight", async () => {
    let release: (value: Response) => void = () => {}
    vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve
      })
    )
    renderPanel()
    openPanel()

    expect(screen.getByText("Memuat pengajuan serupa...")).toBeInTheDocument()

    release({ ok: true, json: async () => ({ duplicates: [] }) } as Response)
    await waitFor(() => {
      expect(screen.queryByText("Memuat pengajuan serupa...")).toBeNull()
    })
  })

  it("explains an empty result rather than showing a blank panel", async () => {
    mockFetch({ ok: true, body: { duplicates: [] } })
    renderPanel()
    openPanel()

    await waitFor(() => {
      expect(screen.getByText("Tidak ada pengajuan lain dengan kontak ini.")).toBeInTheDocument()
    })
  })

  it("offers a retry when the fetch fails", async () => {
    const fetchSpy = mockFetch({ ok: false, body: { error: "Akses hanya untuk admin" } })
    renderPanel()
    openPanel()

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Akses hanya untuk admin")
    })

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ duplicates: [partner()] }),
    } as Response)
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }))

    await waitFor(() => {
      expect(screen.getByText("Dessy Dwi Lestari")).toBeInTheDocument()
    })
  })

  it("falls back to a generic message when the network throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"))
    renderPanel()
    openPanel()

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat pengajuan serupa.")
    })
  })

  // These partners' statuses and notes are edited from the rows right beside
  // this panel, so reusing a cached list shows the admin a state they already
  // changed.
  it("refetches on reopen so an edited partner is not shown stale", async () => {
    const fetchSpy = mockFetch({
      ok: true,
      body: { duplicates: [partner({ status: "NEW" })] },
    })
    renderPanel()

    openPanel()
    await waitFor(() => expect(screen.getByText("Baru")).toBeInTheDocument())

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
    await waitFor(() => expect(screen.queryByText("Dessy Dwi Lestari")).toBeNull())

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ duplicates: [partner({ status: "MATCHED" })] }),
    } as Response)

    openPanel()
    await waitFor(() => expect(screen.getByText("Sudah dicocokkan")).toBeInTheDocument())
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("stays read-only -- no status control in the comparison view", async () => {
    mockFetch({ ok: true, body: { duplicates: [partner()] } })
    renderPanel()
    openPanel()

    await waitFor(() => expect(screen.getByText("Dessy Dwi Lestari")).toBeInTheDocument())
    expect(screen.queryByLabelText("Status")).toBeNull()
    expect(screen.queryByRole("button", { name: "Simpan" })).toBeNull()
  })
})
