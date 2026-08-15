import { unstable_cache } from "next/cache"
import { countDistinct } from "drizzle-orm"
import { db } from "@/shared/db"
import { visitorLogs } from "@/shared/db/schema"

/**
 * Reading the visitor count touches the database, so it is kept out of
 * lib/stats/community.ts — that module is imported by a client component
 * (the navbar) and must stay free of `pg`.
 */

/** How long a public surface may serve the same visitor count. */
const VISITOR_COUNT_TTL_SECONDS = 60

/**
 * The cached read. This throws on failure on purpose: unstable_cache stores
 * whatever the callback *resolves* to, so catching in here would memoize the
 * failure — one bad second would blank the figure for the whole TTL, on every
 * page sharing this key. A rejection is never written to the cache, so the
 * next request retries.
 */
const readVisitorCount = unstable_cache(
  async (): Promise<number> => {
    const [stats] = await db
      .select({ uniqueVisitors: countDistinct(visitorLogs.ipHash) })
      .from(visitorLogs)

    return stats?.uniqueVisitors ?? 0
  },
  ["public-visitor-count"],
  { revalidate: VISITOR_COUNT_TTL_SECONDS }
)

/**
 * Real unique visitors, with no promotional padding applied.
 *
 * Returns null when the read fails: these figures decorate a page, they are
 * not the reason anyone is on it, so a database problem must degrade the
 * badge rather than take the route down. Catching out here also covers throws
 * from the cache layer itself, which a catch inside could not reach.
 */
export async function getPublicVisitorCount(): Promise<number | null> {
  try {
    return await readVisitorCount()
  } catch (err) {
    console.error("Error reading visitor count:", err)
    return null
  }
}
