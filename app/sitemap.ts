import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo/config"
import { guideRoutes, hotelRoutes, storyRoutes } from "@/lib/seo/dynamic-routes"
import { STATIC_ROUTES } from "@/lib/seo/routes"

/**
 * Served at /sitemap.xml.
 *
 * Only executes because middleware.ts excludes /sitemap.xml from its matcher.
 *
 * Around 100 URLs, well under the 50,000 limit, so this stays a single file
 * rather than a sitemap index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date()

  const [hotels, stories] = await Promise.all([hotelRoutes(), storyRoutes()])
  const guides = guideRoutes()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: generatedAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const guideEntries: MetadataRoute.Sitemap = guides.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  const hotelEntries: MetadataRoute.Sitemap = hotels.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  const storyEntries: MetadataRoute.Sitemap = stories.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  return [...staticEntries, ...guideEntries, ...hotelEntries, ...storyEntries]
}
