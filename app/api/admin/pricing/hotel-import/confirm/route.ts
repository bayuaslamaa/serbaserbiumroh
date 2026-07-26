import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelMonthlyPrices, hotelPrices } from "@/lib/db/schema"
import {
  HOTEL_PRICING_IMPORT_MAX_BYTES,
  HOTEL_PRICING_IMPORT_MAX_ROWS,
  parseHotelPricingCsv,
  type HotelPricingImportRowResult,
} from "@/lib/admin/hotel-pricing-import"
import { eq } from "drizzle-orm"
import { nextAvailableSlug } from "@/lib/hotels/slug"

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
  if (Buffer.byteLength(body.csv, "utf8") > HOTEL_PRICING_IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: `csv must be ${HOTEL_PRICING_IMPORT_MAX_BYTES} bytes or less` }, { status: 413 })
  }

  const existingHotels = await db.select().from(hotelPrices)
  const preview = parseHotelPricingCsv(body.csv, { existingHotels })
  if (preview.rows.length > HOTEL_PRICING_IMPORT_MAX_ROWS) {
    return NextResponse.json({ error: `csv must contain ${HOTEL_PRICING_IMPORT_MAX_ROWS} rows or fewer` }, { status: 413 })
  }
  const writableRows = preview.rows.filter((row) => row.status === "create" || row.status === "update")
  const appliedRows: Array<{
    rowNumber: number
    importKey: string
    status: "create" | "update"
    hotelId: string
    monthlyRowCount: number
  }> = []

  if (writableRows.length > 0) {
    await db.transaction(async (tx) => {
      // Read the taken slugs once, then track newly created ones in memory.
      // Re-querying per row turned a 500-row import into 500 full-table scans.
      const takenSlugs = new Set(
        (await tx.select({ slug: hotelPrices.slug }).from(hotelPrices))
          .map((row) => row.slug)
          .filter((slug): slug is string => Boolean(slug)),
      )

      for (const row of writableRows) {
        appliedRows.push(await applyImportRow(tx, row, takenSlugs))
      }
    })
  }

  return NextResponse.json({ preview, applied: writableRows.length, appliedRows })
}

async function applyImportRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  row: HotelPricingImportRowResult,
  /** Slugs already in use, including ones created earlier in this same import. */
  takenSlugs: Set<string>
) {
  if (!row.data) throw new Error("Cannot apply import row without parsed data")

  const now = new Date()
  let hotelId = row.existingHotelId
  const monthlyRows = Object.entries(row.data.monthlyPrices).map(([month, sarPerNight]) => ({
    hotelPriceId: "",
    month: Number(month),
    sarPerNight,
    updatedAt: now,
  }))

  if (row.status === "update" && hotelId) {
    await tx
      .update(hotelPrices)
      .set({
        city: row.data.city,
        tier: row.data.tier,
        label: row.data.label,
        sublabel: row.data.sublabel,
        distance: row.data.distance,
        agodaUrl: row.data.agodaUrl,
        bookingcomUrl: row.data.bookingcomUrl,
        tripcomUrl: row.data.tripcomUrl,
        bookingUrl: row.data.bookingUrl,
        sarPerNight: row.data.sarPerNight,
        importKey: row.data.matchKey,
        updatedAt: now,
      })
      .where(eq(hotelPrices.id, hotelId))
  } else {
    // The update branch above deliberately leaves slug alone: a re-import that
    // renames a hotel must not move its indexed URL.
    const slug = nextAvailableSlug(row.data.label, takenSlugs)
    takenSlugs.add(slug)

    const [created] = await tx
      .insert(hotelPrices)
      .values({
        city: row.data.city,
        tier: row.data.tier,
        slug,
        label: row.data.label,
        sublabel: row.data.sublabel,
        distance: row.data.distance,
        agodaUrl: row.data.agodaUrl,
        bookingcomUrl: row.data.bookingcomUrl,
        tripcomUrl: row.data.tripcomUrl,
        bookingUrl: row.data.bookingUrl,
        sarPerNight: row.data.sarPerNight,
        importKey: row.data.matchKey,
        updatedAt: now,
      })
      .returning()
    hotelId = created.id
  }

  await tx.delete(hotelMonthlyPrices).where(eq(hotelMonthlyPrices.hotelPriceId, hotelId))
  await tx.insert(hotelMonthlyPrices).values(monthlyRows.map((monthlyRow) => ({ ...monthlyRow, hotelPriceId: hotelId! })))

  return {
    rowNumber: row.rowNumber,
    importKey: row.data.matchKey,
    status: row.status as "create" | "update",
    hotelId: hotelId!,
    monthlyRowCount: monthlyRows.length,
  }
}
