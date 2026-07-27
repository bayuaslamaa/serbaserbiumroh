import { describe, it, expect, vi } from "vitest"
import type { BudgetBreakdown, EstimateParams, ManualOverrides } from "@/types"

// Mock @react-pdf/renderer — it has complex native dependencies not suitable for unit tests
vi.mock("@react-pdf/renderer", () => ({
  Document: "Document",
  Page: "Page",
  Text: "Text",
  View: "View",
  Image: "Image",
  StyleSheet: { create: (s: object) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-pdf-content")),
}))

const { generatePDF } = await import("@/lib/export/pdf")
const { applyOverrides } = await import("@/lib/budget/overrides")
const { renderToBuffer } = await import("@react-pdf/renderer")
const { EXPORT_NOTES } = await import("@/lib/export/summary")

function collectText(node: unknown): string[] {
  if (typeof node === "string" || typeof node === "number") return [String(node)]
  if (Array.isArray(node)) return node.flatMap(collectText)
  if (!node || typeof node !== "object") return []
  const props = (node as { props?: { children?: unknown } }).props
  return collectText(props?.children)
}

function d(b: BudgetBreakdown, ov: ManualOverrides | null = null, pax = 1) {
  return applyOverrides(b, ov, pax)
}

const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "GARUDA",
  services: ["VISA", "TRANSPORT_JED_MAKKAH"],
  fullboard: true,
}

const breakdown: BudgetBreakdown = {
  hotelMadinahIdr: 3_055_000,
  hotelMakkahIdr: 13_747_500,
  hotelMadinahDetail: {
    label: "Kayan Hotel",
    tier: "STANDARD",
    sarPerNight: 650,
    nights: 4,
    roomPax: 4,
    roomCount: 1,
    totalPax: 4,
    roomMultiplier: 1,
  },
  hotelMakkahDetail: {
    label: "Olayan Ajyad",
    tier: "STANDARD",
    sarPerNight: 1300,
    nights: 9,
    roomPax: 4,
    roomCount: 1,
    totalPax: 4,
    roomMultiplier: 1,
  },
  servicesIdr: 4_382_000,
  serviceItems: [
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 2_854_500, divideByPax: false },
    { key: "TRANSPORT_JED_MAKKAH", label: "Transportasi", amountDisplay: "SAR 325", unitAmount: 325, currency: "SAR", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 17_000_000,
  totalIdrPax: 38_184_500,
  totalIdrGrp: 38_184_500,
  sarRate: 4700,
  usdRate: 17300,
}

describe("generatePDF", () => {
  it("returns a Uint8Array", async () => {
    const result = await generatePDF(params, breakdown, d(breakdown), "Test Umroh", "test-id")
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it("returns non-empty buffer", async () => {
    const result = await generatePDF(params, breakdown, d(breakdown))
    expect(result.length).toBeGreaterThan(0)
  })

  it("group total rendered when pax > 1", async () => {
    const groupParams = { ...params, pax: 3 }
    const groupBreakdown = { ...breakdown, totalIdrGrp: breakdown.totalIdrPax * 3 }
    // Should not throw when pax > 1 (exercises the conditional branch)
    const result = await generatePDF(groupParams, groupBreakdown, d(groupBreakdown, null, 3), null, "test-id-2")
    expect(result).toBeInstanceOf(Uint8Array)
    const groupDoc = (renderToBuffer as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
    const groupText = collectText(groupDoc).join("\n")
    expect(groupText).toContain("Total 3 orang")
    expect(groupText).toContain(`Rp ${(breakdown.totalIdrPax * 3).toLocaleString("id-ID")}`)

    await generatePDF(params, breakdown, d(breakdown), null, "test-id-1")
    const singleDoc = (renderToBuffer as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
    expect(collectText(singleDoc).join("\n")).not.toContain("Total 1 orang")
  })

  it("renders the basis header, ASCII calc sub-line, and shared footer notes", async () => {
    await generatePDF(params, breakdown, d(breakdown), "Test", "id")
    const doc = (renderToBuffer as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
    const text = collectText(doc).join("\n")
    expect(text).toContain("(basis 4 orang/kamar)")
    expect(text).toContain("SAR 650 x 4 malam") // ASCII x/÷ path for PDF
    expect(text).toContain(EXPORT_NOTES.contact)
  })

  it("generates with manual overrides present (custom + hidden rows)", async () => {
    const ov: ManualOverrides = {
      overrides: { flight: { hidden: true }, hotelMakkah: { idr: 15_000_000 } },
      customRows: [{ id: "c1", label: "Handling", idr: 2_000_000 }],
    }
    const result = await generatePDF(params, breakdown, d(breakdown, ov), "Override Umroh", "test-id-3")
    expect(result).toBeInstanceOf(Uint8Array)
    const doc = (renderToBuffer as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
    const text = collectText(doc).join("\n")
    expect(text).toContain("Handling")
    expect(text).toContain("Hotel Makkah - Olayan Ajyad")
    expect(text).toContain("Rp 15.000.000")
    expect(text).not.toContain("Penerbangan")
  })
})
