import { and, count, eq, gte } from "drizzle-orm"
import type { DB } from "@/lib/db"
import { activityLogs } from "@/lib/db/schema"
import { logActivity } from "@/lib/logging/activity-log"

// The enhanced parse path costs 3-5x a normal parse, so it gets a daily ceiling per operator.
//
// The counter is `activityLogs` itself rather than a new table or an in-memory map: the row is
// already being written for audit, the app runs in containers that restart (an in-memory counter
// would reset to zero on every deploy), and there is no Redis in package.json to hold one.
//
// This is a runaway guard, not a work ration (D2). It exists so a stuck tool loop or a leaned-on
// submit button cannot drain the account.
export const ENHANCED_PARSE_DAILY_CAP = 25

export const ENHANCED_PARSE_FLOW = "estimate"

/** One row per enhanced parse *attempt that reached the API* — success or error. This is what the cap counts. */
export const ENHANCED_PARSE_EVENT = "ai_parse_enhanced"

/**
 * A request refused by the cap. Deliberately a different event name: a blocked attempt costs
 * nothing, and counting it would let a user who keeps retrying inflate the very number D2 asks us
 * to review after two weeks of real use.
 */
export const ENHANCED_PARSE_BLOCKED_EVENT = "ai_parse_enhanced_blocked"

type InsertableDb = Parameters<typeof logActivity>[0]

/** Midnight UTC for the day `now` falls in. UTC so the window does not shift with server locale. */
export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function countEnhancedParsesToday(
  db: DB,
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.flow, ENHANCED_PARSE_FLOW),
        eq(activityLogs.event, ENHANCED_PARSE_EVENT),
        gte(activityLogs.createdAt, startOfUtcDay(now))
      )
    )

  return Number(row?.value ?? 0)
}

export type EnhancedParseCapDecision = {
  allowed: boolean
  used: number
  limit: number
}

/**
 * Fails **open** when the count query throws. That is safe rather than lax: the caller's very next
 * step is another read against the same database (the pricing config), so a database that cannot
 * answer this query cannot reach the Anthropic API either — the request fails before it spends
 * anything. Failing closed would instead turn one transient database hiccup into a dead feature.
 */
export async function checkEnhancedParseCap(
  db: DB,
  userId: string,
  now: Date = new Date()
): Promise<EnhancedParseCapDecision> {
  let used: number
  try {
    used = await countEnhancedParsesToday(db, userId, now)
  } catch (err) {
    console.error("[parse-usage] cap query failed, allowing request:", err instanceof Error ? err.message : err)
    return { allowed: true, used: 0, limit: ENHANCED_PARSE_DAILY_CAP }
  }

  return { allowed: used < ENHANCED_PARSE_DAILY_CAP, used, limit: ENHANCED_PARSE_DAILY_CAP }
}

export async function logEnhancedParseUsage(
  db: InsertableDb,
  entry: {
    userId?: string | null
    rawInput: string
    status: "SUCCESS" | "ERROR"
    output?: unknown
    error?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await logActivity(db, {
    userId: entry.userId,
    flow: ENHANCED_PARSE_FLOW,
    event: ENHANCED_PARSE_EVENT,
    status: entry.status,
    input: { rawInput: entry.rawInput },
    output: entry.output ?? null,
    error: entry.error ?? null,
    metadata: { enhanced: true, ...entry.metadata },
  })
}

export async function logEnhancedParseBlocked(
  db: InsertableDb,
  entry: { userId?: string | null; rawInput: string; used: number; limit: number }
): Promise<void> {
  await logActivity(db, {
    userId: entry.userId,
    flow: ENHANCED_PARSE_FLOW,
    event: ENHANCED_PARSE_BLOCKED_EVENT,
    status: "ERROR",
    input: { rawInput: entry.rawInput },
    error: `Enhanced parse daily cap reached (${entry.used}/${entry.limit}).`,
    metadata: { enhanced: true, stage: "daily_cap", used: entry.used, limit: entry.limit },
  })
}
