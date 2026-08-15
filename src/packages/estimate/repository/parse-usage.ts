import { and, count, eq, gte } from 'drizzle-orm';
import type { DB } from '@/shared/db';
import { activityLogs } from '@/shared/db/schema';
import { logActivity } from '@/shared/logging/activity-log';

export const ENHANCED_PARSE_DAILY_CAP = 25;

export const ENHANCED_PARSE_FLOW = 'estimate';

export const ENHANCED_PARSE_EVENT = 'ai_parse_enhanced';

export const ENHANCED_PARSE_BLOCKED_EVENT = 'ai_parse_enhanced_blocked';

type InsertableDb = Parameters<typeof logActivity>[0];

export const startOfUtcDay = (now: Date = new Date()): Date => {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export const countEnhancedParsesToday = async (
  db: DB,
  userId: string,
  now: Date = new Date(),
): Promise<number> => {
  const [row] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.flow, ENHANCED_PARSE_FLOW),
        eq(activityLogs.event, ENHANCED_PARSE_EVENT),
        gte(activityLogs.createdAt, startOfUtcDay(now)),
      ),
    );

  return Number(row?.value ?? 0);
};

export type EnhancedParseCapDecision = {
  allowed: boolean;
  used: number;
  limit: number;
};

export const checkEnhancedParseCap = async (
  db: DB,
  userId: string,
  now: Date = new Date(),
): Promise<EnhancedParseCapDecision> => {
  let used: number;
  try {
    used = await countEnhancedParsesToday(db, userId, now);
  } catch (err) {
    console.error(
      '[parse-usage] cap query failed, allowing request:',
      err instanceof Error ? err.message : err,
    );
    return { allowed: true, used: 0, limit: ENHANCED_PARSE_DAILY_CAP };
  }

  return { allowed: used < ENHANCED_PARSE_DAILY_CAP, used, limit: ENHANCED_PARSE_DAILY_CAP };
};

export const logEnhancedParseUsage = async (
  db: InsertableDb,
  entry: {
    userId?: string | null;
    rawInput: string;
    status: 'SUCCESS' | 'ERROR';
    output?: unknown;
    error?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  await logActivity(db, {
    userId: entry.userId,
    flow: ENHANCED_PARSE_FLOW,
    event: ENHANCED_PARSE_EVENT,
    status: entry.status,
    input: { rawInput: entry.rawInput },
    output: entry.output ?? null,
    error: entry.error ?? null,
    metadata: { enhanced: true, ...entry.metadata },
  });
};

export const logEnhancedParseBlocked = async (
  db: InsertableDb,
  entry: { userId?: string | null; rawInput: string; used: number; limit: number },
): Promise<void> => {
  await logActivity(db, {
    userId: entry.userId,
    flow: ENHANCED_PARSE_FLOW,
    event: ENHANCED_PARSE_BLOCKED_EVENT,
    status: 'ERROR',
    input: { rawInput: entry.rawInput },
    error: `Enhanced parse daily cap reached (${entry.used}/${entry.limit}).`,
    metadata: { enhanced: true, stage: 'daily_cap', used: entry.used, limit: entry.limit },
  });
};
