import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo/config"
import { STATIC_ROUTES } from "@/lib/seo/routes"

/**
 * Served at /sitemap.xml.
 *
 * Static routes only at this stage. Dynamic entries -- hotel detail pages,
 * published pilgrim stories, and the panduan guides -- are added in U7, which
 * is why this is already async.
 *
 * Like robots.ts, this only executes because middleware.ts excludes
 * /sitemap.xml from its matcher.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  return STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
