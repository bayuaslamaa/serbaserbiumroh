import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelPrices } from "@/lib/db/schema"
import { HOTEL_PRICING_IMPORT_MAX_BYTES, HOTEL_PRICING_IMPORT_MAX_ROWS } from "@/lib/admin/hotel-pricing-import"
import { parseRealHotelPricingCsv, applyRealHotelPricing } from "@/lib/admin/real-hotel-pricing-import"

// Import a real hotel price catalog (transcribed to the hotel-pricing CSV shape) into
// real_hotel_prices. Reuses the estimate CSV format; prices attach to existing hotels only, and
// every write is tagged with the catalog's sourceLabel. The estimate tables are never touched.
// A dedicated admin UI is deferred — this endpoint is the data path.

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: { csv?: unknown; sourceLabel?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.csv !== "string" || body.csv.trim().length === 0) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 })
  }
  if (typeof body.sourceLabel !== "string" || body.sourceLabel.trim().length === 0) {
    return NextResponse.json({ error: "sourceLabel is required (name of the price catalog)" }, { status: 400 })
  }
  if (Buffer.byteLength(body.csv, "utf8") > HOTEL_PRICING_IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: `csv must be ${HOTEL_PRICING_IMPORT_MAX_BYTES} bytes or less` }, { status: 413 })
  }

  const existingHotels = await db.select().from(hotelPrices)
  const plan = parseRealHotelPricingCsv(body.csv, existingHotels, body.sourceLabel.trim())
  if (plan.fileErrors.length > 0) {
    return NextResponse.json({ error: plan.fileErrors.join("; "), fileErrors: plan.fileErrors }, { status: 400 })
  }
  // Match the sibling estimate importer's row cap so a within-byte-limit CSV can't drive an
  // unbounded per-(hotel,month) upsert loop inside a single transaction.
  if (plan.rowsParsed > HOTEL_PRICING_IMPORT_MAX_ROWS) {
    return NextResponse.json({ error: `csv must contain ${HOTEL_PRICING_IMPORT_MAX_ROWS} rows or fewer` }, { status: 413 })
  }

  const imported = await db.transaction((tx) => applyRealHotelPricing(tx, plan))

  return NextResponse.json({
    imported,
    hotelsMatched: plan.hotelsMatched,
    unmatched: plan.unmatched,
    rowErrors: plan.rowErrors,
  })
}
