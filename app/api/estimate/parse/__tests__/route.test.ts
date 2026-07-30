import { beforeEach, describe, expect, it, vi } from "vitest"

// POST /api/estimate/parse gates the optional real-price path. These tests drive the real handler,
// because the things that can go wrong here are all route-level:
//
//   - the expensive path must be ADMIN-only, while the normal path stays open to any signed-in user
//     (tightening that would break the estimate form for non-admin operators);
//   - a 403 must be a 403, not the 307 that lib/auth.ts's redirect()-based requireAdmin() produces;
//   - the daily cap must reject before anything is spent, and say so in the log;
//   - the usage row the cap counts must be written on the error paths too, or a run of failures
//     would be invisible to the cap and to the D2 review.

vi.mock("next/server", () => ({
  NextRequest: class {
    url: string
    private body: unknown

    constructor(url: string, init?: { body?: string }) {
      this.url = url
      this.body = init?.body ? JSON.parse(init.body) : {}
    }

    async json() {
      return this.body
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}))

vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

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

vi.mock("@/lib/budget/calculate", () => ({ fetchPricingConfig: vi.fn() }))

vi.mock("@/lib/ai/parse", async () => {
  class ParseError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "ParseError"
    }
  }
  return { parseEstimate: vi.fn(), ParseError }
})

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import { parseEstimate, ParseError } from "@/lib/ai/parse"
import { ENHANCED_PARSE_DAILY_CAP, ENHANCED_PARSE_BLOCKED_EVENT, ENHANCED_PARSE_EVENT } from "@/lib/ai/parse-usage"
import { POST } from "../route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { insert: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> }
const mockFetchPricing = fetchPricingConfig as ReturnType<typeof vi.fn>
const mockParseEstimate = parseEstimate as ReturnType<typeof vi.fn>

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const operatorSession = { user: { id: "user-1", role: "USER" } }

const parsedResult = {
  params: { nightsMadinah: 4, nightsMakkah: 9, pax: 1 },
  notes: "",
}

/** Every activityLogs row the handler wrote, in order. */
let written: Record<string, unknown>[] = []

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/estimate/parse", { body: JSON.stringify(body) })
}

/** Answers the cap's COUNT query with `used` rows already logged today. */
function withUsage(used: number) {
  const where = vi.fn().mockResolvedValue([{ value: used }])
  const from = vi.fn().mockReturnValue({ where })
  mockDb.select.mockReturnValue({ from })
  return { where, from }
}

beforeEach(() => {
  vi.clearAllMocks()
  written = []
  mockDb.insert.mockImplementation(() => ({
    values: (value: Record<string, unknown>) => {
      written.push(value)
      return Promise.resolve()
    },
  }))
  mockFetchPricing.mockResolvedValue({ rates: { SAR: 4700, USD: 17300 } })
  mockParseEstimate.mockResolvedValue(parsedResult)
  withUsage(0)
})

