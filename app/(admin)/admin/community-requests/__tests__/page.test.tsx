import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }))

// The row's edit control is a client component that reaches for the app
// router, which nothing mounts under a bare render().
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/community-requests",
}))

vi.mock("@/lib/community/admin-requests", () => ({
  fetchDuplicateKeys: vi.fn(),
}))

vi.mock("@/lib/community/admin-requests-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/community/admin-requests-query")>()
  return {
    ...actual,
    fetchAdminRequests: vi.fn(),
    fetchRequestStats: vi.fn(),
  }
})

import { requireAdmin } from "@/lib/auth"
import { fetchDuplicateKeys } from "@/lib/community/admin-requests"
import {
  PAGE_SIZE,
  fetchAdminRequests,
  fetchRequestStats,
} from "@/lib/community/admin-requests-query"
import AdminCommunityRequestsPage from "../page"

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>
const mockFetchDuplicateKeys = fetchDuplicateKeys as ReturnType<typeof vi.fn>
const mockFetchAdminRequests = fetchAdminRequests as ReturnType<typeof vi.fn>
const mockFetchRequestStats = fetchRequestStats as ReturnType<typeof vi.fn>

function makeRequest(index: number) {
  return {
    id: `req-${index}`,
    userId: null,
    fullName: `Pemohon ${index}`,
    phone: `08128405${String(index).padStart(4, "0")}`,
    normalizedPhone: `628128405${String(index).padStart(4, "0")}`,
    socialUsername: `@pemohon${index}`,
    normalizedSocialUsername: `pemohon${index}`,
    intent: "mau tau update info umroh mandiri",
    status: "NEW" as const,
    adminNote: "",
    createdAt: new Date("2026-07-27T04:49:00Z"),
    updatedAt: new Date("2026-07-27T04:49:00Z"),
    possibleDuplicate: false,
    duplicateByPhone: false,
    duplicateBySocial: false,
  }
}

type QueuedPage = {
  requests?: ReturnType<typeof makeRequest>[]
  total?: number
  page?: number
  pageCount?: number
  stats?: { total: number; newCount: number; matchedCount: number; duplicateCount: number }
}

function queuePage(options: QueuedPage = {}) {
  const requests = options.requests ?? []
  const total = options.total ?? requests.length
  const page = options.page ?? 1
  const pageCount = options.pageCount ?? Math.max(1, Math.ceil(total / PAGE_SIZE))
  const stats = options.stats ?? { total, newCount: total, matchedCount: 0, duplicateCount: 0 }

  mockFetchDuplicateKeys.mockResolvedValue({ phones: new Set(), socials: new Set() })
  mockFetchRequestStats.mockResolvedValue(stats)
  mockFetchAdminRequests.mockResolvedValue({ requests, total, page, pageCount })
}

