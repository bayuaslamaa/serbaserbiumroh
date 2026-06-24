import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { hotelBookingOffers, hotelListings } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { HotelBookingOfferForm } from "@/components/admin/hotel-booking-offers/HotelBookingOfferForm"

export const metadata = { title: "Admin — Edit Offer Booking Hotel" }

type PageProps = { params: Promise<{ id: string }> }

export default async function EditHotelBookingOfferPage({ params }: PageProps) {
  await requireAdmin()

  const { id } = await params

  const [[offer], listings] = await Promise.all([
    db
      .select()
      .from(hotelBookingOffers)
      .where(eq(hotelBookingOffers.id, id))
      .limit(1),
    db
      .select({
        id: hotelListings.id,
        name: hotelListings.name,
        slug: hotelListings.slug,
        city: hotelListings.city,
        tier: hotelListings.tier,
      })
      .from(hotelListings)
      .orderBy(asc(hotelListings.name)),
  ])

  if (!offer) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/content/hotel-booking-offers"
          className="text-sm mb-3 inline-block hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← Kembali ke daftar
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Edit Offer Booking
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          {offer.hotelName} — {offer.city}
        </p>
      </div>

      <HotelBookingOfferForm
        hotelListings={listings}
        initialData={{
          id: offer.id,
          hotelListingId: offer.hotelListingId,
          city: offer.city,
          tier: offer.tier,
          hotelName: offer.hotelName,
          offerLabel: offer.offerLabel,
          periodStart: toInputDate(offer.periodStart),
          periodEnd: toInputDate(offer.periodEnd),
          periodLabel: offer.periodLabel,
          roomBasis: offer.roomBasis,
          currency: offer.currency,
          priceAmount: offer.priceAmount,
          status: offer.status,
          notes: offer.notes,
          terms: offer.terms,
        }}
      />
    </div>
  )
}

function toInputDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}
