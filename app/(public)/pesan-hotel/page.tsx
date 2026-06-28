import { db } from '@/lib/db'
import { hotelBookingOffers } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import {
  HotelBookingOfferCatalog,
  type HotelBookingOfferCatalogItem,
} from '@/components/hotel-nusuk/HotelBookingOfferCatalog'
import { buildHotelBookingWhatsappHref } from '@/lib/hotel-booking/whatsapp'

export const revalidate = 3600

export const metadata = {
  title: 'Pesan Hotel — Umroh Mandiri',
  description: 'Katalog offer hotel yang dapat direquest manual via WhatsApp',
}

export default async function PesanHotelPage() {
  const bookingOffers = await db
    .select()
    .from(hotelBookingOffers)
    .where(eq(hotelBookingOffers.status, 'ACTIVE'))
    .orderBy(asc(hotelBookingOffers.city), asc(hotelBookingOffers.periodStart), asc(hotelBookingOffers.hotelName))

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          Pesan Hotel
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Pilih offer hotel yang sedang dibuka, lalu lanjutkan request ke admin WhatsApp.
          Payment, cek ketersediaan akhir, dan konfirmasi booking tetap dilanjutkan manual.
        </p>
      </div>

      <HotelBookingOfferCatalog offers={mappedBookingOffers} />
    </div>
  )
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10)
}
