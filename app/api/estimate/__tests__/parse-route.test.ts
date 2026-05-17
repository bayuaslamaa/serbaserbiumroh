import { beforeEach, describe, expect, it, vi } from "vitest"

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
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {},
}))

vi.mock("@/lib/budget/calculate", () => ({
  fetchPricingConfig: vi.fn(),
}))

vi.mock("@/lib/ai/parse", () => {
  class ParseError extends Error {}

  return {
    ParseError,
    parseEstimate: vi.fn(),
  }
})

vi.mock("@/lib/logging/activity-log", () => ({
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  logActivity: vi.fn(),
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import { parseEstimate, ParseError } from "@/lib/ai/parse"
import { logActivity } from "@/lib/logging/activity-log"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockFetchPricingConfig = fetchPricingConfig as ReturnType<typeof vi.fn>
const mockParseEstimate = parseEstimate as ReturnType<typeof vi.fn>
const mockLogActivity = logActivity as ReturnType<typeof vi.fn>

const session = { user: { id: "user-1", role: "USER" } }
const pricing = { hotelOptions: { MADINAH: [], MAKKAH: [] } }

function request(input: string) {
  return new NextRequest("http://localhost/api/estimate/parse", {
    body: JSON.stringify({ input }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(session)
  mockFetchPricingConfig.mockResolvedValue(pricing)
})

describe("POST /api/estimate/parse logging", () => {
  it("logs successful AI parse output", async () => {
    const params = { pax: 2 }
    mockParseEstimate.mockResolvedValue({ params, notes: "parsed" })
    const { POST } = await import("../parse/route")

    const res = await POST(request("umroh november 2 pax"))

    expect(res.status).toBe(200)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        flow: "estimate",
        event: "ai_parse",
        status: "SUCCESS",
        input: { rawInput: "umroh november 2 pax" },
        output: { params, notes: "parsed" },
      })
    )
  })

  it("logs parse validation errors", async () => {
    mockParseEstimate.mockRejectedValue(new ParseError("Could not parse estimate"))
    const { POST } = await import("../parse/route")

    const res = await POST(request("hotel tidak jelas"))

    expect(res.status).toBe(422)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        flow: "estimate",
        event: "ai_parse",
        status: "ERROR",
        error: "Could not parse estimate",
        metadata: { stage: "parse_validation" },
      })
    )
  })
})
