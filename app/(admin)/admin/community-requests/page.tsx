import { desc } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { CommunityRequestActions } from "@/components/admin/community-requests/CommunityRequestActions"
import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { communityJoinRequests } from "@/lib/db/schema"
import { addDuplicateFlags } from "@/lib/community/admin-requests"

export const metadata = { title: "Admin — Pengajuan Komunitas" }

const STATUS_LABELS: Record<string, string> = {
  NEW: "Baru",
  MATCHED: "Sudah dicocokkan",
  REJECTED: "Ditolak",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "secondary",
  MATCHED: "default",
  REJECTED: "destructive",
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function truncate(text: string | null, length = 90) {
  if (!text) return "—"
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}...`
}

export default async function AdminCommunityRequestsPage() {
  await requireAdmin()

  const rows = await db
    .select()
    .from(communityJoinRequests)
    .orderBy(desc(communityJoinRequests.createdAt))

  const requests = addDuplicateFlags(rows)
  const newCount = requests.filter((request) => request.status === "NEW").length
  const matchedCount = requests.filter((request) => request.status === "MATCHED").length
  const duplicateCount = requests.filter((request) => request.possibleDuplicate).length

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
          {requests.length} pengajuan tersimpan, {newCount} baru, {matchedCount} sudah dicocokkan, {duplicateCount} kemungkinan duplikat.
        </p>
      </div>

      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <table className="w-full min-w-[1120px]">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {["Nama", "Kontak", "Alasan", "Tanggal", "Status", "Duplikat", "Aksi"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm italic"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Belum ada pengajuan komunitas.
                </td>
              </tr>
            )}
            {requests.map((request) => (
              <tr key={request.id} className="border-t align-top" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {request.fullName}
                  {request.userId && (
                    <span className="mt-1 block text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Terhubung dengan akun
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  <span className="block" style={{ color: "var(--color-text)" }}>{request.phone}</span>
                  <span className="block">{request.socialUsername ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {truncate(request.intent)}
                  {request.adminNote && (
                    <span className="mt-2 block text-xs" style={{ color: "var(--color-gold)" }}>
                      Catatan: {truncate(request.adminNote, 70)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {formatDate(request.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[request.status] ?? "secondary"} className="text-xs">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {request.possibleDuplicate ? (
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs">
                        Cek duplikat
                      </Badge>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {[
                          request.duplicateByPhone ? "nomor" : null,
                          request.duplicateBySocial ? "sosial" : null,
                        ].filter(Boolean).join(" + ")}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CommunityRequestActions
                    id={request.id}
                    status={request.status}
                    adminNote={request.adminNote}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
