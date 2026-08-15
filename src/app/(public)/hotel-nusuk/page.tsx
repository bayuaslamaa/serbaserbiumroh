import { db } from '@/shared/db'
import { hotelPrices, hotelMonthlyPrices, exchangeRates } from '@/shared/db/schema'
import { eq, asc } from 'drizzle-orm'
import { HotelPriceList, type HotelWithMonthlyPrices } from '@/components/hotel-nusuk/hotel-price-list'
import { pageMetadata } from '@/shared/seo/metadata'
import { buildMonthlyPrices } from '@/shared/hotels/pricing'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'Hotel Nusuk: Direktori Hotel Umroh Makkah & Madinah',
  description:
    'Direktori hotel umroh di Makkah dan Madinah dengan estimasi harga per malam dalam Rupiah, jarak ke Masjidil Haram dan Masjid Nabawi, serta tautan pemesanan langsung.',
  path: '/hotel-nusuk',
})

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

  // Shared with the detail page so the two can never quote different prices
  // for the same hotel.
  const mappedHotels: HotelWithMonthlyPrices[] = hotels.map((h) => {
    const monthlyPricesDetail = buildMonthlyPrices(
      h.sarPerNight,
      monthlyPricesByHotelId[h.id] ?? {},
      sarToIdrRate,
    )

    return {
      id: h.id,
      slug: h.slug,
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
