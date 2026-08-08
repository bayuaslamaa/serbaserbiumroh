import { PricelistClient } from "@/components/pricelist-hotel/PricelistClient"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { composePricelist, fetchPricelistRows } from "@/lib/hotels/pricelist"

export const metadata = { title: "Pricelist Hotel" }

/**
 * No `revalidate`. app/(public)/hotel-nusuk/page.tsx sets one because it is a
 * public page Next can cache; this one calls requireAuth(), which reads
 * cookies, so the route is dynamic per request whatever the export says. A
 * `revalidate = 3600` here would be inert and would read as a promise the page
 * does not keep -- that the catalogue is an hour stale at worst, when in fact
 * it is re-queried every visit. `dynamic = "force-dynamic"` is left off for the
 * same reason: the cookie read already opts out, and no other (dashboard) page
 * declares one.
 *
 * The dateFormatter mirrors the "Diperbarui" line in PricelistClient.
 * Duplicated rather than shared: that module is "use client", so a helper
 * pulled out of it is a client reference this server component cannot call.
 */
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export default async function PricelistHotelPage() {
  // Repeated even though app/(dashboard)/layout.tsx already guards the group --
  // that layout's own comment records the convention and the reason. It stays
  // strictly ahead of the query, and not merely alongside it in a Promise.all:
  // a redirect that fires after the read has already paid for the read.
  await requireAuth()

  const hotels = composePricelist(await fetchPricelistRows(db))

  // The newest import across every hotel. The database lags the source CSV
  // between imports, and nothing else on the page tells the reader which import
  // they are looking at (R7).
  const lastImportedAt = hotels.reduce<Date | null>(
    (latest, hotel) => (latest && latest >= hotel.updatedAt ? latest : hotel.updatedAt),
    null,
  )

  return (
    <div className="max-w-6xl mx-auto">
      <h1
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
      >
        Pricelist Hotel
      </h1>

      {/* Load-bearing, not decoration. The second sentence is what keeps a
          member from reading a catalogue rate as the price their estimate
          quoted: the estimate has its own resolution path, which may fall back
          to a QUAD rate or to a non-catalogue figure for the same hotel and
          month. Without it, every such mismatch becomes a support message. */}
      <p
        className="mt-2 max-w-3xl text-sm leading-relaxed"
        style={{ color: "var(--color-text-muted)" }}
      >
        Angka di halaman ini adalah tarif katalog supplier: SAR, per kamar, per malam, apa adanya
        tanpa konversi. Angka ini belum tentu sama dengan yang dipakai sebuah estimasi untuk hotel
        dan bulan yang sama.
      </p>

      {lastImportedAt && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Data per {dateFormatter.format(lastImportedAt)}.
        </p>
      )}

      <div className="mt-6">
        {hotels.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Belum ada tarif katalog yang tersimpan.
          </p>
        ) : (
          // No capability prop: access is "any signed-in user", so admin and
          // member see the same page and an always-true flag would imply a
          // distinction that does not exist.
          <PricelistClient hotels={hotels} />
        )}
      </div>
    </div>
  )
}
