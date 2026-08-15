import { requireAdmin } from "@/shared/auth"
import { db } from "@/shared/db"
import { hotelListings } from "@/shared/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { HotelListingForm } from "@/components/admin/hotels/hotel-listing-form"

export const metadata = { title: "Admin — Edit Hotel" }

type PageProps = { params: Promise<{ id: string }> }

export default async function EditHotelPage({ params }: PageProps) {
  await requireAdmin()

  const { id } = await params

  const [hotel] = await db
    .select()
    .from(hotelListings)
    .where(eq(hotelListings.id, id))
    .limit(1)

  if (!hotel) notFound()

  const initialData = {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    tier: hotel.tier,
    distanceMeters: hotel.distanceMeters,
    facilities: hotel.facilities,
    pilgrimNotes: hotel.pilgrimNotes,
    isPublished: hotel.isPublished,
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/content/hotels"
          className="text-sm mb-3 inline-block hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← Kembali ke daftar
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Edit Hotel
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          {hotel.name} — {hotel.city}
        </p>
      </div>

      <HotelListingForm initialData={initialData} />
    </div>
  )
}
