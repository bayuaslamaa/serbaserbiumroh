import { asc, eq } from "drizzle-orm"

import { getArticles } from "@/lib/articles"
import { db } from "@/lib/db"
import { hotelPrices, pilgrimStories } from "@/lib/db/schema"
import { getAllGuides, HTML_PUBLISHED_SLUGS } from "@/lib/panduan"

export interface DynamicRoute {
  path: string
  lastModified?: Date
}

/**
 * Each source fails independently and returns an empty list rather than
 * throwing. The sitemap is built at deploy time, and one unreachable table
 * must not take the whole file down -- a sitemap missing its hotel section is
 * far better than a sitemap that 500s.
 */
async function safely<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load()
  } catch (error) {
    console.error(`Sitemap: could not load ${label}; omitting that section.`, error)
    return []
  }
}

export function guideRoutes(): DynamicRoute[] {
  try {
    return getAllGuides()
      .filter((guide) => HTML_PUBLISHED_SLUGS.has(guide.slug))
      .map((guide) => ({ path: `/panduan/${guide.slug}` }))
  } catch (error) {
    console.error("Sitemap: could not read the panduan directory.", error)
    return []
  }
}

export function articleRoutes(): Promise<DynamicRoute[]> {
  return getArticles({ limit: 200 }).then(({ items }) =>
    items.map((article) => ({
      path: `/artikel/${article.slug}`,
      lastModified: new Date(article.updatedAt),
    })),
  )
}

export function hotelRoutes(): Promise<DynamicRoute[]> {
  return safely("hotel slugs", async () => {
    const rows = await db
      .select({ slug: hotelPrices.slug, updatedAt: hotelPrices.updatedAt })
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.slug))

    return rows
      .filter((row): row is { slug: string; updatedAt: Date } => Boolean(row.slug))
      .map((row) => ({ path: `/hotel-nusuk/${row.slug}`, lastModified: row.updatedAt }))
  })
}

export function storyRoutes(): Promise<DynamicRoute[]> {
  return safely("pilgrim stories", async () => {
    // Published only. An unpublished story appearing here would leak a draft
    // to crawlers before its author intended.
    const rows = await db
      .select({ slug: pilgrimStories.slug, updatedAt: pilgrimStories.updatedAt })
      .from(pilgrimStories)
      .where(eq(pilgrimStories.isPublished, true))
      .orderBy(asc(pilgrimStories.slug))

    return rows.map((row) => ({ path: `/cerita-jamaah/${row.slug}`, lastModified: row.updatedAt }))
  })
}
