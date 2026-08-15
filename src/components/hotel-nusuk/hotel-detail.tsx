import Link from "next/link"
import { Building, ExternalLink, MapPin, Ruler } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { HotelDetail as HotelDetailData } from "@/shared/hotels/detail"
import {
  MONTH_NAMES_FULL,
  formatCompactIdr,
  formatFullIdr,
  priceRange,
} from "@/shared/hotels/pricing"
import { CITY_LANDMARK, TIER_LABEL, bookingLinks } from "@/shared/hotels/presentation"

export function HotelDetail({ hotel }: { hotel: HotelDetailData }) {
  const range = priceRange(hotel.monthlyPrices)
  const links = bookingLinks(hotel)
  const landmark = CITY_LANDMARK[hotel.city]

  return (
    <article className="mx-auto max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:underline">Beranda</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/hotel-nusuk" className="hover:underline">Hotel Nusuk</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" style={{ color: "var(--color-text)" }}>{hotel.label}</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          {hotel.label}
        </h1>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="flex items-center gap-1 text-[11px]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
            <MapPin className="h-3 w-3" />
            {hotel.city}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 text-[11px]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
            <Building className="h-3 w-3" />
            {TIER_LABEL[hotel.tier]}
          </Badge>
          {hotel.distance && (
            <Badge variant="outline" className="flex items-center gap-1 text-[11px]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
              <Ruler className="h-3 w-3" />
              {hotel.distance}
            </Badge>
          )}
        </div>

        {hotel.sublabel && (
          <p className="mt-3 text-sm italic" style={{ color: "var(--color-text-muted)" }}>
            {hotel.sublabel}
          </p>
        )}

        {range && (
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Estimasi harga {hotel.label} berkisar{" "}
            <strong style={{ color: "var(--color-text)" }}>{formatFullIdr(range.min)}</strong>
            {range.min !== range.max && (
              <>
                {" "}sampai{" "}
                <strong style={{ color: "var(--color-text)" }}>{formatFullIdr(range.max)}</strong>
              </>
            )}{" "}
            per kamar per malam, tergantung bulan keberangkatan
            {hotel.distance ? `, dengan jarak ${hotel.distance} ke ${landmark}` : ""}.
          </p>
        )}
      </header>

      <section className="mb-8 hidden">
        <h2 className="mb-1 text-xl font-semibold" style={{ color: "var(--color-gold)" }}>
          Harga per Malam Sepanjang Tahun
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Kurs acuan 1 SAR = {formatFullIdr(hotel.exchangeRate)}. Bulan bertanda titik memakai
          harga musiman, bukan harga dasar.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">
              Estimasi harga kamar per malam {hotel.label} untuk setiap bulan
            </caption>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th scope="col" className="py-2 text-left font-semibold">Bulan</th>
                <th scope="col" className="py-2 text-right font-semibold">Estimasi (IDR)</th>
                <th scope="col" className="py-2 text-right font-semibold">SAR</th>
              </tr>
            </thead>
            <tbody>
              {hotel.monthlyPrices.map((price) => (
                <tr key={price.month} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th scope="row" className="py-2 text-left font-normal">
                    {MONTH_NAMES_FULL[price.month - 1]}
                    {price.isOverride && (
                      <span className="ml-1.5 font-bold" style={{ color: "var(--color-gold)" }} title="Harga musiman">
                        •
                      </span>
                    )}
                  </th>
                  <td className="py-2 text-right">{formatFullIdr(price.idr)}</td>
                  <td className="py-2 text-right" style={{ color: "var(--color-text-muted)" }}>
                    {price.sar}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Harga dasar {hotel.sarPerNight} SAR ({formatCompactIdr(hotel.sarPerNight * hotel.exchangeRate)})
          per malam. Angka di atas adalah estimasi untuk perencanaan, bukan penawaran yang mengikat —
          harga final mengikuti tarif saat pemesanan.
        </p>
      </section>

      {hotel.editorial && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold" style={{ color: "var(--color-gold)" }}>
            Catatan untuk Jamaah
          </h2>
          {hotel.editorial.facilities && (
            <p className="mb-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              <span style={{ color: "var(--color-text)" }}>Fasilitas:</span> {hotel.editorial.facilities}
            </p>
          )}
          {hotel.editorial.pilgrimNotes && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {hotel.editorial.pilgrimNotes}
            </p>
          )}
        </section>
      )}

      {links.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold" style={{ color: "var(--color-gold)" }}>
            Cek Ketersediaan
          </h2>
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border px-3 py-2 text-sm font-medium"
                style={{
                  borderColor: "var(--color-gold)",
                  color: "var(--color-gold)",
                  backgroundColor: "rgba(201, 168, 76, 0.05)",
                }}
              >
                Buka {link.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t pt-6 text-sm" style={{ borderColor: "var(--color-border)" }}>
        <Link href="/hotel-nusuk" className="hover:underline" style={{ color: "var(--color-gold)" }}>
          &larr; Lihat semua hotel umroh di Makkah dan Madinah
        </Link>
      </footer>
    </article>
  )
}
