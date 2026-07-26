import type { Metadata } from "next"

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./config"

/**
 * Site-wide metadata applied in app/layout.tsx.
 *
 * metadataBase is what lets every page declare a relative canonical -- Next
 * resolves it against this host. Without it, `alternates.canonical: "/faq"`
 * silently emits a relative canonical, which crawlers ignore.
 *
 * title.template appends the brand, so individual pages must NOT carry their
 * own "| SSU" suffix; pageMetadata enforces that.
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Panduan & Estimasi Biaya Umroh Mandiri`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — Panduan & Estimasi Biaya Umroh Mandiri`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Panduan & Estimasi Biaya Umroh Mandiri`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

interface PageMetadataInput {
  /** Page title WITHOUT a brand suffix -- title.template appends it. */
  title: string
  description: string
  /** Absolute path on this site, e.g. "/hotel-nusuk/safwa-tower-3". */
  path: string
}

const BRAND_SUFFIX = /\s*\|\s*(SSU|Serba Serbi Umroh)\s*$/i

/**
 * Strips a trailing brand suffix, because title.template already appends one.
 *
 * This normalizes rather than throws. Titles reaching here are not all
 * literals: buildStoryMeta composes them from `story.authorName`, and a hotel
 * title from `hotel.label` -- both admin-authored. A throw inside
 * generateMetadata has no caller to catch it, so one unlucky author name would
 * turn a live page into a 500. A duplicated suffix is a cosmetic bug; a 500 is
 * an outage.
 */
export function stripBrandSuffix(title: string): string {
  return title.replace(BRAND_SUFFIX, "").trim()
}

/**
 * Builds metadata for one public page: canonical plus OpenGraph, both derived
 * from the same path so they can never disagree.
 */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const cleanTitle = stripBrandSuffix(title)

  return {
    title: cleanTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "id_ID",
      siteName: SITE_NAME,
      url: path,
      title: cleanTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: cleanTitle,
      description,
    },
  }
}

/**
 * Applied at the layout level for every protected area -- dashboard, admin,
 * auth. Child pages set only a title, and Next merges metadata, so this
 * robots directive carries down to all of them. Declaring it once on the
 * layout means a newly added admin page is noindex by default rather than
 * depending on whoever writes it remembering.
 *
 * This is a second layer behind robots.txt. Disallow stops crawling, not
 * indexing -- a page linked from elsewhere can still surface in results with
 * no snippet. noindex is what actually keeps it out.
 */
export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
}

/** Same directive for a standalone protected page that also needs a title. */
export function noIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  }
}
