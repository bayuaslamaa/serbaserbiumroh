import { notFound } from 'next/navigation';
import { db } from '@/shared/db';
import { pilgrimStories, storyItineraryDays, storyPackingItems } from '@/shared/db/schema';
import { eq, asc } from 'drizzle-orm';
import { StoryDetail } from '@/packages/story/presentation/view/story-detail';
import { JsonLd } from '@/components/atoms/json-ld';
import { auth } from '@/shared/auth/next-auth';
import { buildStoryMeta } from '@/packages/story/domain/metadata';
import { buildArticleSchema, buildBreadcrumbSchema } from '@/shared/seo/schema';

export interface Props {
  params: Promise<{ slug: string }>;
}

export const CeritaJamaahDetailView = async ({ params }: Props) => {
  const { slug } = await params;

  const [story] = await db.select().from(pilgrimStories).where(eq(pilgrimStories.slug, slug));

  if (!story || !story.isPublished) {
    notFound();
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
  ]);

  const session = await auth();
  const isAdmin = session?.user?.role === 'ADMIN';

  const { title, description } = buildStoryMeta(story);
  const path = `/cerita-jamaah/${slug}`;

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
  );
};
