import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelListings, hotelPrices } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import { buildHotelBookingOfferTemplateCsv } from "@/lib/admin/hotel-booking-offer-import"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [hotels, listings] = await Promise.all([
    db
      .select({
        city: hotelPrices.city,
        tier: hotelPrices.tier,
        label: hotelPrices.label,
        sublabel: hotelPrices.sublabel,
        distance: hotelPrices.distance,
        sarPerNight: hotelPrices.sarPerNight,
      })
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.city), asc(hotelPrices.label)),
    db
      .select({
        city: hotelListings.city,
        tier: hotelListings.tier,
        name: hotelListings.name,
        slug: hotelListings.slug,
      })
      .from(hotelListings),
  ])
  const csv = buildHotelBookingOfferTemplateCsv(hotels, listings)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hotel-booking-offers-hotel-nusuk.csv"',
    },
  })
}
