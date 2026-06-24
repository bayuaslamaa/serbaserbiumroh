import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { hotelListings } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import Link from "next/link"
import { HotelBookingOfferForm } from "@/components/admin/hotel-booking-offers/HotelBookingOfferForm"

export const metadata = { title: "Admin — Tambah Offer Booking Hotel" }

export default async function NewHotelBookingOfferPage() {
  await requireAdmin()

  const listings = await db
    .select({
      id: hotelListings.id,
      name: hotelListings.name,
      slug: hotelListings.slug,
      city: hotelListings.city,
      tier: hotelListings.tier,
    })
    .from(hotelListings)
    .orderBy(asc(hotelListings.name))

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
          Tambah Offer Booking
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Tambahkan harga dan periode yang bisa diajukan jamaah via WhatsApp.
        </p>
      </div>

      <HotelBookingOfferForm hotelListings={listings} />
    </div>
  )
}
