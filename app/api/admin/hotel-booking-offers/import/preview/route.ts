import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelBookingOffers, hotelListings } from "@/lib/db/schema"
import {
  HOTEL_BOOKING_OFFER_IMPORT_MAX_BYTES,
  HOTEL_BOOKING_OFFER_IMPORT_MAX_ROWS,
  parseHotelBookingOfferCsv,
} from "@/lib/admin/hotel-booking-offer-import"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: { csv?: unknown }
  try {
    const parsedBody: unknown = await req.json()
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 })
    }
    body = parsedBody as { csv?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.csv !== "string" || body.csv.trim().length === 0) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 })
  }
  if (Buffer.byteLength(body.csv, "utf8") > HOTEL_BOOKING_OFFER_IMPORT_MAX_BYTES) {
    return NextResponse.json(
      { error: `csv must be ${HOTEL_BOOKING_OFFER_IMPORT_MAX_BYTES} bytes or less` },
      { status: 413 }
    )
  }

  const [existingOffers, existingListings] = await Promise.all([
    db.select().from(hotelBookingOffers),
    db.select({ id: hotelListings.id, slug: hotelListings.slug }).from(hotelListings),
  ])
  const preview = parseHotelBookingOfferCsv(body.csv, {
    existingOffers,
    hotelListings: existingListings,
  })
  if (preview.rows.length > HOTEL_BOOKING_OFFER_IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `csv must contain ${HOTEL_BOOKING_OFFER_IMPORT_MAX_ROWS} rows or fewer` },
      { status: 413 }
    )
  }

  return NextResponse.json({ preview })
}
