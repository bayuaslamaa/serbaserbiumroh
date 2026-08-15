import { notFound } from 'next/navigation'
import { db } from '@/shared/db'
import { pilgrimStories, storyItineraryDays, storyPackingItems } from '@/shared/db/schema'
import { eq, asc } from 'drizzle-orm'
import { StoryDetail } from '@/components/cerita-jamaah/story-detail'
import { JsonLd } from '@/components/seo/json-ld'
import { auth } from '@/auth'
import { buildStoryMeta } from '@/shared/stories/metadata'
import { pageMetadata } from '@/shared/seo/metadata'
import { buildArticleSchema, buildBreadcrumbSchema } from '@/shared/seo/schema'

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

  const { title, description } = buildStoryMeta(story)

  return pageMetadata({ title, description, path: `/cerita-jamaah/${slug}` })
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

  const { title, description } = buildStoryMeta(story)
  const path = `/cerita-jamaah/${slug}`

  return (
    <>
      <JsonLd
        data={buildArticleSchema({
          headline: title,
          description,
          path,
          authorName: story.authorName,
          datePublished: story.createdAt,
          dateModified: story.updatedAt,
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Beranda', path: '/' },
          { name: 'Cerita Jamaah', path: '/cerita-jamaah' },
          { name: story.authorName, path },
        ])}
      />
      <StoryDetail
        story={story}
        itineraryDays={itinerary}
        packingItems={packing}
        isAdmin={isAdmin}
      />
    </>
  )
}