describe("POST /api/estimate/parse — auth", () => {
  it("still rejects an unauthenticated request", async () => {
    mockAuth.mockResolvedValue(null)
    const res = (await POST(request({ input: "umroh 9 malam" }))) as { status: number }
    expect(res.status).toBe(401)
  })

  it("still serves the normal path to a signed-in non-admin", async () => {
    mockAuth.mockResolvedValue(operatorSession)
    const res = (await POST(request({ input: "umroh 9 malam" }))) as { status: number }

    expect(res.status).toBe(200)
    expect(mockParseEstimate).toHaveBeenCalledWith("umroh 9 malam", expect.anything(), { enhanced: false })
  })

  it("serves the normal path when enhanced is explicitly false", async () => {
    mockAuth.mockResolvedValue(operatorSession)
    const res = (await POST(request({ input: "umroh 9 malam", enhanced: false }))) as { status: number }

    expect(res.status).toBe(200)
    expect(mockParseEstimate).toHaveBeenCalledWith("umroh 9 malam", expect.anything(), { enhanced: false })
  })

  it("answers 403 — not 200, not a redirect — when a non-admin asks for the enhanced path", async () => {
    mockAuth.mockResolvedValue(operatorSession)
    const res = (await POST(request({ input: "umroh 9 malam", enhanced: true }))) as unknown as {
      status: number
      body: { error: string }
    }

    expect(res.status).toBe(403)
    expect(res.body.error).toBe("Forbidden")
    expect(mockParseEstimate).not.toHaveBeenCalled()
    // A 3xx here would mean requireAdmin()'s redirect() leaked into a route handler.
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it("rejects a session that cannot be attributed to a user, since it cannot be capped", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    const res = (await POST(request({ input: "umroh 9 malam", enhanced: true }))) as { status: number }

    expect(res.status).toBe(403)
    expect(mockParseEstimate).not.toHaveBeenCalled()
  })

  it("rejects a non-boolean enhanced flag", async () => {
    mockAuth.mockResolvedValue(adminSession)
    const res = (await POST(request({ input: "umroh 9 malam", enhanced: "yes" }))) as { status: number }
    expect(res.status).toBe(400)
  })

  it("keeps the 5000-character input cap", async () => {
    mockAuth.mockResolvedValue(adminSession)
    const res = (await POST(request({ input: "a".repeat(5001), enhanced: true }))) as { status: number }
    expect(res.status).toBe(400)
    expect(mockParseEstimate).not.toHaveBeenCalled()
  })
})

describe("POST /api/estimate/parse — enhanced path", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(adminSession)
  })

  it("passes the flag through and writes the usage row the cap counts", async () => {
    const res = (await POST(request({ input: "umroh maret", enhanced: true }))) as { status: number }

    expect(res.status).toBe(200)
    expect(mockParseEstimate).toHaveBeenCalledWith("umroh maret", expect.anything(), { enhanced: true })

    const usage = written.filter((row) => row.event === ENHANCED_PARSE_EVENT)
    expect(usage).toHaveLength(1)
    expect(usage[0]).toMatchObject({ userId: "admin-1", status: "SUCCESS" })
  })

  it("writes no usage row for the normal path", async () => {
    await POST(request({ input: "umroh maret" }))
    expect(written.filter((row) => row.event === ENHANCED_PARSE_EVENT)).toHaveLength(0)
  })

  it("rejects a user at the cap before spending anything, and logs the refusal", async () => {
    withUsage(ENHANCED_PARSE_DAILY_CAP)

    const res = (await POST(request({ input: "umroh maret", enhanced: true }))) as unknown as {
      status: number
      body: { error: string }
    }

    expect(res.status).toBe(429)
    expect(res.body.error).toContain(`${ENHANCED_PARSE_DAILY_CAP}/${ENHANCED_PARSE_DAILY_CAP}`)
    // Nothing was spent: no pricing read, no parse, hence no API call.
    expect(mockFetchPricing).not.toHaveBeenCalled()
    expect(mockParseEstimate).not.toHaveBeenCalled()

    const blocked = written.filter((row) => row.event === ENHANCED_PARSE_BLOCKED_EVENT)
    expect(blocked).toHaveLength(1)
    expect(blocked[0]).toMatchObject({ userId: "admin-1", status: "ERROR" })
    // A blocked attempt must not count toward the cap it was blocked by.
    expect(written.filter((row) => row.event === ENHANCED_PARSE_EVENT)).toHaveLength(0)
  })

  it("lets the last allowed request through", async () => {
    withUsage(ENHANCED_PARSE_DAILY_CAP - 1)

    const res = (await POST(request({ input: "umroh maret", enhanced: true }))) as { status: number }

    expect(res.status).toBe(200)
    expect(mockParseEstimate).toHaveBeenCalled()
  })

  it("does not cap the normal path", async () => {
    withUsage(ENHANCED_PARSE_DAILY_CAP * 10)

    const res = (await POST(request({ input: "umroh maret" }))) as { status: number }

    expect(res.status).toBe(200)
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("still writes a usage row when the AI call fails", async () => {
    mockParseEstimate.mockRejectedValue(new Error("Anthropic API error: connection reset"))

    const res = (await POST(request({ input: "umroh maret", enhanced: true }))) as { status: number }

    expect(res.status).toBe(503)
    const usage = written.filter((row) => row.event === ENHANCED_PARSE_EVENT)
    expect(usage).toHaveLength(1)
    expect(usage[0]).toMatchObject({ status: "ERROR" })
    expect(usage[0].error).toContain("connection reset")
  })

  it("still writes a usage row when the answer fails validation", async () => {
    mockParseEstimate.mockRejectedValue(new ParseError("Missing or invalid fields: pax"))

    const res = (await POST(request({ input: "umroh maret", enhanced: true }))) as { status: number }

    expect(res.status).toBe(422)
    const usage = written.filter((row) => row.event === ENHANCED_PARSE_EVENT)
    expect(usage).toHaveLength(1)
    expect(usage[0]).toMatchObject({ status: "ERROR" })
  })

  it("falls back to allowing the request when the cap query itself fails", async () => {
    const from = vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValue(new Error("db down")) })
    mockDb.select.mockReturnValue({ from })

    const res = (await POST(request({ input: "umroh maret", enhanced: true }))) as { status: number }

    // Failing closed here would turn one transient database error into a dead feature, and it cannot
    // leak spend: the pricing read that follows hits the same database.
    expect(res.status).toBe(200)
  })
})
