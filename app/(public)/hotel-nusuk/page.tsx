import { db } from '@/lib/db'
import { hotelPrices, hotelMonthlyPrices, exchangeRates, hotelBookingOffers } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { HotelPriceList, type HotelWithMonthlyPrices } from '@/components/hotel-nusuk/HotelPriceList'
import {
  HotelBookingOfferCatalog,
  type HotelBookingOfferCatalogItem,
} from '@/components/hotel-nusuk/HotelBookingOfferCatalog'
import { buildHotelBookingWhatsappHref } from '@/lib/hotel-booking/whatsapp'

export const revalidate = 3600

export const metadata = {
  title: 'Hotel Nusuk — Umroh Mandiri',
  description: 'Direktori hotel umroh, estimasi harga, dan offer booking manual',
}

export default async function HotelNusukPage() {
  const [hotels, monthlyPrices, rateRows, bookingOffers] = await Promise.all([
    db
      .select()
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.city), asc(hotelPrices.label)),
    db.select().from(hotelMonthlyPrices),
    db.select().from(exchangeRates).where(eq(exchangeRates.currency, 'SAR')),
    db
      .select()
      .from(hotelBookingOffers)
      .where(eq(hotelBookingOffers.status, 'ACTIVE'))
      .orderBy(asc(hotelBookingOffers.city), asc(hotelBookingOffers.periodStart), asc(hotelBookingOffers.hotelName)),
  ])

  const sarToIdrRate = rateRows[0]?.rateToIdr ?? 4700

  // Group monthly price overrides by hotelPriceId
  const monthlyPricesByHotelId: Record<string, Record<number, number>> = {}
  for (const mp of monthlyPrices) {
    if (!monthlyPricesByHotelId[mp.hotelPriceId]) {
      monthlyPricesByHotelId[mp.hotelPriceId] = {}
    }
    monthlyPricesByHotelId[mp.hotelPriceId][mp.month] = mp.sarPerNight
  }

  // Map each hotel to its 12-month pricing structure
  const mappedHotels: HotelWithMonthlyPrices[] = hotels.map((h) => {
    const monthlyPricesDetail = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const overrideSar = monthlyPricesByHotelId[h.id]?.[month]
      const isOverride = overrideSar !== undefined && overrideSar !== null
      const sar = isOverride ? overrideSar : h.sarPerNight
      const idr = sar * sarToIdrRate
      return {
        month,
        sar,
        idr,
        isOverride,
      }
    })

    return {
      id: h.id,
      city: h.city,
      tier: h.tier,
      label: h.label,
      sublabel: h.sublabel,
      distance: h.distance,
      agodaUrl: h.agodaUrl,
      bookingcomUrl: h.bookingcomUrl,
      tripcomUrl: h.tripcomUrl,
      bookingUrl: h.bookingUrl,
      sarPerNight: h.sarPerNight,
      monthlyPrices: monthlyPricesDetail,
    }
  })

  const showMonthlyPrices = process.env.NEXT_PUBLIC_SHOW_MONTHLY_HOTEL_PRICE === 'true'
  const adminWhatsapp = process.env.NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL

  const mappedBookingOffers: HotelBookingOfferCatalogItem[] = bookingOffers.map((offer) => ({
    id: offer.id,
    city: offer.city,
    tier: offer.tier,
    hotelName: offer.hotelName,
    offerLabel: offer.offerLabel,
    periodLabel: offer.periodLabel,
    periodStart: toDateString(offer.periodStart),
    periodEnd: toDateString(offer.periodEnd),
    roomBasis: offer.roomBasis,
    currency: offer.currency,
    priceAmount: offer.priceAmount,
    notes: offer.notes,
    terms: offer.terms,
    whatsappHref: buildHotelBookingWhatsappHref(adminWhatsapp, offer),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Hotel Nusuk
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Direktori hotel umroh dengan estimasi harga IDR terkini dan offer booking manual via WhatsApp.
      </p>

      <HotelBookingOfferCatalog offers={mappedBookingOffers} />

      <section className="space-y-5">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            Estimasi Harga Hotel
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Referensi harga per malam untuk perencanaan biaya umroh mandiri.
          </p>
        </div>

        {mappedHotels.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada data hotel.
          </p>
        ) : (
          <HotelPriceList
            hotels={mappedHotels}
            exchangeRate={sarToIdrRate}
            showMonthlyPrices={showMonthlyPrices}
          />
        )}
      </section>
    </div>
  )
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10)
}
