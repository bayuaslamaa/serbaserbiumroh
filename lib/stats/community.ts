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
 * Real unique visitors, with no promotional padding applied.
 *
 * Returns null when the query fails: these figures decorate a page, they are
 * not the reason anyone is on it, so a database problem must degrade the
 * badge rather than take the route down.
 */
export const getPublicVisitorCount = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const [stats] = await db
        .select({ uniqueVisitors: countDistinct(visitorLogs.ipHash) })
        .from(visitorLogs)

      return stats?.uniqueVisitors ?? 0
    } catch (err) {
      console.error("Error reading visitor count:", err)
      return null
    }
  },
  ["public-visitor-count"],
  { revalidate: VISITOR_COUNT_TTL_SECONDS }
)

/**
 * The visitor figure as shown to a visitor: raw count plus the promotional
 * offset, grouped Indonesian-style. Null in, null out.
 */
export function formatVisitorCount(rawCount: number | null): string | null {
  if (rawCount === null) return null

  return (rawCount + VISITOR_BASELINE_OFFSET).toLocaleString("id-ID")
}