beforeEach(() => {
  mockRequireAdmin.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("AdminCommunityRequestsPage", () => {
  it("renders only one page of rows when the table is large", async () => {
    const requests = Array.from({ length: PAGE_SIZE }, (_, index) => makeRequest(index))
    queuePage({ requests, total: 1616 })

    render(await AdminCommunityRequestsPage({ searchParams: {} }))

    expect(screen.getAllByText(/^Pemohon \d+$/)).toHaveLength(PAGE_SIZE)
  })

  it("guards the page behind requireAdmin before reading anything", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("forbidden"))

    await expect(AdminCommunityRequestsPage({ searchParams: {} })).rejects.toThrow("forbidden")
    expect(mockFetchAdminRequests).not.toHaveBeenCalled()
    expect(mockFetchDuplicateKeys).not.toHaveBeenCalled()
  })

  it("passes the parsed filters through to the query layer", async () => {
    queuePage({ requests: [makeRequest(1)], total: 1 })

    render(
      await AdminCommunityRequestsPage({
        searchParams: { status: "MATCHED", q: "irham", dup: "1", page: "2" },
      })
    )

    expect(mockFetchAdminRequests).toHaveBeenCalledWith(
      { status: "MATCHED", q: "irham", duplicatesOnly: true, page: 2 },
      expect.anything()
    )
  })

  it("shows whole-table stats rather than the filtered count", async () => {
    queuePage({
      requests: [makeRequest(1)],
      total: 3,
      stats: { total: 1616, newCount: 1612, matchedCount: 4, duplicateCount: 240 },
    })

    render(await AdminCommunityRequestsPage({ searchParams: { status: "MATCHED" } }))

    expect(
      screen.getByText(/1616 pengajuan tersimpan, 1612 baru, 4 sudah dicocokkan, 240 kemungkinan duplikat/)
    ).toBeDefined()
  })

  it("offers a clear-filter escape when a filter matched nothing", async () => {
    queuePage({ requests: [], total: 0 })

    render(await AdminCommunityRequestsPage({ searchParams: { q: "tidakada" } }))

    expect(screen.getByText(/Tidak ada pengajuan yang cocok dengan filter ini/)).toBeDefined()
    expect(screen.getByRole("link", { name: "Hapus filter" }).getAttribute("href")).toBe(
      "/admin/community-requests"
    )
  })

  it("shows the plain empty state when there are no requests at all", async () => {
    queuePage({ requests: [], total: 0 })

    render(await AdminCommunityRequestsPage({ searchParams: {} }))

    expect(screen.getByText("Belum ada pengajuan komunitas.")).toBeDefined()
    expect(screen.queryByRole("link", { name: "Hapus filter" })).toBeNull()
  })

  it("keeps the active filter in the pagination links", async () => {
    queuePage({ requests: [makeRequest(1)], total: 100, page: 2, pageCount: 4 })

    render(await AdminCommunityRequestsPage({ searchParams: { status: "NEW", page: "2" } }))

    const nav = screen.getByRole("navigation", { name: "Navigasi halaman pengajuan" })
    expect(within(nav).getByRole("link", { name: "Berikutnya" }).getAttribute("href")).toBe(
      "/admin/community-requests?status=NEW&page=3"
    )
    expect(within(nav).getByRole("link", { name: "Sebelumnya" }).getAttribute("href")).toBe(
      "/admin/community-requests?status=NEW"
    )
  })

  it("disables Previous on the first page and Next on the last", async () => {
    queuePage({ requests: [makeRequest(1)], total: 30, page: 1, pageCount: 2 })

    const { unmount } = render(await AdminCommunityRequestsPage({ searchParams: {} }))
    let nav = screen.getByRole("navigation", { name: "Navigasi halaman pengajuan" })
    expect(within(nav).queryByRole("link", { name: "Sebelumnya" })).toBeNull()
    expect(within(nav).getByRole("link", { name: "Berikutnya" })).toBeDefined()
    unmount()

    queuePage({ requests: [makeRequest(1)], total: 30, page: 2, pageCount: 2 })
    render(await AdminCommunityRequestsPage({ searchParams: { page: "2" } }))
    nav = screen.getByRole("navigation", { name: "Navigasi halaman pengajuan" })
    expect(within(nav).getByRole("link", { name: "Sebelumnya" })).toBeDefined()
    expect(within(nav).queryByRole("link", { name: "Berikutnya" })).toBeNull()
  })

  it("reports the served range, which reflects a clamped page", async () => {
    queuePage({ requests: [makeRequest(1)], total: 30, page: 2, pageCount: 2 })

    render(await AdminCommunityRequestsPage({ searchParams: { page: "999" } }))

    expect(screen.getByText(/Menampilkan 26-30 dari 30 pengajuan/)).toBeDefined()
  })

  it("hides pagination entirely when there is nothing to page through", async () => {
    queuePage({ requests: [], total: 0 })

    render(await AdminCommunityRequestsPage({ searchParams: {} }))

    expect(screen.queryByRole("navigation", { name: "Navigasi halaman pengajuan" })).toBeNull()
  })
})
