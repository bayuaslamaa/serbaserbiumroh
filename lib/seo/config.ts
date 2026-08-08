/**
 * Canonical host and site-wide SEO defaults.
 *
 * The apex domain redirects to www, and www is the only host Google has
 * indexed, so www is canonical. Everything that emits an absolute URL --
 * sitemap entries, canonical links, JSON-LD, OpenGraph -- must build it from
 * SITE_URL rather than hardcoding a host, otherwise the canonical signal
 * splits across two origins.
 */
export const SITE_URL = "https://www.serbaserbiumroh.id"

export const SITE_NAME = "Serba Serbi Umroh"

export const SITE_SHORT_NAME = "SSU"

export const SITE_DESCRIPTION =
  "Panduan lengkap umroh mandiri: estimasi biaya, direktori hotel Makkah & Madinah dengan harga per bulan, pengurusan visa, transportasi, dan cerita nyata jamaah."

/**
 * Route prefixes that must never be crawled or appear in the sitemap.
 *
 * Mirrors what isPublicPath in middleware.ts refuses, and has to be maintained
 * by hand -- a gated route whose URL does not start with one of these ships
 * crawlable. /pricelist-hotel is the case that proved it: it lives under the
 * (dashboard) route group, which adds no URL segment, so the /dashboard prefix
 * does not cover it.
 */
export const PROTECTED_PREFIXES = [
  "/admin",
  "/dashboard",
  "/estimate",
  "/login",
  "/api",
  "/pricelist-hotel",
] as const

/** Builds an absolute URL on the canonical host from a repo-relative path. */
export function absoluteUrl(pathname: string): string {
  if (pathname === "/") return SITE_URL
  return `${SITE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`
}
