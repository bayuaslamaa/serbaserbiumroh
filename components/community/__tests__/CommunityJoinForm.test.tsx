import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CommunityJoinForm } from "../CommunityJoinForm"

import type { SsuGroup as MockGroup } from "@/lib/community/groups"

// The real constants read invite links from the environment, so their URLs are
// empty in CI and would make every link assertion below vacuous. Tests drive
// the list instead: the array identity is stable, so mutating its contents
// re-shapes what the component sees without re-importing anything.
const { mockGroups } = vi.hoisted(() => ({ mockGroups: [] as MockGroup[] }))

vi.mock("@/lib/community/groups", () => ({
  SSU_GROUPS: mockGroups,
  STATS_SNAPSHOT_LABEL: "31 Juli 2026",
  // Mirrors the real helper, trim included — a mock that is more permissive
  // than the module it stands in for hides exactly the bug it is asked about.
  hasAnyGroupUrl: (groups: MockGroup[]) => groups.some((group) => group.url.trim().length > 0),
}))

const DEFAULT_GROUPS: MockGroup[] = [
  { id: "ssu-5", label: "SSU V", url: "https://chat.whatsapp.com/five", isNewest: true },
  {
    id: "ssu-1",
    label: "SSU I",
    url: "https://chat.whatsapp.com/one",
    isNewest: false,
    activeMembers30d: 169,
  },
  {
    id: "ssu-2",
    label: "SSU II",
    url: "https://chat.whatsapp.com/two",
    isNewest: false,
    activeMembers30d: 156,
  },
  {
    id: "ssu-3",
    label: "SSU III",
    url: "https://chat.whatsapp.com/three",
    isNewest: false,
    activeMembers30d: 147,
  },
  // No invite link, but it still has history — proves the two axes are independent.
  { id: "ssu-4", label: "SSU IV", url: "", isNewest: false, activeMembers30d: 310 },
]

function setGroups(groups: MockGroup[]) {
  mockGroups.splice(0, mockGroups.length, ...groups)
}

function mockSubmitSuccess() {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ request: { id: "join-1" } }),
  } as Response)
}

async function submitMinimalForm({
  fullName = "Bayu Aslama",
  phone = "085172117757",
}: { fullName?: string; phone?: string } = {}) {
  fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: fullName } })
  fireEvent.change(screen.getByLabelText("Nomor HP"), { target: { value: phone } })
  fireEvent.click(screen.getByRole("button", { name: "Simpan dan Lanjutkan" }))

  await waitFor(() => {
    expect(screen.getByText("Data sudah tercatat")).toBeInTheDocument()
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  setGroups(DEFAULT_GROUPS)
})

describe("CommunityJoinForm submission", () => {
  it("submits minimal request and shows the group choices", async () => {
    mockSubmitSuccess()
    render(<CommunityJoinForm adminChatUrl="https://wa.me/6285172117757" />)

    await submitMinimalForm()

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/community/join",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Bayu Aslama"),
      })
    )
    expect(screen.getByRole("link", { name: /SSU V/ })).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/five"
    )
    expect(screen.getByText(/Gunakan nama dan nomor HP yang sama/)).toBeInTheDocument()
  })

  it("includes optional social username and intent in the submitted payload", async () => {
    mockSubmitSuccess()
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
})

