import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CommunityRequestActions } from "../CommunityRequestActions"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
  refresh.mockClear()
})

describe("CommunityRequestActions", () => {
  it("saves status and admin note changes", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ request: { id: "join-1" } }),
    } as Response)

    render(<CommunityRequestActions id="join-1" status="NEW" adminNote="" />)

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
          body: JSON.stringify({
            status: "MATCHED",
            adminNote: "Cocok dari pengajuan WA",
          }),
        })
      )
    })
    expect(refresh).toHaveBeenCalled()
  })

  it("shows a local error when save fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Status tidak valid" }),
    } as Response)

    render(<CommunityRequestActions id="join-1" status="NEW" adminNote="" />)

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => {
      expect(screen.getByText("Status tidak valid")).toBeInTheDocument()
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
