import { activityLogs } from "@/shared/db/schema"

export type ActivityLogStatus = "SUCCESS" | "ERROR" | "INFO"

export type ActivityLogInput = {
  userId?: string | null
  flow: string
  event: string
  status: ActivityLogStatus | string
  entityType?: string | null
  entityId?: string | null
  input?: unknown
  output?: unknown
  error?: string | null
  metadata?: unknown
}

type InsertableDb = {
  insert: (table: typeof activityLogs) => {
    values: (value: typeof activityLogs.$inferInsert) => unknown | Promise<unknown>
  }
}

export async function logActivity(db: InsertableDb, entry: ActivityLogInput) {
  try {
    await db.insert(activityLogs).values({
      userId: entry.userId ?? null,
      flow: entry.flow,
      event: entry.event,
      status: entry.status,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      input: entry.input ?? null,
      output: entry.output ?? null,
      error: entry.error ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch (err) {
    console.error("[activity-log] failed to write log:", err instanceof Error ? err.message : err)
  }
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}
