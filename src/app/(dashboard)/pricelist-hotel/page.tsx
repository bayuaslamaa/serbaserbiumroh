import { PricelistClient } from "@/components/pricelist-hotel/pricelist-client"
import { requireAuth } from "@/shared/auth"
import { db } from "@/shared/db"
import { composePricelist, fetchPricelistRows } from "@/shared/hotels/pricelist"
import { formatImportDate } from "@/shared/hotels/pricing"

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
 */
export default async function PricelistHotelPage() {
  // Repeated even though app/(dashboard)/layout.tsx already guards the group --
  // that layout's own comment records the convention and the reason. It stays
  // strictly ahead of the query, and not merely alongside it in a Promise.all:
  // a redirect that fires after the read has already paid for the read.
  await requireAuth()

  const hotels = composePricelist(await fetchPricelistRows(db))

  // The oldest and newest per-hotel imports. One maximum date across the whole
  // catalogue overstates freshness after a partial import: a single updated
  // hotel would make every other hotel look current. The range shows that
  // unevenness BETWEEN hotels, and only that -- composePricelist already
  // collapses each hotel's rows to their own maximum updatedAt, so a hotel
  // where one month was corrected still reports fresh for all twelve. Hence the
  // rendered wording "per hotel": within a hotel, the uneven state is invisible
  // here and would need a per-month date to surface (R7).
  const importRange = hotels.reduce<{ oldest: Date; newest: Date } | null>((range, hotel) => {
    if (!range) return { oldest: hotel.updatedAt, newest: hotel.updatedAt }
    return {
      oldest: hotel.updatedAt < range.oldest ? hotel.updatedAt : range.oldest,
      newest: hotel.updatedAt > range.newest ? hotel.updatedAt : range.newest,
    }
  }, null)

  // Formatted before they are compared, because the comparison has to be about
  // what the reader sees. Comparing the instants -- getTime() -- printed
  // "9 Agu 2026–9 Agu 2026" whenever two imports landed on the same calendar
  // day, which is exactly the partial-correction workflow the range exists for.
  const importDates = importRange && {
    oldest: formatImportDate(importRange.oldest),
    newest: formatImportDate(importRange.newest),
  }

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

      {importDates && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Pembaruan data per hotel: {importDates.oldest}
          {importDates.newest !== importDates.oldest && `–${importDates.newest}`}.
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
