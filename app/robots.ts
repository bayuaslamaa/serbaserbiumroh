import type { MetadataRoute } from "next"

import { PROTECTED_PREFIXES, SITE_URL } from "@/lib/seo/config"

/**
 * Served at /robots.txt.
 *
 * This only executes because middleware.ts excludes /robots.txt from its
 * matcher -- middleware intercepting a metadata route prevents the handler
 * from running at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PROTECTED_PREFIXES.map((prefix) => `${prefix}/`),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
