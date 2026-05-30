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
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("drizzle-orm", () => ({
  desc: vi.fn((value) => value),
  eq: vi.fn((a, b) => ({ a, b })),
}))

vi.mock("@/lib/db/schema", () => ({
  communityJoinRequests: {
    id: "community_join_requests.id",
    createdAt: "community_join_requests.created_at",
    normalizedPhone: "community_join_requests.normalized_phone",
    normalizedSocialUsername: "community_join_requests.normalized_social_username",
  },
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { communityJoinRequests } from "@/lib/db/schema"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/community-requests/join-1", {
    body: JSON.stringify(body),
  })
}

function mockSelectRows(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows)
  const from = vi.fn().mockReturnValue({ orderBy })
  mockDb.select.mockReturnValue({ from })
  return { from, orderBy }
}

function mockUpdateRows(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows)
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  mockDb.update.mockReturnValue({ set })
  return { set, where, returning }
}

const routeCtx = { params: Promise.resolve({ id: "join-1" }) }

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
})

describe("GET /api/admin/community-requests", () => {
  it("returns admin requests with duplicate flags", async () => {
    mockSelectRows([
      { id: "join-1", normalizedPhone: "62851", normalizedSocialUsername: "bayu" },
      { id: "join-2", normalizedPhone: "62851", normalizedSocialUsername: null },
      { id: "join-3", normalizedPhone: "62852", normalizedSocialUsername: "bayu" },
    ])
    const { GET } = await import("../route")

    const res = await GET()

    expect(res.status).toBe(200)
    expect((res.body as any).requests).toEqual([
      expect.objectContaining({ id: "join-1", possibleDuplicate: true, duplicateByPhone: true, duplicateBySocial: true }),
      expect.objectContaining({ id: "join-2", possibleDuplicate: true, duplicateByPhone: true, duplicateBySocial: false }),
      expect.objectContaining({ id: "join-3", possibleDuplicate: true, duplicateByPhone: false, duplicateBySocial: true }),
    ])
  })

  it("requires admin auth", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { GET } = await import("../route")

    const res = await GET()

    expect(res.status).toBe(403)
    expect(mockDb.select).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/admin/community-requests/[id]", () => {
  it("updates status and admin note", async () => {
    const { set } = mockUpdateRows([{ id: "join-1", status: "MATCHED", adminNote: "Cocok dari WA" }])
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(request({ status: "MATCHED", adminNote: " Cocok dari WA " }), routeCtx)

    expect(res.status).toBe(200)
    expect(mockDb.update).toHaveBeenCalledWith(communityJoinRequests)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "MATCHED",
        adminNote: "Cocok dari WA",
        updatedAt: expect.any(Date),
      })
    )
  })

  it("rejects invalid status without writing", async () => {
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(request({ status: "DONE" }), routeCtx)

    expect(res.status).toBe(400)
    expect((res.body as any).error).toBe("Status tidak valid")
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("returns not found for missing request", async () => {
    mockUpdateRows([])
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(request({ status: "REJECTED" }), routeCtx)

    expect(res.status).toBe(404)
  })

  it("blocks unauthenticated updates", async () => {
    mockAuth.mockResolvedValue(null)
    const { PATCH } = await import("../[id]/route")

    const res = await PATCH(request({ status: "MATCHED" }), routeCtx)

    expect(res.status).toBe(401)
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})
