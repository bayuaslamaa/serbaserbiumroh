import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./config"

/**
 * schema.org JSON-LD builders.
 *
 * These return plain objects so they can be asserted directly in tests without
 * rendering. Serialization and escaping happen in components/seo/JsonLd.tsx.
 *
 * Rule of thumb for every builder here: only describe what the page actually
 * shows. Markup that overstates the content -- a SearchAction with no site
 * search, an Offer for a price we merely estimate -- is what earns a manual
 * action, and it is a much more expensive mistake than omitting the markup.
 */

export interface JsonLdObject {
  "@context": string
  "@type": string
  [key: string]: unknown
}

const WHATSAPP_NUMBER = "+6285161134844"

export function buildOrganizationSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "SSU",
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    description: SITE_DESCRIPTION,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: WHATSAPP_NUMBER,
      availableLanguage: ["id"],
    },
    // sameAs is deliberately absent. The only social link in the codebase is a
    // personal Instagram account, not an official organisation profile, and
    // claiming it here would assert an identity we cannot back up. Add real
    // org-owned profiles when they exist.
  }
}

export function buildWebSiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "id-ID",
    // No potentialAction/SearchAction: the site has no search endpoint, and
    // declaring one Google cannot exercise is a markup/content mismatch.
  }
}

export interface BreadcrumbItem {
  name: string
  /** Site-relative path, e.g. "/hotel-nusuk". */
  path: string
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
