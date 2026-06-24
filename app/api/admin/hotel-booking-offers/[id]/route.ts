import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelBookingOffers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  parseHotelBookingOfferPayload,
  toHotelBookingOfferImportKey,
} from "@/lib/admin/hotel-booking-offer-payload"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await ctx.params

  const [offer] = await db
    .select()
    .from(hotelBookingOffers)
    .where(eq(hotelBookingOffers.id, id))
    .limit(1)

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

  return NextResponse.json({ offer })
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const [existing] = await db
    .select()
    .from(hotelBookingOffers)
    .where(eq(hotelBookingOffers.id, id))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

  const parsed = parseHotelBookingOfferPayload(body, { partial: true })
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const merged = {
    ...existing,
    ...parsed.data,
  }

  const [offer] = await db
    .update(hotelBookingOffers)
    .set({
      ...parsed.data,
      importKey: toHotelBookingOfferImportKey({
        city: merged.city,
        tier: merged.tier,
        hotelName: merged.hotelName,
        periodStart: merged.periodStart,
        periodEnd: merged.periodEnd,
        roomBasis: merged.roomBasis,
        offerLabel: merged.offerLabel,
      }),
      updatedAt: new Date(),
    })
    .where(eq(hotelBookingOffers.id, id))
    .returning()

  revalidatePath("/hotel-nusuk")

  return NextResponse.json({ offer })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await ctx.params

  const [deleted] = await db
    .delete(hotelBookingOffers)
    .where(eq(hotelBookingOffers.id, id))
    .returning()

  if (!deleted) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

  revalidatePath("/hotel-nusuk")

  return NextResponse.json({ success: true })
}
