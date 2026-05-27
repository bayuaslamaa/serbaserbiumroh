import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { pilgrimStories, storyItineraryDays, storyPackingItems } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { StoryDetail } from '@/components/cerita-jamaah/StoryDetail'
import { auth } from '@/auth'

// Allow slugs not pre-generated at build time to be rendered dynamically
export const dynamicParams = true

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const stories = await db
      .select({ slug: pilgrimStories.slug })
      .from(pilgrimStories)
      .where(eq(pilgrimStories.isPublished, true))

    return stories.map((s) => ({ slug: s.slug }))
  } catch {
    // DB not available at build time (e.g., migrations not run yet)
    return []
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const [story] = await db
    .select()
    .from(pilgrimStories)
    .where(eq(pilgrimStories.slug, slug))

  if (!story || !story.isPublished) return {}

  return {
    title: `Cerita ${story.authorName} — Umroh Mandiri`,
    description: `Pengalaman umroh mandiri dari ${story.departureCity}, ${story.pax} orang, hotel ${story.hotelTier}`,
  }
}

export default async function StoryDetailPage({ params }: Props) {
  const { slug } = await params

  const [story] = await db
    .select()
    .from(pilgrimStories)
    .where(eq(pilgrimStories.slug, slug))

  if (!story || !story.isPublished) {
    notFound()
  }

  const [itinerary, packing] = await Promise.all([
    db
      .select()
      .from(storyItineraryDays)
      .where(eq(storyItineraryDays.storyId, story.id))
      .orderBy(asc(storyItineraryDays.dayNumber)),
    db
      .select()
      .from(storyPackingItems)
      .where(eq(storyPackingItems.storyId, story.id))
      .orderBy(asc(storyPackingItems.sortOrder)),
  ])

  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <StoryDetail
      story={story}
      itineraryDays={itinerary}
      packingItems={packing}
      isAdmin={isAdmin}
    />
  )
}
