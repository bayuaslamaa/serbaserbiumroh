'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CalendarDays, Search, MapPin, Building, Ruler, ExternalLink } from 'lucide-react'
import { HotelNusukDisclaimerPopup } from '@/components/hotel-nusuk/HotelNusukDisclaimerPopup'
import {
  MONTH_NAMES,
  formatCompactIdr,
  formatFullIdr,
  type MonthlyPriceDetail,
} from '@/lib/hotels/pricing'
import { bookingLinks } from '@/lib/hotels/presentation'

export interface HotelWithMonthlyPrices {
  id: string
  /** Null only for rows the backfill has not reached; those render unlinked. */
  slug: string | null
  city: 'MAKKAH' | 'MADINAH'
  tier: 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM'
  label: string
  sublabel: string
  distance: string | null
  agodaUrl: string | null
  bookingcomUrl: string | null
  tripcomUrl: string | null
  bookingUrl: string | null
  sarPerNight: number
  monthlyPrices: MonthlyPriceDetail[]
}

interface HotelPriceListProps {
  hotels: HotelWithMonthlyPrices[]
  exchangeRate: number
  showMonthlyPrices?: boolean
}

const CITIES = ['MAKKAH', 'MADINAH'] as const
const TIERS = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'] as const

function getPreferredBookingLink(hotel: HotelWithMonthlyPrices): { href: string; label: string } | null {
  return bookingLinks(hotel)[0] ?? null
}

export function HotelPriceList({
  hotels,
  exchangeRate,
  showMonthlyPrices = true,
}: HotelPriceListProps) {
  const [city, setCity] = useState<string>('Semua')
  const [tier, setTier] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filtered = hotels.filter((hotel) => {
    if (city !== 'Semua' && hotel.city !== city) return false
    if (tier !== 'Semua' && hotel.tier !== tier) return false
    if (
      searchQuery.trim() !== '' &&
      !hotel.label.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <HotelNusukDisclaimerPopup />
      {/* Search and Filters panel */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)]">
        {/* Search input */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <Input
            placeholder="Cari nama hotel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger
              className="w-40"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: 'var(--color-text)',
              }}
            >
              <SelectValue placeholder="Kota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Kota</SelectItem>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger
              className="w-40"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: 'var(--color-text)',
              }}
            >
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Tier</SelectItem>
              {TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] px-1">
        <span>Menampilkan {filtered.length} dari {hotels.length} hotel</span>
        {showMonthlyPrices && (
          <span>Kurs acuan: 1 SAR = {formatFullIdr(exchangeRate)}</span>
        )}
      </div>

      {/* Grid of hotel cards */}
      {filtered.length === 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Tidak ada hotel yang cocok dengan pencarian dan filter Anda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((hotel) => (
            (() => {
              const preferredBookingLink = getPreferredBookingLink(hotel)

              return (
                <Card
                  key={hotel.id}
                  className="hover:border-yellow-600 transition-colors flex flex-col h-full"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  {/* Card Header */}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-[var(--color-gold)]">
                      {hotel.slug ? (
                        <Link href={`/hotel-nusuk/${hotel.slug}`} className="hover:underline">
                          {hotel.label}
                        </Link>
                      ) : (
                        hotel.label
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-[10px] py-0 px-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        {hotel.city}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-[10px] py-0 px-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      >
                        <Building className="h-2.5 w-2.5" />
                        {hotel.tier}
                      </Badge>
                      {hotel.distance && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 text-[10px] py-0 px-2"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                        >
                          <Ruler className="h-2.5 w-2.5" />
                          {hotel.distance}
                        </Badge>
                      )}
                    </div>
                    {hotel.sublabel && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5 italic">
                        {hotel.sublabel}
                      </p>
                    )}
                  </CardHeader>

                  {/* Card Content with 12-Month Pricing */}
                  <CardContent className="pt-0 flex-grow flex flex-col justify-between">
                    {showMonthlyPrices ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-gold)] font-semibold mb-3 border-b border-[var(--color-border)] pb-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>Estimasi Harga per Malam (IDR & SAR)</span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {hotel.monthlyPrices.map((mp) => (
                            <div
                              key={mp.month}
                              className={`p-2 rounded text-center transition-colors flex flex-col justify-center ${
                                mp.isOverride
                                  ? 'bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.3)]'
                                  : 'bg-black/10 border border-transparent'
                              }`}
                              title={`${MONTH_NAMES[mp.month - 1]}: ${formatFullIdr(mp.idr)} (${mp.sar} SAR) per malam${
                                mp.isOverride ? ' (Harga Musiman)' : ''
                              }`}
                            >
                              <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">
                                {MONTH_NAMES[mp.month - 1]}
                                {mp.isOverride && <span className="text-[var(--color-gold)] ml-0.5 font-bold">•</span>}
                              </span>
                              <span className="text-[11px] font-semibold text-[var(--color-text)] block mt-0.5">
                                {formatCompactIdr(mp.idr)}
                              </span>
                              <span className="text-[9px] text-[var(--color-text-muted)] block">
                                {mp.sar} SAR
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center items-center py-6">
                        <p className="text-xs text-[var(--color-text-muted)] text-center mb-4 leading-relaxed">
                          Hubungi admin untuk mendapatkan informasi estimasi harga terbaru hotel ini.
                        </p>
                        <a
                          href={(() => {
                            const adminPhone = process.env.NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL || ''
                            const cleanPhone = adminPhone.startsWith('http') ? adminPhone : `https://wa.me/${adminPhone}`
                            const text = encodeURIComponent(`Assalamu'alaikum Admin, saya ingin menanyakan estimasi harga terbaru untuk hotel ${hotel.label} (${hotel.city}).`)
                            return adminPhone.startsWith('http') ? adminPhone : `${cleanPhone}?text=${text}`
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            track(ANALYTICS_EVENTS.CONTACT.HOTEL_WA_CLICK, {
                              hotel: hotel.label,
                              city: hotel.city,
                            })
                          }
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md border transition-all duration-200 w-full sm:w-auto text-center"
                          style={{
                            borderColor: 'var(--color-gold)',
                            color: 'var(--color-gold)',
                            backgroundColor: 'rgba(201, 168, 76, 0.05)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(201, 168, 76, 0.15)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(201, 168, 76, 0.05)'
                            e.currentTarget.style.transform = 'none'
                          }}
                        >
                          Tanyakan Harga ke Admin
                        </a>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                      {showMonthlyPrices ? (
                        <span>Baseline: {hotel.sarPerNight} SAR ({formatCompactIdr(hotel.sarPerNight * exchangeRate)})</span>
                      ) : (
                        <span>Referensi OTA dapat berubah saat approval dan pembelian.</span>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {showMonthlyPrices && (
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]"></span>
                            Harga Musiman
                          </span>
                        )}
                        {preferredBookingLink && (
                          <a
                            href={preferredBookingLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] font-medium"
                            style={{
                              borderColor: 'var(--color-gold)',
                              color: 'var(--color-gold)',
                              backgroundColor: 'rgba(201, 168, 76, 0.05)',
                            }}
                          >
                            Buka {preferredBookingLink.label}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()
          ))}
        </div>
      )}
    </div>
  )
}
