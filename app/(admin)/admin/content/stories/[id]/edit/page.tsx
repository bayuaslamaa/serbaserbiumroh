import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  pilgrimStories,
  storyItineraryDays,
  storyPackingItems,
} from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { StoryForm } from "@/components/admin/stories/StoryForm"

export const metadata = { title: "Admin — Edit Cerita" }

type PageProps = { params: Promise<{ id: string }> }

export default async function EditStoryPage({ params }: PageProps) {
  await requireAdmin()

  const { id } = await params

  const [story] = await db
    .select()
    .from(pilgrimStories)
    .where(eq(pilgrimStories.id, id))
    .limit(1)

  if (!story) notFound()

  const [days, items] = await Promise.all([
    db
      .select()
      .from(storyItineraryDays)
      .where(eq(storyItineraryDays.storyId, id))
      .orderBy(asc(storyItineraryDays.dayNumber)),
    db
      .select()
      .from(storyPackingItems)
      .where(eq(storyPackingItems.storyId, id))
      .orderBy(asc(storyPackingItems.sortOrder)),
  ])

  const initialData = {
    id: story.id,
    slug: story.slug,
    authorName: story.authorName,
    departureCity: story.departureCity,
    travelMonth: story.travelMonth,
    travelYear: story.travelYear,
    pax: story.pax,
    hotelTier: story.hotelTier,
    airlineTier: story.airlineTier ?? null,
    makkahNights: story.makkahNights,
    madinahNights: story.madinahNights,
    totalBudgetIdr: story.totalBudgetIdr,
    narrative: story.narrative,
    isPublished: story.isPublished,
    isFeatured: story.isFeatured,
    itineraryDays: days.map((d) => ({
      dayNumber: d.dayNumber,
      label: d.label,
      description: d.description,
    })),
    packingItems: items.map((p) => ({
      category: p.category,
      itemName: p.itemName,
      sortOrder: p.sortOrder,
    })),
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/content/stories"
          className="text-sm mb-3 inline-block hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← Kembali ke daftar
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Edit Cerita
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          {story.authorName} — {story.departureCity}
        </p>
      </div>

      <StoryForm initialData={initialData} />
    </div>
  )
}
