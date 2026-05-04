import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { pilgrimStories } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { StoriesTableActions } from "./StoriesTableActions"

export const metadata = { title: "Admin — Cerita Jamaah" }

const MONTH_LABELS = [
  "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]

const HOTEL_TIER_LABELS: Record<string, string> = {
  ECONOMY: "Economy",
  STANDARD: "Standard",
  PELATARAN: "Pelataran",
  PREMIUM: "Premium",
}

export default async function AdminStoriesPage() {
  await requireAdmin()

  const stories = await db
    .select()
    .from(pilgrimStories)
    .orderBy(desc(pilgrimStories.createdAt))

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            Cerita Jamaah
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {stories.length} cerita tersimpan.
          </p>
        </div>
        <Link
          href="/admin/content/stories/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--color-gold)", color: "#1a1206" }}
        >
          + Buat Cerita
        </Link>
      </div>

      <div
        className="rounded-lg border overflow-x-auto"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <table className="w-full min-w-[800px]">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {["Penulis", "Kota", "Perjalanan", "Pax", "Tier Hotel", "Status", "Unggulan", "Aksi"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stories.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm italic"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Belum ada cerita. Buat cerita pertama!
                </td>
              </tr>
            )}
            {stories.map((s) => (
              <tr
                key={s.id}
                className="border-t"
                style={{ borderColor: "var(--color-border)" }}
              >
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {s.authorName}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {s.departureCity}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {s.travelMonth && s.travelYear
                    ? `${MONTH_LABELS[s.travelMonth]} ${s.travelYear}`
                    : s.travelYear
                    ? s.travelYear
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {s.pax}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {HOTEL_TIER_LABELS[s.hotelTier] ?? s.hotelTier}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={s.isPublished ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {s.isPublished ? "Publik" : "Draft"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {s.isFeatured ? (
                    <Badge variant="default" className="text-xs">
                      Unggulan
                    </Badge>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StoriesTableActions
                    id={s.id}
                    isPublished={s.isPublished}
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
