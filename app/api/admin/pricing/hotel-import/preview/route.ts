import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelPrices } from "@/lib/db/schema"
import {
  HOTEL_PRICING_IMPORT_MAX_BYTES,
  HOTEL_PRICING_IMPORT_MAX_ROWS,
  parseHotelPricingCsv,
} from "@/lib/admin/hotel-pricing-import"

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

  return NextResponse.json({ preview })
}
