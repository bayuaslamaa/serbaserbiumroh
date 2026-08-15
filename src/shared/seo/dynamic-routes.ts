import { asc, eq } from 'drizzle-orm';

import { getArticles } from '@/packages/article/domain/articles';
import { db } from '@/shared/db';
import { hotelPrices, pilgrimStories } from '@/shared/db/schema';
import { getAllGuides, HTML_PUBLISHED_SLUGS } from '@/packages/panduan/domain/panduan';

export interface DynamicRoute {
  path: string;
  lastModified?: Date;
}

const safely = async <T>(label: string, load: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await load();
  } catch (error) {
    console.error(`Sitemap: could not load ${label}; omitting that section.`, error);
    return [];
  }
};

export const guideRoutes = (): DynamicRoute[] => {
  try {
    return getAllGuides()
      .filter((guide) => HTML_PUBLISHED_SLUGS.has(guide.slug))
      .map((guide) => ({ path: `/panduan/${guide.slug}` }));
  } catch (error) {
    console.error('Sitemap: could not read the panduan directory.', error);
    return [];
  }
};

export const articleRoutes = (): Promise<DynamicRoute[]> => {
  return getArticles({ limit: 200 }).then(({ items }) =>
    items.map((article) => ({
      path: `/artikel/${article.slug}`,
      lastModified: new Date(article.updatedAt),
    })),
  );
};

export const hotelRoutes = (): Promise<DynamicRoute[]> => {
  return safely('hotel slugs', async () => {
    const rows = await db
      .select({ slug: hotelPrices.slug, updatedAt: hotelPrices.updatedAt })
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.slug));

    return rows
      .filter((row): row is { slug: string; updatedAt: Date } => Boolean(row.slug))
      .map((row) => ({ path: `/hotel-nusuk/${row.slug}`, lastModified: row.updatedAt }));
  });
};

export const storyRoutes = (): Promise<DynamicRoute[]> => {
  return safely('pilgrim stories', async () => {
    const rows = await db
      .select({ slug: pilgrimStories.slug, updatedAt: pilgrimStories.updatedAt })
      .from(pilgrimStories)
      .where(eq(pilgrimStories.isPublished, true))
      .orderBy(asc(pilgrimStories.slug));

    return rows.map((row) => ({ path: `/cerita-jamaah/${row.slug}`, lastModified: row.updatedAt }));
  });
};
