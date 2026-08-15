import Link from "next/link"
import { CommunityRequestRow } from "@/components/admin/community-requests/community-request-row"
import { CommunityRequestsPagination } from "@/components/admin/community-requests/community-requests-pagination"
import { CommunityRequestsStats } from "@/components/admin/community-requests/community-requests-stats"
import { CommunityRequestsToolbar } from "@/components/admin/community-requests/community-requests-toolbar"
import { requireAdmin } from "@/shared/auth"
import { fetchDuplicateKeys } from "@/shared/community/admin-requests"
import {
  fetchAdminRequests,
  fetchRequestStats,
  parseAdminRequestFilters,
  type RawSearchParams,
} from "@/shared/community/admin-requests-query"
import { ADMIN_REQUESTS_PATH } from "@/shared/community/admin-requests-url"

export const metadata = { title: "Admin — Pengajuan Komunitas" }

const COLUMNS = ["Pemohon", "Alasan", "Masuk", "Status", ""]

export default async function AdminCommunityRequestsPage({
  searchParams = {},
}: {
  // Next 14 hands searchParams to a page as a plain synchronous object. This is
  // not the Promise-shaped `params` that route handlers receive.
  searchParams?: RawSearchParams
}) {
  await requireAdmin()

  const filters = parseAdminRequestFilters(searchParams)
  const duplicateKeys = await fetchDuplicateKeys()
  const [stats, { requests, total, page, pageCount }] = await Promise.all([
    fetchRequestStats(duplicateKeys),
    fetchAdminRequests(filters, duplicateKeys),
  ])

  const isFiltered = filters.status !== "ALL" || filters.q !== "" || filters.duplicatesOnly

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Pengajuan Komunitas
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Kelola pengajuan bergabung komunitas dan tandai yang sudah dicocokkan.
        </p>
      </div>

      <CommunityRequestsStats stats={stats} filters={filters} searchParams={searchParams} />

      <CommunityRequestsToolbar q={filters.q} />

      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <table className="w-full">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {COLUMNS.map((heading, index) => (
                <th
                  key={heading || `actions-${index}`}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {heading || <span className="sr-only">Aksi</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {isFiltered ? (
                    <span>
                      Tidak ada pengajuan yang cocok dengan filter ini.{" "}
                      <Link href={ADMIN_REQUESTS_PATH} style={{ color: "var(--color-gold)" }}>
                        Hapus filter
                      </Link>
                    </span>
                  ) : (
                    <span className="italic">Belum ada pengajuan komunitas.</span>
                  )}
                </td>
              </tr>
            )}
            {requests.map((request) => (
              <CommunityRequestRow key={request.id} request={request} />
            ))}
          </tbody>
        </table>
      </div>

      <CommunityRequestsPagination
        page={page}
        pageCount={pageCount}
        total={total}
        searchParams={searchParams}
      />
    </div>
  )
}
