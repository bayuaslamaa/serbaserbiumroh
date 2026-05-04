import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { hotelListings } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { HotelsTableActions } from "./HotelsTableActions"

export const metadata = { title: "Admin — Hotel Nusuk" }

const CITY_LABELS: Record<string, string> = {
  MAKKAH: "Makkah",
  MADINAH: "Madinah",
}

const TIER_LABELS: Record<string, string> = {
  ECONOMY: "Economy",
  STANDARD: "Standard",
  PELATARAN: "Pelataran",
  PREMIUM: "Premium",
}

function formatDistance(meters: number | null): string {
  if (meters === null) return "—"
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`
  }
  return `${meters}m`
}

export default async function AdminHotelsPage() {
  await requireAdmin()

  const hotels = await db
    .select()
    .from(hotelListings)
    .orderBy(desc(hotelListings.createdAt))

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            Hotel Nusuk
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {hotels.length} hotel tersimpan.
          </p>
        </div>
        <Link
          href="/admin/content/hotels/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--color-gold)", color: "#1a1206" }}
        >
          + Tambah Hotel
        </Link>
      </div>

      <div
        className="rounded-lg border overflow-x-auto"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <table className="w-full min-w-[700px]">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {["Nama Hotel", "Kota", "Tier", "Jarak", "Status", "Aksi"].map((h) => (
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
            {hotels.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm italic"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Belum ada hotel. Tambahkan hotel pertama!
                </td>
              </tr>
            )}
            {hotels.map((h) => (
              <tr
                key={h.id}
                className="border-t"
                style={{ borderColor: "var(--color-border)" }}
              >
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {h.name}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {CITY_LABELS[h.city] ?? h.city}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {TIER_LABELS[h.tier] ?? h.tier}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {formatDistance(h.distanceMeters)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={h.isPublished ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {h.isPublished ? "Publik" : "Draft"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <HotelsTableActions
                    id={h.id}
                    isPublished={h.isPublished}
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
