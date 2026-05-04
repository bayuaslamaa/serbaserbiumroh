import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelListings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

type RouteCtx = { params: Promise<{ id: string }> }

const CITIES = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await ctx.params

  const [hotel] = await db
    .select()
    .from(hotelListings)
    .where(eq(hotelListings.id, id))
    .limit(1)

  if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 })

  return NextResponse.json({ hotel })
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

  const { slug, name, city, tier, distanceMeters, facilities, pilgrimNotes, isPublished } = body

  if (city !== undefined && !CITIES.includes(city as string)) {
    return NextResponse.json({ error: "invalid city" }, { status: 400 })
  }
  if (tier !== undefined && !HOTEL_TIERS.includes(tier as string)) {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 })
  }

  const hotelData: Partial<typeof hotelListings.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  }

  if (typeof slug === "string") hotelData.slug = slug.trim()
  if (typeof name === "string") hotelData.name = name.trim()
  if (typeof city === "string") hotelData.city = city as "MAKKAH" | "MADINAH"
  if (typeof tier === "string") hotelData.tier = tier as "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  if (typeof distanceMeters === "number") hotelData.distanceMeters = distanceMeters
  if (distanceMeters === null) hotelData.distanceMeters = null
  if (typeof facilities === "string") hotelData.facilities = facilities
  if (typeof pilgrimNotes === "string") hotelData.pilgrimNotes = pilgrimNotes
  if (typeof isPublished === "boolean") hotelData.isPublished = isPublished

  const [updated] = await db
    .update(hotelListings)
    .set(hotelData)
    .where(eq(hotelListings.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Hotel not found" }, { status: 404 })

  return NextResponse.json({ hotel: updated })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await ctx.params

  const [deleted] = await db
    .delete(hotelListings)
    .where(eq(hotelListings.id, id))
    .returning()

  if (!deleted) return NextResponse.json({ error: "Hotel not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
