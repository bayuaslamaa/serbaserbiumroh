import type { MetadataRoute } from "next"

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>

export interface StaticRoute {
  path: string
  changeFrequency: ChangeFrequency
  priority: number
}

/**
 * Every public, indexable, non-dynamic route.
 *
 * Single source of truth for the sitemap and its tests. A route belongs here
 * only if it is reachable without a session (see isPublicPath in middleware.ts)
 * and its content is durable -- time-boxed campaign pages are deliberately
 * excluded, because a sitemap entry pointing at an expired event is a quality
 * signal working against us.
 *
 * Deliberately absent:
 *   /webinar-umroh-mandiri -- a single-date campaign page (see
 *   WEBINAR_STARTS_AT in lib/webinar.ts). Excluded because it goes stale within
 *   days of the event, whatever that date happens to be -- not because of any
 *   particular date, so this entry never needs rescheduling. The page stays
 *   crawlable and is reachable from the navbar. (It used to be promoted by a
 *   homepage banner; that banner is gone, and the session's recording is listed
 *   in components/home/PromoWebinar.tsx instead.) Revisit only if it is reworked
 *   into an evergreen webinar archive.
 */
export const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/hotel-nusuk", changeFrequency: "daily", priority: 0.9 },
  { path: "/panduan", changeFrequency: "weekly", priority: 0.9 },
  { path: "/layanan", changeFrequency: "weekly", priority: 0.8 },
  { path: "/visa", changeFrequency: "weekly", priority: 0.8 },
  { path: "/transportasi", changeFrequency: "weekly", priority: 0.8 },
  { path: "/cerita-jamaah", changeFrequency: "weekly", priority: 0.8 },
  { path: "/badalin", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "weekly", priority: 0.7 },
  // Changes only when an institution's procedure changes, not on a schedule.
  { path: "/template-email", changeFrequency: "monthly", priority: 0.6 },
  { path: "/komunitas", changeFrequency: "monthly", priority: 0.6 },
]
