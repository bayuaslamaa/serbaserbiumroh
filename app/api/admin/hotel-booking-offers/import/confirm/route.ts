import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelBookingOffers, hotelListings } from "@/lib/db/schema"
import {
  HOTEL_BOOKING_OFFER_IMPORT_MAX_BYTES,
  HOTEL_BOOKING_OFFER_IMPORT_MAX_ROWS,
  parseHotelBookingOfferCsv,
  type HotelBookingOfferImportRowResult,
} from "@/lib/admin/hotel-booking-offer-import"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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
    body = await req.json()
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

  const writableRows = preview.rows.filter((row) => row.status === "create" || row.status === "update")
  const appliedRows: Array<{
    rowNumber: number
    importKey: string
    status: "create" | "update"
    offerId: string
  }> = []

  if (writableRows.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of writableRows) {
        appliedRows.push(await applyImportRow(tx, row))
      }
    })
    revalidatePath("/hotel-nusuk")
  }

  return NextResponse.json({ preview, applied: writableRows.length, appliedRows })
}

async function applyImportRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  row: HotelBookingOfferImportRowResult
) {
  if (!row.data) throw new Error("Cannot apply import row without parsed data")

  const now = new Date()
  const values = {
    hotelListingId: row.data.hotelListingId,
    city: row.data.city,
    tier: row.data.tier,
    hotelName: row.data.hotelName,
    offerLabel: row.data.offerLabel,
    periodStart: toDate(row.data.periodStart),
    periodEnd: toDate(row.data.periodEnd),
    periodLabel: row.data.periodLabel,
    roomBasis: row.data.roomBasis,
    currency: row.data.currency,
    priceAmount: row.data.priceAmount,
    status: row.data.status,
    notes: row.data.notes,
    terms: row.data.terms,
    importKey: row.data.matchKey,
    updatedAt: now,
  }

  if (row.status === "update" && row.existingOfferId) {
    const [updated] = await tx
      .update(hotelBookingOffers)
      .set(values)
      .where(eq(hotelBookingOffers.id, row.existingOfferId))
      .returning()

    return {
      rowNumber: row.rowNumber,
      importKey: row.data.matchKey,
      status: "update" as const,
      offerId: updated.id,
    }
  }

  const [created] = await tx
    .insert(hotelBookingOffers)
    .values(values)
    .returning()

  return {
    rowNumber: row.rowNumber,
    importKey: row.data.matchKey,
    status: "create" as const,
    offerId: created.id,
  }
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}
