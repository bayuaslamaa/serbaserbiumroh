import { unstable_cache } from "next/cache"
import { countDistinct } from "drizzle-orm"
import { db } from "@/lib/db"
import { visitorLogs } from "@/lib/db/schema"

/**
 * The community figures shown as social proof on the homepage and /layanan.
 *
 * The first two are hand-maintained — update them here and every surface
 * follows. The visitor figure is real, read from visitor_logs.
 */
export const COMMUNITY_SIZE = "3.500+"
export const PILGRIMS_HELPED = "3.000+"

/**
 * Promotional padding added to the real unique-visitor count before display.
 *
 * One value, everywhere. The admin dashboard reads this too, so the figure an
 * admin checks is the figure a visitor is shown.
 */
export const VISITOR_BASELINE_OFFSET = 100

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

/**
 * The visitor figure as shown to a visitor: raw count plus the promotional
 * offset, grouped Indonesian-style. Null in, null out.
 */
export function formatVisitorCount(rawCount: number | null): string | null {
  if (rawCount === null) return null

  return (rawCount + VISITOR_BASELINE_OFFSET).toLocaleString("id-ID")
}
