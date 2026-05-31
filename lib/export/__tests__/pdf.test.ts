import { describe, it, expect, vi } from "vitest"
import type { BudgetBreakdown, EstimateParams } from "@/types"

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

const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "GARUDA",
  services: ["VISA", "TRANSPORT"],
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
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", idr: 2_854_500, divideByPax: false },
    { key: "TRANSPORT", label: "Transportasi", amountDisplay: "SAR 325", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 17_000_000,
  totalIdrPax: 38_184_500,
  totalIdrGrp: 38_184_500,
  sarRate: 4700,
  usdRate: 17300,
}

describe("generatePDF", () => {
  it("returns a Uint8Array", async () => {
    const result = await generatePDF(params, breakdown, "Test Umroh", "test-id")
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it("returns non-empty buffer", async () => {
    const result = await generatePDF(params, breakdown)
    expect(result.length).toBeGreaterThan(0)
  })

  it("group total rendered when pax > 1", async () => {
    const groupParams = { ...params, pax: 3 }
    const groupBreakdown = { ...breakdown, totalIdrGrp: breakdown.totalIdrPax * 3 }
    // Should not throw when pax > 1 (exercises the conditional branch)
    const result = await generatePDF(groupParams, groupBreakdown, null, "test-id-2")
    expect(result).toBeInstanceOf(Uint8Array)
  })
})
