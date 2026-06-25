import { db } from '@/lib/db'
import { hotelPrices, hotelMonthlyPrices, exchangeRates } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { HotelPriceList, type HotelWithMonthlyPrices } from '@/components/hotel-nusuk/HotelPriceList'

export const revalidate = 3600

export const metadata = {
  title: 'Hotel Nusuk — Umroh Mandiri',
  description: 'Direktori hotel umroh dengan estimasi harga IDR terkini',
}

export default async function HotelNusukPage() {
  const [hotels, monthlyPrices, rateRows] = await Promise.all([
    db
      .select()
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.city), asc(hotelPrices.label)),
    db.select().from(hotelMonthlyPrices),
    db.select().from(exchangeRates).where(eq(exchangeRates.currency, 'SAR')),
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

  return (
    <div className="max-w-5xl mx-auto">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Hotel Nusuk
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
        Direktori hotel umroh dengan estimasi harga IDR terkini
      </p>

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
    </div>
  )
}
