import { db } from '@/lib/db'
import { hotelListings, hotelPrices, exchangeRates } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { HotelFilters } from '@/components/hotel-nusuk/HotelFilters'

export const revalidate = 3600

export const metadata = {
  title: 'Hotel Nusuk — Umroh Mandiri',
  description: 'Direktori hotel umroh dengan estimasi harga IDR terkini',
}

export default async function HotelNusukPage() {
  const [hotels, prices, rateRows] = await Promise.all([
    db
      .select()
      .from(hotelListings)
      .where(eq(hotelListings.isPublished, true))
      .orderBy(asc(hotelListings.city), asc(hotelListings.name)),
    db.select().from(hotelPrices),
    db.select().from(exchangeRates).where(eq(exchangeRates.currency, 'SAR')),
  ])

  const sarToIdrRate = rateRows[0]?.rateToIdr ?? 4700

  // Build price map: { "MAKKAH_STANDARD": idrPerNight, ... }
  const priceMap: Record<string, number> = {}
  for (const price of prices) {
    const key = `${price.city}_${price.tier}`
    priceMap[key] = price.sarPerNight * sarToIdrRate
  }

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

      {hotels.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          Belum ada data hotel.
        </p>
      ) : (
        <HotelFilters hotels={hotels} priceMap={priceMap} />
      )}
    </div>
  )
}
