import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelBookingOffers } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { parseHotelBookingOfferPayload } from "@/lib/admin/hotel-booking-offer-payload"
import { isHotelBookingOfferUniqueViolation } from "@/lib/admin/hotel-booking-offer-errors"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

export async function GET() {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const offers = await db
    .select()
    .from(hotelBookingOffers)
    .orderBy(desc(hotelBookingOffers.updatedAt))

  return NextResponse.json({ offers })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: Record<string, unknown>
  try {
    const parsedBody: unknown = await req.json()
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 })
    }
    body = parsedBody as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = parseHotelBookingOfferPayload(body, { partial: false })
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  let offer: typeof hotelBookingOffers.$inferSelect
  try {
    const created = await db
      .insert(hotelBookingOffers)
      .values(parsed.data as typeof hotelBookingOffers.$inferInsert)
      .returning()
    offer = created[0]
  } catch (error) {
    if (isHotelBookingOfferUniqueViolation(error)) {
      return NextResponse.json({ error: "An offer with the same rate identity already exists" }, { status: 409 })
    }
    throw error
  }

  revalidatePath("/pesan-hotel")

  return NextResponse.json({ offer }, { status: 201 })
}
