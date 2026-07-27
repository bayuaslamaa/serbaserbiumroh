import Link from "next/link"
import type {
  AdminRequestFilters,
  AdminRequestStats,
  RawSearchParams,
} from "@/lib/community/admin-requests-query"
import { buildAdminRequestsHref } from "@/lib/community/admin-requests-url"

type CommunityRequestsStatsProps = {
  stats: AdminRequestStats
  filters: AdminRequestFilters
  searchParams: RawSearchParams
}

/**
 * The counts describe the whole table, never the active filter -- numbers that
 * track the filter just restate it ("1612 new" out of 1612 rows) and stop being
 * useful as navigation.
 *
 * These cards are the only status/duplicate filter surface. A second chip row
 * beside them would mean two controls doing one job, and the reader has to work
 * out whether they differ.
 */
export function CommunityRequestsStats({
  stats,
  filters,
  searchParams,
}: CommunityRequestsStatsProps) {
  function statusCard(
    key: string,
    label: string,
    value: number,
    status: "NEW" | "MATCHED" | "REJECTED"
  ) {
    const active = filters.status === status
    return {
      key,
      label,
      value,
      active,
      // Clicking the active card clears it, so the row doubles as its own reset.
      href: buildAdminRequestsHref(searchParams, { status: active ? null : status }),
    }
  }

  const cards = [
    {
      key: "total",
      label: "Total pengajuan",
      value: stats.total,
      active: filters.status === "ALL" && !filters.duplicatesOnly,
      href: buildAdminRequestsHref(searchParams, { status: null, dup: null }),
    },
    statusCard("new", "Baru", stats.newCount, "NEW"),
    statusCard("matched", "Sudah dicocokkan", stats.matchedCount, "MATCHED"),
    statusCard("rejected", "Ditolak", stats.rejectedCount, "REJECTED"),
    {
      key: "duplicates",
      label: "Kemungkinan duplikat",
      value: stats.duplicateCount,
      active: filters.duplicatesOnly,
      href: buildAdminRequestsHref(searchParams, {
        dup: filters.duplicatesOnly ? null : "1",
      }),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          aria-current={card.active ? "page" : undefined}
          className="rounded-lg border px-4 py-3 transition-colors hover:border-[var(--color-gold)]"
          style={{
            borderColor: card.active ? "var(--color-gold)" : "var(--color-border)",
            background: card.active ? "rgba(201,168,76,0.08)" : "var(--color-surface)",
          }}
        >
          <span
            className="block text-xl font-bold"
            style={{ color: card.active ? "var(--color-gold)" : "var(--color-text)" }}
          >
            {card.value.toLocaleString("id-ID")}
          </span>
          <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
            {card.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
