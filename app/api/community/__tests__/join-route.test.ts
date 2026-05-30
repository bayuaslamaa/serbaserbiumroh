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
    insert: vi.fn(),
  },
}))

vi.mock("@/lib/db/schema", () => ({
  communityJoinRequests: "community_join_requests",
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { communityJoinRequests } from "@/lib/db/schema"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  insert: ReturnType<typeof vi.fn>
}

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/community/join", {
    body: JSON.stringify(body),
  })
}

function mockInsert(returningValue = [{ id: "join-1" }]) {
  const returning = vi.fn().mockResolvedValue(returningValue)
  const values = vi.fn().mockReturnValue({ returning })
  mockDb.insert.mockReturnValue({ values })
  return { values, returning }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(null)
})

describe("POST /api/community/join", () => {
  it("creates an anonymous community join request", async () => {
    const { values } = mockInsert()
    const { POST } = await import("../join/route")

    const res = await POST(request({ fullName: "Bayu", phone: "0851-7211-7757" }))

    expect(res.status).toBe(201)
    expect(mockDb.insert).toHaveBeenCalledWith(communityJoinRequests)
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Bayu",
        phone: "0851-7211-7757",
        normalizedPhone: "6285172117757",
        userId: null,
      })
    )
  })

  it("associates the request with a logged-in user when available", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    const { values } = mockInsert()
    const { POST } = await import("../join/route")

    const res = await POST(request({ fullName: "Aisyah", phone: "+62 812 0000 1111" }))

    expect(res.status).toBe(201)
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }))
  })

  it("stores optional social username and intent", async () => {
    const { values } = mockInsert()
    const { POST } = await import("../join/route")

    const res = await POST(
      request({
        fullName: "Aisyah",
        phone: "0812 0000 1111",
        socialUsername: "@aisyah.umroh",
        intent: "Cari teman belajar umroh mandiri",
      })
    )

    expect(res.status).toBe(201)
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        socialUsername: "@aisyah.umroh",
        normalizedSocialUsername: "aisyah.umroh",
        intent: "Cari teman belajar umroh mandiri",
      })
    )
  })

  it("rejects missing full name without writing", async () => {
    const { POST } = await import("../join/route")

    const res = await POST(request({ phone: "0851-7211-7757" }))

    expect(res.status).toBe(400)
    expect((res.body as any).error).toBe("Nama lengkap wajib diisi")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("rejects missing phone without writing", async () => {
    const { POST } = await import("../join/route")

    const res = await POST(request({ fullName: "Bayu" }))

    expect(res.status).toBe(400)
    expect((res.body as any).error).toBe("Nomor HP wajib diisi")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
