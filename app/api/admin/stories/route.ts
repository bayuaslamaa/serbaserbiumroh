import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
  pilgrimStories,
  storyItineraryDays,
  storyPackingItems,
} from "@/lib/db/schema"
import { desc } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

export async function GET() {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const stories = await db
    .select()
    .from(pilgrimStories)
    .orderBy(desc(pilgrimStories.createdAt))

  return NextResponse.json({ stories })
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

  const {
    slug,
    authorName,
    departureCity,
    travelMonth,
    travelYear,
    pax,
    hotelTier,
    airlineTier,
    makkahNights,
    madinahNights,
    totalBudgetIdr,
    narrative,
    isPublished,
    isFeatured,
    itineraryDays,
    packingItems,
  } = body

  if (typeof authorName !== "string" || !authorName.trim()) {
    return NextResponse.json({ error: "authorName required" }, { status: 400 })
  }
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 })
  }
  if (typeof departureCity !== "string" || !departureCity.trim()) {
    return NextResponse.json({ error: "departureCity required" }, { status: 400 })
  }
  if (typeof pax !== "number" || pax < 1) {
    return NextResponse.json({ error: "pax must be a positive number" }, { status: 400 })
  }

  const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
  if (!HOTEL_TIERS.includes(hotelTier as string)) {
    return NextResponse.json({ error: "invalid hotelTier" }, { status: 400 })
  }
  if (typeof totalBudgetIdr !== "number" || totalBudgetIdr < 0) {
    return NextResponse.json({ error: "totalBudgetIdr must be a non-negative number" }, { status: 400 })
  }

  const storyData = {
    slug: (slug as string).trim(),
    authorName: (authorName as string).trim(),
    departureCity: (departureCity as string).trim(),
    travelMonth: typeof travelMonth === "number" ? travelMonth : null,
    travelYear: typeof travelYear === "number" ? travelYear : null,
    pax: pax as number,
    hotelTier: hotelTier as "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM",
    airlineTier: airlineTier as "BUDGET" | "STANDARD" | "GARUDA" | "BUSINESS" | null ?? null,
    makkahNights: typeof makkahNights === "number" ? makkahNights : 0,
    madinahNights: typeof madinahNights === "number" ? madinahNights : 0,
    totalBudgetIdr: totalBudgetIdr as number,
    narrative: typeof narrative === "string" ? narrative : "",
    isPublished: isPublished === true,
    isFeatured: isFeatured === true,
  }

  const days = Array.isArray(itineraryDays) ? itineraryDays as Array<Record<string, unknown>> : []
  const items = Array.isArray(packingItems) ? packingItems as Array<Record<string, unknown>> : []

  let story: typeof pilgrimStories.$inferSelect

  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(pilgrimStories).values(storyData).returning()
    story = inserted

    if (days.length > 0) {
      await tx.insert(storyItineraryDays).values(
        days.map((d, i) => ({
          storyId: story.id,
          dayNumber: typeof d.dayNumber === "number" ? d.dayNumber : i + 1,
          label: typeof d.label === "string" ? d.label : "",
          description: typeof d.description === "string" ? d.description : "",
        }))
      )
    }

    if (items.length > 0) {
      await tx.insert(storyPackingItems).values(
        items.map((p, i) => ({
          storyId: story.id,
          category: typeof p.category === "string" ? p.category : "",
          itemName: typeof p.itemName === "string" ? p.itemName : "",
          sortOrder: typeof p.sortOrder === "number" ? p.sortOrder : i,
        }))
      )
    }
  })

  return NextResponse.json({ story: story! }, { status: 201 })
}
