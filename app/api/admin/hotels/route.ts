import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hotelListings } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

const CITIES = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

export async function GET() {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const hotels = await db
    .select()
    .from(hotelListings)
    .orderBy(desc(hotelListings.createdAt))

  return NextResponse.json({ hotels })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { slug, name, city, tier, distanceMeters, facilities, pilgrimNotes, isPublished } = body

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 })
  }
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 })
  }
  if (!CITIES.includes(city as string)) {
    return NextResponse.json({ error: "invalid city" }, { status: 400 })
  }
  if (!HOTEL_TIERS.includes(tier as string)) {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 })
  }

  const hotelData = {
    slug: (slug as string).trim(),
    name: (name as string).trim(),
    city: city as "MAKKAH" | "MADINAH",
    tier: tier as "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM",
    distanceMeters: typeof distanceMeters === "number" ? distanceMeters : null,
    facilities: typeof facilities === "string" ? facilities : "",
    pilgrimNotes: typeof pilgrimNotes === "string" ? pilgrimNotes : "",
    isPublished: isPublished === true,
  }

  const [hotel] = await db.insert(hotelListings).values(hotelData).returning()

  return NextResponse.json({ hotel }, { status: 201 })
}
