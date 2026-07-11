import { BedDouble, CalendarDays, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { HotelBookingQuote, HotelBookingSearchParams } from "@/lib/hotel-booking/search"
import { formatHotelBookingPrice } from "@/lib/hotel-booking/whatsapp"

export type HotelBookingRateResult = {
  id: string
  hotelKey: string
  hotelName: string
  city: "MAKKAH" | "MADINAH"
  tier: "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  roomType: string
  rateLabel: string
  offerLabel: string
  periodLabel: string
  roomBasis: string
  currency: string
  priceAmount: number
  inclusions: string
  cancellationPolicy: string
  notes: string
  terms: string
  quote: HotelBookingQuote
  whatsappHref: string
}

type Props = {
  params?: HotelBookingSearchParams
  results: HotelBookingRateResult[]
  hasActiveOffers: boolean
}

const CITY_LABELS: Record<string, string> = {
  MAKKAH: "Makkah",
  MADINAH: "Madinah",
}

export function HotelBookingSearchResults({ params, results, hasActiveOffers }: Props) {
  if (!params) {
    return (
      <section className="rounded-lg border p-6 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
        Pilih tanggal check-in dan check-out untuk melihat quote hotel yang bisa direquest manual.
      </section>
    )
  }

  if (results.length === 0) {
    return (
      <section className="rounded-lg border p-6 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
        {hasActiveOffers
          ? "Belum ada rate hotel yang cocok dengan tanggal dan filter ini. Coba ubah tanggal atau hubungi admin untuk bantuan manual."
          : "Belum ada rate hotel yang sedang dibuka. Silakan cek kembali nanti atau hubungi admin untuk bantuan manual."}
      </section>
    )
  }

  const groups = groupByHotel(results)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <span>
          Menampilkan {results.length} rate untuk {params.nights} malam, {params.rooms} kamar, {params.adults} dewasa
        </span>
        <span>
          {params.checkIn} - {params.checkOut}
        </span>
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <article
            key={group.hotelKey}
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>
                    {group.hotelName}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {CITY_LABELS[group.city] ?? group.city}
                    </Badge>
                    <Badge variant="outline">{group.tier}</Badge>
                  </div>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Quote katalog. Availability, payment, dan konfirmasi tetap manual.
                </div>
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {group.rates.map((rate) => (
                <div key={rate.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_220px]">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                        {rate.roomType}
                      </h3>
                      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {rate.rateLabel || rate.offerLabel || rate.roomBasis}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2" style={{ color: "var(--color-text-muted)" }}>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {params.checkIn} - {params.checkOut}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {params.adults} dewasa, {params.rooms} kamar
                      </span>
                      {rate.inclusions && (
                        <span className="inline-flex items-center gap-2">
                          <BedDouble className="h-4 w-4" />
                          {rate.inclusions}
                        </span>
                      )}
                      {rate.cancellationPolicy && (
                        <span className="inline-flex items-center gap-2 text-green-500">
                          <ShieldCheck className="h-4 w-4" />
                          {rate.cancellationPolicy}
                        </span>
                      )}
                    </div>
                    {(rate.notes || rate.terms) && (
                      <div className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                        {rate.notes && <p>{rate.notes}</p>}
                        {rate.terms && <p>{rate.terms}</p>}
                      </div>
                    )}
                  </div>

                  <div className="text-sm lg:text-right" style={{ color: "var(--color-text-muted)" }}>
                    <div>Per malam</div>
                    <div className="mt-1 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                      {formatHotelBookingPrice(rate.currency, rate.priceAmount)}
                    </div>
                    <div className="mt-1">
                      {params.nights} malam x {params.rooms} kamar
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-md px-3 py-2 text-center" style={{ background: "rgba(201,168,76,0.08)" }}>
                      <div className="text-xs uppercase" style={{ color: "var(--color-text-muted)" }}>
                        Estimasi total
                      </div>
                      <div className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>
                        {formatHotelBookingPrice(rate.quote.currency, rate.quote.totalAmount)}
                      </div>
                    </div>
                    {rate.whatsappHref ? (
                      <a
                        href={rate.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-gold)", color: "#1a1206" }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Ajukan Booking
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full items-center justify-center rounded-md border px-4 py-2.5 text-sm font-semibold opacity-60"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                      >
                        WhatsApp belum tersedia
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function groupByHotel(results: HotelBookingRateResult[]) {
  const groups = new Map<
    string,
    {
      hotelKey: string
      hotelName: string
      city: HotelBookingRateResult["city"]
      tier: HotelBookingRateResult["tier"]
      rates: HotelBookingRateResult[]
    }
  >()

  for (const result of results) {
    const existing = groups.get(result.hotelKey)
    if (existing) {
      existing.rates.push(result)
      continue
    }
    groups.set(result.hotelKey, {
      hotelKey: result.hotelKey,
      hotelName: result.hotelName,
      city: result.city,
      tier: result.tier,
      rates: [result],
    })
  }

  return Array.from(groups.values())
}