describe("CommunityJoinForm group list", () => {
  beforeEach(async () => {
    mockSubmitSuccess()
    render(<CommunityJoinForm adminChatUrl="https://wa.me/6285172117757" />)
    await submitMinimalForm()
  })

  it("lists every group and drops the old single button", () => {
    for (const label of ["SSU V", "SSU I", "SSU II", "SSU III", "SSU IV"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.queryByText("Ajukan Masuk Grup")).not.toBeInTheDocument()
  })

  it("opens joinable groups in a new tab", () => {
    const link = screen.getByRole("link", { name: /SSU I,/ })

    expect(link).toHaveAttribute("href", "https://chat.whatsapp.com/one")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })

  it("badges only the newest group", () => {
    expect(screen.getAllByText("Grup terbaru")).toHaveLength(1)
    expect(screen.getByRole("link", { name: /SSU V/ })).toHaveTextContent("Grup terbaru")
  })

  it("shows each group's 30-day activity figure", () => {
    expect(screen.getByText("169 member aktif 30 hari terakhir")).toBeInTheDocument()
    expect(screen.getByText("156 member aktif 30 hari terakhir")).toBeInTheDocument()
  })

  it("says the newest group is new rather than reporting zero members", () => {
    expect(screen.getByText("Baru dibuka")).toBeInTheDocument()
    expect(screen.queryByText(/^0 member aktif/)).not.toBeInTheDocument()
  })

  it("still shows the activity figure for a group with no invite link", () => {
    expect(screen.getByText("310 member aktif 30 hari terakhir")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /SSU IV/ })).not.toBeInTheDocument()
    expect(screen.getByText("Link belum tersedia")).toBeInTheDocument()
  })

  it("names the group and its activity in the link's accessible name", () => {
    expect(
      screen.getByRole("link", { name: "Ajukan masuk grup SSU I, 169 member aktif 30 hari terakhir" })
    ).toBeInTheDocument()
  })

  it("carries the newest-group badge into the accessible name", () => {
    // A screen reader user gets the badge as part of the link name; the visual
    // chip alone would not reach them in the same breath as the label.
    expect(
      screen.getByRole("link", { name: "Ajukan masuk grup SSU V (grup terbaru), Baru dibuka" })
    ).toBeInTheDocument()
  })

  it("dates the activity snapshot once", () => {
    expect(screen.getAllByText(/31 Juli 2026/)).toHaveLength(1)
  })

  it("renders the newest group above the older ones", () => {
    const text = screen.getByText("Data sudah tercatat").closest("section")!.textContent!

    expect(text.indexOf("SSU V")).toBeLessThan(text.indexOf("SSU I"))
  })

  it("keeps the admin contact with the prefilled message", () => {
    expect(screen.getByRole("link", { name: "Hubungi Admin" })).toHaveAttribute(
      "href",
      expect.stringContaining("text=")
    )
  })
})

describe("CommunityJoinForm without WhatsApp configuration", () => {
  it("explains that no link is available yet", async () => {
    setGroups(DEFAULT_GROUPS.map((group) => ({ ...group, url: "" })))
    mockSubmitSuccess()
    render(<CommunityJoinForm />)

    await submitMinimalForm()

    expect(screen.getByText(/Link WhatsApp belum tersedia/)).toBeInTheDocument()
  })

  it("still explains itself when the admin link is configured", async () => {
    // The state a first deploy lands in: admin link set, no group link set.
    // Without this note the jamaah sees five dead rows and no reason why.
    setGroups(DEFAULT_GROUPS.map((group) => ({ ...group, url: "" })))
    mockSubmitSuccess()
    render(<CommunityJoinForm adminChatUrl="https://wa.me/6285172117757" />)

    await submitMinimalForm()

    expect(screen.getByText(/Link grup belum tersedia/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Hubungi Admin" })).toBeInTheDocument()
  })

  it("treats a whitespace-only link as no link", async () => {
    setGroups(DEFAULT_GROUPS.map((group) => ({ ...group, url: "   " })))
    mockSubmitSuccess()
    render(<CommunityJoinForm adminChatUrl="https://wa.me/6285172117757" />)

    await submitMinimalForm()

    expect(screen.queryByRole("link", { name: /Ajukan masuk grup/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Link grup belum tersedia/)).toBeInTheDocument()
  })

  it("does not call an established group 'baru dibuka' when its figure is missing", async () => {
    setGroups([
      DEFAULT_GROUPS[0],
      { ...DEFAULT_GROUPS[1], activeMembers30d: undefined },
    ])
    mockSubmitSuccess()
    render(<CommunityJoinForm adminChatUrl="https://wa.me/6285172117757" />)

    await submitMinimalForm()

    expect(screen.getByText("Data aktivitas belum tersedia")).toBeInTheDocument()
    expect(screen.getAllByText("Baru dibuka")).toHaveLength(1)
  })
})
