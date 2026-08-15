import type { Props } from '@/packages/story/presentation/view/cerita-jamaah-detail.view';
import { db } from '@/shared/db';
import { pilgrimStories, storyItineraryDays, storyPackingItems } from '@/shared/db/schema';
import { eq, asc } from 'drizzle-orm';
import { buildStoryMeta } from '@/packages/story/domain/metadata';
import { pageMetadata } from '@/shared/seo/metadata';
import { CeritaJamaahDetailView } from '@/packages/story/presentation/view/cerita-jamaah-detail.view';

export const dynamicParams = true;

export const generateStaticParams = async () => {
  try {
    const stories = await db
      .select({ slug: pilgrimStories.slug })
      .from(pilgrimStories)
      .where(eq(pilgrimStories.isPublished, true));

    return stories.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
};

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params;
  const [story] = await db.select().from(pilgrimStories).where(eq(pilgrimStories.slug, slug));

  if (!story || !story.isPublished) return {};

  const { title, description } = buildStoryMeta(story);

  return pageMetadata({ title, description, path: `/cerita-jamaah/${slug}` });
};

export default CeritaJamaahDetailView;
