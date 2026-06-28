"use client"

import { useState } from "react"
import { Search, MapPin, Building, CalendarDays, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type HotelBookingOfferCatalogItem = {
  id: string
  city: "MAKKAH" | "MADINAH"
  tier: "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  hotelName: string
  offerLabel: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  roomBasis: string
  currency: string
  priceAmount: number
  notes: string
  terms: string
  whatsappHref: string
}

type Props = {
  offers: HotelBookingOfferCatalogItem[]
}

const CITIES = ["MAKKAH", "MADINAH"] as const
const TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const

export function HotelBookingOfferCatalog({ offers }: Props) {
  const [city, setCity] = useState("Semua")
  const [tier, setTier] = useState("Semua")
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = offers.filter((offer) => {
    if (city !== "Semua" && offer.city !== city) return false
    if (tier !== "Semua" && offer.tier !== tier) return false
    if (searchQuery.trim() && !offer.hotelName.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <section className="space-y-5">
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Booking Manual Tersedia
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Pilih offer yang sedang dibuka, lalu lanjutkan request ke admin WhatsApp. Ketersediaan akhir tetap dicek manual ke hotel.
        </p>
      </div>

      {offers.length === 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Belum ada offer hotel yang sedang dibuka. Silakan cek kembali nanti atau hubungi admin untuk bantuan manual.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 p-4 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)]">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Cari offer hotel..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-40 bg-[rgba(255,255,255,0.03)]">
                  <SelectValue placeholder="Kota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Kota</SelectItem>
                  {CITIES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="w-40 bg-[rgba(255,255,255,0.03)]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Tier</SelectItem>
                  {TIERS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] px-1">
            <span>Menampilkan {filtered.length} dari {offers.length} offer booking</span>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardContent className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                Tidak ada offer yang cocok dengan pencarian dan filter Anda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filtered.map((offer) => (
                <Card
                  key={offer.id}
                  className="hover:border-yellow-600 transition-colors flex flex-col h-full"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-[var(--color-gold)]">
                      {offer.hotelName}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="flex items-center gap-1 text-[10px] py-0 px-2">
                        <MapPin className="h-2.5 w-2.5" />
                        {offer.city}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 text-[10px] py-0 px-2">
                        <Building className="h-2.5 w-2.5" />
                        {offer.tier}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 text-[10px] py-0 px-2">
                        <CalendarDays className="h-2.5 w-2.5" />
                        {offer.periodLabel || `${offer.periodStart} - ${offer.periodEnd}`}
                      </Badge>
                    </div>
                    {offer.offerLabel && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5 italic">
                        {offer.offerLabel}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 flex-grow flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                          Harga Katalog
                        </div>
                        <div className="mt-1 text-xl font-semibold" style={{ color: "var(--color-text)" }}>
                          {offer.currency} {offer.priceAmount.toLocaleString("id-ID")}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                          {offer.roomBasis}
                        </div>
                      </div>

                      {(offer.notes || offer.terms) && (
                        <div className="space-y-2 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                          {offer.notes && <p>{offer.notes}</p>}
                          {offer.terms && <p>{offer.terms}</p>}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                        Payment, verifikasi, dan konfirmasi booking dilanjutkan manual setelah admin cek ketersediaan akhir.
                      </p>
                      {offer.whatsappHref ? (
                        <a
                          href={offer.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                          style={{ background: "var(--color-gold)", color: "#1a1206" }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Ajukan Booking via WhatsApp
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold opacity-60"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                        >
                          WhatsApp belum tersedia
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
