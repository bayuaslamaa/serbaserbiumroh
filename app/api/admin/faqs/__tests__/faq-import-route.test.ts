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
  NextResponse: class {
    status: number
    body: unknown
    headers: Headers

    constructor(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
      this.status = init?.status ?? 200
      this.body = body
      this.headers = new Headers(init?.headers)
    }

    static json(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
      return {
        status: init?.status ?? 200,
        body,
        headers: new Headers(init?.headers),
      }
    }
  },
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}))

vi.mock("@/lib/db/schema", () => ({
  faqGroups: {
    id: "faq_groups.id",
    name: "faq_groups.name",
  },
  faqItems: {
    id: "faq_items.id",
    groupId: "faq_items.group_id",
  },
}))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { faqGroups, faqItems } from "@/lib/db/schema"
import { FAQ_IMPORT_MAX_ROWS, FAQ_IMPORT_TEMPLATE } from "@/lib/admin/faq-import"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}

const adminSession = { user: { id: "admin-1", role: "ADMIN" } }
const userSession = { user: { id: "user-1", role: "USER" } }

const existingGroup = { id: "group-1", name: "Umum" }
const existingFaq = { id: "faq-1", groupId: "group-1", question: "Apa itu umroh mandiri?" }

function request(csv: string) {
  return new NextRequest("http://localhost/api/admin/faqs/import", {
    body: JSON.stringify({ csv }),
  })
}

function selectExisting(groups: unknown[], faqs: unknown[]) {
  mockDb.select
    .mockReturnValueOnce({ from: vi.fn().mockResolvedValue(groups) })
    .mockReturnValueOnce({ from: vi.fn().mockResolvedValue(faqs) })
}

function makeTx() {
  const groupReturning = vi.fn().mockResolvedValue([{ id: "new-group" }])
  const faqReturning = vi.fn().mockResolvedValue([{ id: "new-faq" }])
  const groupValues = vi.fn().mockReturnValue({ returning: groupReturning })
  const faqValues = vi.fn().mockReturnValue({ returning: faqReturning })
  const insert = vi.fn((table) => {
    if (table === faqGroups) return { values: groupValues }
    if (table === faqItems) return { values: faqValues }
    return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }
  })

  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set: updateSet })

  return {
    tx: { insert, update },
    spies: { insert, groupValues, faqValues, update, updateSet, updateWhere },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
})

describe("POST /api/admin/faqs/import/preview", () => {
  it("previews valid CSV without writing", async () => {
    selectExisting([], [])
    const { POST } = await import("../import/preview/route")

    const res = await POST(request("group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban\n"))

    expect(res.status).toBe(200)
    expect((res.body as any).preview.summary.create).toBe(1)
    expect((res.body as any).preview.groupSummary.create).toBe(1)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it("classifies matching questions as updates during preview", async () => {
    selectExisting([existingGroup], [existingFaq])
    const { POST } = await import("../import/preview/route")

    const res = await POST(request("group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban baru\n"))

    expect((res.body as any).preview.summary.update).toBe(1)
    expect((res.body as any).preview.rows[0].existingFaqId).toBe("faq-1")
  })

  it("requires admin auth", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { POST } = await import("../import/preview/route")

    const res = await POST(request("group,question,answer\nUmum,Apa?,Jawaban\n"))

    expect(res.status).toBe(403)
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("rejects CSVs with too many rows", async () => {
    selectExisting([], [])
    const { POST } = await import("../import/preview/route")
    const rows = Array.from({ length: FAQ_IMPORT_MAX_ROWS + 1 }, (_, i) => `Umum,Pertanyaan ${i}?,Jawaban`)

    const res = await POST(request("group,question,answer\n" + rows.join("\n")))

    expect(res.status).toBe(413)
    expect((res.body as any).error).toContain("rows or fewer")
  })
})

describe("POST /api/admin/faqs/import/confirm", () => {
  it("creates a missing group and draft FAQ", async () => {
    selectExisting([], [])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../import/confirm/route")

    const res = await POST(request("group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban\n"))

    expect(res.status).toBe(200)
    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows[0]).toEqual({
      rowNumber: 2,
      status: "create",
      faqId: "new-faq",
      groupId: "new-group",
      createdGroup: true,
    })
    expect(spies.groupValues).toHaveBeenCalledWith(expect.objectContaining({ name: "Umum" }))
    expect(spies.faqValues).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "new-group",
        question: "Apa itu umroh mandiri?",
        answer: "Jawaban",
        isPublished: false,
        sortOrder: 0,
      })
    )
  })

  it("updates an existing FAQ without creating a duplicate", async () => {
    selectExisting([existingGroup], [existingFaq])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../import/confirm/route")

    const res = await POST(request("group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban baru\n"))

    expect((res.body as any).applied).toBe(1)
    expect((res.body as any).appliedRows[0]).toEqual(
      expect.objectContaining({ status: "update", faqId: "faq-1", groupId: "group-1" })
    )
    expect(spies.update).toHaveBeenCalledWith(faqItems)
    expect(spies.faqValues).not.toHaveBeenCalled()
  })

  it("does not write duplicate rows from the same CSV", async () => {
    selectExisting([], [])
    const { tx, spies } = makeTx()
    mockDb.transaction.mockImplementation(async (callback) => callback(tx))
    const { POST } = await import("../import/confirm/route")

    const res = await POST(
      request(
        "group,question,answer\n" +
          "Umum,Apa itu umroh mandiri?,Jawaban 1\n" +
          "Biaya, apa itu umroh mandiri? ,Jawaban 2\n"
      )
    )

    expect((res.body as any).applied).toBe(0)
    expect((res.body as any).preview.summary.conflict).toBe(2)
    expect(mockDb.transaction).not.toHaveBeenCalled()
    expect(spies.faqValues).not.toHaveBeenCalled()
  })

  it("blocks unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("../import/confirm/route")

    const res = await POST(request("group,question,answer\nUmum,Apa?,Jawaban\n"))

    expect(res.status).toBe(401)
    expect(mockDb.select).not.toHaveBeenCalled()
  })
})

describe("GET /api/admin/faqs/import/template", () => {
  it("returns the canonical CSV template for admins", async () => {
    const { GET } = await import("../import/template/route")

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.body).toBe(FAQ_IMPORT_TEMPLATE)
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="faq-import-template.csv"')
  })

  it("blocks non-admin template downloads", async () => {
    mockAuth.mockResolvedValue(userSession)
    const { GET } = await import("../import/template/route")

    const res = await GET()

    expect(res.status).toBe(403)
  })
})
