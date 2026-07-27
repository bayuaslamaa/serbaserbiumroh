import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}))

vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { GET } from "../[id]/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockSelect = db.select as ReturnType<typeof vi.fn>

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }

type Row = {
  id: string
  fullName: string
  phone: string
  socialUsername: string | null
  normalizedPhone: string
  normalizedSocialUsername: string | null
  status: "NEW" | "MATCHED" | "REJECTED"
  adminNote: string
  createdAt: Date
}

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "join-1",
    fullName: "Irham Ghifari",
    phone: "081284051103",
    socialUsername: "@irhamghifarii",
    normalizedPhone: "6281284051103",
    normalizedSocialUsername: "irhamghifarii",
    status: "NEW",
    adminNote: "",
    createdAt: new Date("2026-07-27T04:49:00Z"),
    ...overrides,
  }
}

/**
 * Two reads: the subject request (ends in .limit) then its partners (ends in
 * .orderBy). Queued in call order.
 */
function queueReads(subject: Row | undefined, partners: Row[]) {
  mockSelect
    .mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: async () => (subject ? [subject] : []) }) }),
    })
    .mockReturnValueOnce({
      from: () => ({ where: () => ({ orderBy: async () => partners }) }),
    })
}

const ctx = { params: Promise.resolve({ id: "join-1" }) }

type DuplicateResponse = { status: number; body: { duplicates: Record<string, unknown>[] } }

/** next/server is mocked to a plain object, so the real NextResponse type does not apply. */
async function callGet(): Promise<DuplicateResponse> {
  return (await GET(new Request("http://localhost"), ctx)) as unknown as DuplicateResponse
}

beforeEach(() => {
  vi.clearAllMocks()
  // mockReset, not clear: a test that short-circuits (404, 403) leaves its
  // unused mockReturnValueOnce entries queued for the next test.
  mockSelect.mockReset()
  mockAuth.mockResolvedValue(adminSession)
})

describe("GET /api/admin/community-requests/duplicates/[id]", () => {
  it("returns requests sharing the phone", async () => {
    queueReads(makeRow(), [
      makeRow({ id: "join-2", fullName: "Kembar Nomor", normalizedSocialUsername: "lainnya" }),
    ])

    const res = await callGet()

    expect(res.status).toBe(200)
    const { duplicates } = res.body
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0]).toMatchObject({
      id: "join-2",
      matchedByPhone: true,
      matchedBySocial: false,
    })
  })

  it("returns requests sharing the social handle", async () => {
    queueReads(makeRow(), [
      makeRow({ id: "join-3", fullName: "Kembar Sosial", normalizedPhone: "628999" }),
    ])

    const res = await callGet()

    const { duplicates } = res.body
    expect(duplicates[0]).toMatchObject({ matchedByPhone: false, matchedBySocial: true })
  })

  it("reports both when phone and handle match", async () => {
    queueReads(makeRow(), [makeRow({ id: "join-4" })])

    const res = await callGet()

    const { duplicates } = res.body
    expect(duplicates[0]).toMatchObject({ matchedByPhone: true, matchedBySocial: true })
  })

  it("never pairs two requests that both left the handle blank", async () => {
    queueReads(makeRow({ normalizedSocialUsername: null }), [
      makeRow({ id: "join-5", normalizedPhone: "628999", normalizedSocialUsername: null }),
    ])

    const res = await callGet()

    const { duplicates } = res.body
    expect(duplicates[0]).toMatchObject({ matchedBySocial: false })
  })

  it("returns an empty list rather than a 404 when nothing matches", async () => {
    queueReads(makeRow(), [])

    const res = await callGet()

    expect(res.status).toBe(200)
    expect(res.body.duplicates).toEqual([])
  })

  it("404s for an unknown request", async () => {
    queueReads(undefined, [])

    const res = await callGet()

    expect(res.status).toBe(404)
  })

  it("does not leak normalized contact values", async () => {
    queueReads(makeRow(), [makeRow({ id: "join-2" })])

    const res = await callGet()

    const { duplicates } = res.body
    expect(duplicates[0]).not.toHaveProperty("normalizedPhone")
    expect(duplicates[0]).not.toHaveProperty("normalizedSocialUsername")
  })

  it("rejects a non-admin before reading anything", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    const res = await callGet()

    expect(res.status).toBe(403)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it("rejects an anonymous visitor before reading anything", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await callGet()

    expect(res.status).toBe(401)
    expect(mockSelect).not.toHaveBeenCalled()
  })
})
