/**
 * The community figures shown as social proof in the navbar, the homepage
 * hero, and /layanan.
 *
 * Client-safe on purpose: the navbar renders these from a client component,
 * so nothing in here may reach the database. The query that produces the
 * visitor count lives in lib/stats/visitor-count.ts, which is server-only.
 *
 * The first two figures are hand-maintained — update them here and every
 * surface follows.
 */
export const COMMUNITY_SIZE = "4.500+"
export const PILGRIMS_HELPED = "3.500+"

/**
 * Promotional padding added to the real unique-visitor count before display.
 *
 * One value, everywhere. The admin dashboard reads this too, so the figure an
 * admin checks is the figure a visitor is shown.
 */
export const VISITOR_BASELINE_OFFSET = 100

/**
 * The visitor figure as shown to a visitor: raw count plus the promotional
 * offset, grouped Indonesian-style. Null in, null out.
 */
export function formatVisitorCount(rawCount: number | null): string | null {
  if (rawCount === null) return null

  return (rawCount + VISITOR_BASELINE_OFFSET).toLocaleString("id-ID")
}
