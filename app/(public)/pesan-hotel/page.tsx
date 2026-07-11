import { db } from '@/lib/db'
import { hotelBookingOffers } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { HotelBookingSearchForm } from '@/components/hotel-booking/HotelBookingSearchForm'
import {
  HotelBookingSearchResults,
  type HotelBookingRateResult,
} from '@/components/hotel-booking/HotelBookingSearchResults'
import { buildHotelBookingWhatsappHref } from '@/lib/hotel-booking/whatsapp'
import {
  buildHotelBookingQuote,
  hasCompleteHotelBookingSearch,
  hotelBookingOfferMatchesSearch,
  parseHotelBookingSearchParams,
} from '@/lib/hotel-booking/search'

export const revalidate = 3600

export const metadata = {
  title: 'Pesan Hotel — Umroh Mandiri',
  description: 'Cari hotel berdasarkan tanggal dan ajukan booking manual via WhatsApp',
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PesanHotelPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const search = parseHotelBookingSearchParams(resolvedSearchParams)
  const bookingOffers = await db
    .select()
    .from(hotelBookingOffers)
    .where(eq(hotelBookingOffers.status, 'ACTIVE'))
    .orderBy(
      asc(hotelBookingOffers.city),
      asc(hotelBookingOffers.sortOrder),
      asc(hotelBookingOffers.periodStart),
      asc(hotelBookingOffers.hotelName)
    )

  const adminWhatsapp = process.env.NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL
  const completeSearch = search.ok && hasCompleteHotelBookingSearch(search.params)
  const results: HotelBookingRateResult[] = completeSearch
    ? bookingOffers
      .filter((offer) => hotelBookingOfferMatchesSearch(offer, search.params))
      .map((offer) => {
        const quote = buildHotelBookingQuote(offer, search.params)
        return {
          id: offer.id,
          hotelKey: `${offer.hotelListingId ?? "standalone"}:${offer.city}:${offer.tier}:${offer.hotelName}`,
          hotelName: offer.hotelName,
          city: offer.city,
          tier: offer.tier,
          roomType: offer.roomType || 'Standard Room',
          rateLabel: offer.rateLabel,
          offerLabel: offer.offerLabel,
          periodLabel: offer.periodLabel,
          roomBasis: offer.roomBasis,
          currency: offer.currency,
          priceAmount: offer.priceAmount,
          inclusions: offer.inclusions,
          cancellationPolicy: offer.cancellationPolicy,
          notes: offer.notes,
          terms: offer.terms,
          quote,
          whatsappHref: buildHotelBookingWhatsappHref(adminWhatsapp, offer, quote),
        }
      })
    : []

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          Pesan Hotel
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Pilih tanggal menginap untuk melihat quote hotel yang sedang dibuka, lalu ajukan request ke admin WhatsApp.
          Availability akhir, payment, dan konfirmasi booking tetap dilanjutkan manual.
        </p>
      </div>

      <HotelBookingSearchForm
        key={JSON.stringify(search.params)}
        initialParams={search.params}
        errors={search.errors}
      />
      <HotelBookingSearchResults
        params={completeSearch ? search.params : undefined}
        results={results}
        hasActiveOffers={bookingOffers.length > 0}
      />
    </div>
  )
}
