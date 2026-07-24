import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({
  NextRequest: class {
    nextUrl: URL
    constructor(url: string) {
      this.nextUrl = new URL(url)
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => new Response(JSON.stringify(body), init),
  },
}))
vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/db/schema", () => ({ estimates: {} }))
vi.mock("drizzle-orm", () => ({ eq: vi.fn((a, b) => ({ a, b })) }))
vi.mock("@/lib/budget/calculate", () => ({ fetchPricingConfig: vi.fn(), calculateBudget: vi.fn() }))
vi.mock("@/lib/budget/overrides", () => ({ applyOverrides: vi.fn() }))
vi.mock("@/lib/export/whatsapp", () => ({ generateWhatsAppText: vi.fn() }))
vi.mock("@/lib/export/pdf", () => ({ generatePDF: vi.fn() }))

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { calculateBudget, fetchPricingConfig } from "@/lib/budget/calculate"
import { applyOverrides } from "@/lib/budget/overrides"
import { generateWhatsAppText } from "@/lib/export/whatsapp"
import { generatePDF } from "@/lib/export/pdf"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { select: ReturnType<typeof vi.fn> }
const mockCalculate = calculateBudget as ReturnType<typeof vi.fn>
const mockPricing = fetchPricingConfig as ReturnType<typeof vi.fn>
const mockApply = applyOverrides as ReturnType<typeof vi.fn>
const mockWhatsApp = generateWhatsAppText as ReturnType<typeof vi.fn>
const mockPdf = generatePDF as ReturnType<typeof vi.fn>

const params = { pax: 2 }
const overrides = { overrides: { flight: { idr: 12_000_000 } }, customRows: [] }
const breakdown = { totalIdrPax: 20_000_000 }
const display = { rows: [{ key: "flight", idr: 12_000_000 }], totalIdrPax: 27_000_000 }
const estimate = {
  id: "e1",
  userId: "user-1",
  title: "Estimate",
  params,
  manualOverrides: overrides,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
  mockDb.select.mockReturnValue({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([estimate]) })),
  })
  mockPricing.mockResolvedValue({})
  mockCalculate.mockReturnValue(breakdown)
  mockApply.mockReturnValue(display)
  mockWhatsApp.mockReturnValue("override-aware text")
  mockPdf.mockResolvedValue(Uint8Array.from([1, 2, 3]))
})

const ctx = { params: Promise.resolve({ id: "e1" }) }

describe("GET /api/estimate/[id]/export", () => {
  it("passes persisted overrides through the WhatsApp export", async () => {
    const { GET } = await import("../[id]/export/route")

    const response = await GET(new NextRequest("http://localhost/api/estimate/e1/export?format=whatsapp"), ctx)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("override-aware text")
    expect(mockApply).toHaveBeenCalledWith(breakdown, overrides, 2)
    expect(mockWhatsApp).toHaveBeenCalledWith(params, breakdown, display, "Estimate")
  })

  it("passes the same override-aware display through the PDF export", async () => {
    const { GET } = await import("../[id]/export/route")

    const response = await GET(new NextRequest("http://localhost/api/estimate/e1/export?format=pdf"), ctx)

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(mockApply).toHaveBeenCalledWith(breakdown, overrides, 2)
    expect(mockPdf).toHaveBeenCalledWith(params, breakdown, display, "Estimate", "e1")
  })
})
