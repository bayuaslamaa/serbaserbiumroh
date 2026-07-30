import { describe, expect, it, vi } from "vitest"

// The cap's window and its filter. Both are silent when wrong: a local-midnight boundary would move
// the window with the server's timezone (and reset mid-afternoon in Jakarta), and a filter missing
// the event or the user would count every activity row ever written — capping an operator at zero.

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...parts) => ({ and: parts })),
  eq: vi.fn((column, value) => ({ eq: [column, value] })),
  gte: vi.fn((column, value) => ({ gte: [column, value] })),
  count: vi.fn(() => ({ count: "*" })),
}))

vi.mock("@/lib/db/schema", () => ({
  activityLogs: {
    userId: "activity_logs.user_id",
    flow: "activity_logs.flow",
    event: "activity_logs.event",
    createdAt: "activity_logs.created_at",
  },
}))

const {
  ENHANCED_PARSE_DAILY_CAP,
  ENHANCED_PARSE_EVENT,
  checkEnhancedParseCap,
  countEnhancedParsesToday,
  startOfUtcDay,
} = await import("@/lib/ai/parse-usage")

type FakeDb = Parameters<typeof countEnhancedParsesToday>[0]

function dbReturning(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows)
  const from = vi.fn().mockReturnValue({ where })
  const select = vi.fn().mockReturnValue({ from })
  return { db: { select } as unknown as FakeDb, where }
}

describe("startOfUtcDay", () => {
  it("truncates to midnight UTC, not local midnight", () => {
    expect(startOfUtcDay(new Date("2026-07-29T16:45:12.500Z")).toISOString()).toBe("2026-07-29T00:00:00.000Z")
  })

  it("keeps a late-evening UTC timestamp on its own UTC day", () => {
    expect(startOfUtcDay(new Date("2026-07-29T23:59:59.999Z")).toISOString()).toBe("2026-07-29T00:00:00.000Z")
  })
})

describe("countEnhancedParsesToday", () => {
  it("filters on the user, the enhanced event, and today's UTC window", async () => {
    const { db, where } = dbReturning([{ value: 7 }])

    const used = await countEnhancedParsesToday(db, "user-1", new Date("2026-07-29T09:00:00.000Z"))

    expect(used).toBe(7)
    const conditions = (where.mock.calls[0][0] as { and: unknown[] }).and
    expect(conditions).toContainEqual({ eq: ["activity_logs.user_id", "user-1"] })
    expect(conditions).toContainEqual({ eq: ["activity_logs.event", ENHANCED_PARSE_EVENT] })
    expect(conditions).toContainEqual({ gte: ["activity_logs.created_at", new Date("2026-07-29T00:00:00.000Z")] })
  })

  it("reads a bigint count returned as a string", async () => {
    const { db } = dbReturning([{ value: "12" }])
    await expect(countEnhancedParsesToday(db, "user-1")).resolves.toBe(12)
  })

  it("reads no rows as zero", async () => {
    const { db } = dbReturning([])
    await expect(countEnhancedParsesToday(db, "user-1")).resolves.toBe(0)
  })
})

describe("checkEnhancedParseCap", () => {
  it("allows the last request under the ceiling and refuses the one after it", async () => {
    const under = dbReturning([{ value: ENHANCED_PARSE_DAILY_CAP - 1 }])
    await expect(checkEnhancedParseCap(under.db, "user-1")).resolves.toMatchObject({ allowed: true })

    const at = dbReturning([{ value: ENHANCED_PARSE_DAILY_CAP }])
    await expect(checkEnhancedParseCap(at.db, "user-1")).resolves.toMatchObject({
      allowed: false,
      used: ENHANCED_PARSE_DAILY_CAP,
      limit: ENHANCED_PARSE_DAILY_CAP,
    })
  })
})
