import { describe, it, expect } from "vitest"
import { generateWhatsAppText } from "@/lib/export/whatsapp"
import { applyOverrides } from "@/lib/budget/overrides"
import type { BudgetBreakdown, EstimateParams, ManualOverrides } from "@/types"

// Helper: build the override-aware display the renderer now consumes.
function d(b: BudgetBreakdown, ov: ManualOverrides | null = null, pax = 1) {
  return applyOverrides(b, ov, pax)
}

const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT"],
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
  servicesIdr: 4_582_000,
  serviceItems: [
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 2_854_500, divideByPax: false },
    { key: "SISKOPATUH", label: "Siskopatuh", amountDisplay: "Rp 200.000", unitAmount: 200_000, currency: "IDR", idr: 200_000, divideByPax: false },
    { key: "TRANSPORT", label: "Transportasi", amountDisplay: "SAR 325", unitAmount: 325, currency: "SAR", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 14_500_000,
  totalIdrPax: 35_884_500,
  totalIdrGrp: 35_884_500,
  sarRate: 4700,
  usdRate: 17300,
}

describe("generateWhatsAppText", () => {
  it("happy path: contains emoji header", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("🕋 *ESTIMASI BIAYA UMROH*")
  })

  it("contains selected hotel names", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("Kayan Hotel")
    expect(text).toContain("Olayan Ajyad")
    expect(text).toContain("SAR 650 × 4 malam ÷ 4 pax")
  })

  it("contains formatted total per person", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("35.884.500")
  })

  it("pax=1 → no group total line", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).not.toContain("TOTAL 1 ORANG")
  })

  it("pax=3 → TOTAL 3 ORANG line and a divide-by-pax calc sub-line", () => {
    const groupParams = { ...params, pax: 3 }
    const groupBreakdown = { ...breakdown, totalIdrGrp: breakdown.totalIdrPax * 3 }
    const text = generateWhatsAppText(groupParams, groupBreakdown, d(groupBreakdown, null, 3))
    expect(text).toContain("TOTAL 3 ORANG")
    expect(text).toContain((breakdown.totalIdrPax * 3).toLocaleString("id-ID"))
    // TRANSPORT is divideByPax → its unit price is spelled out with ÷pax
    expect(text).toContain("SAR 325 ÷ 3 pax")
  })

  it("uses a basis header and clean component labels (unit moved to calc line)", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("💰 *RINCIAN PER ORANG* (basis 4 orang/kamar)")
    expect(text).toContain("• Visa Umroh Reguler\n") // suffix stripped from the label
    expect(text).not.toContain("Reguler ($165)")
    expect(text).toContain("$165") // still shown, in the calc line
  })

  it("omits the basis header when no hotel row shows its formula", () => {
    const ov: ManualOverrides = {
      overrides: { hotelMadinah: { idr: 3_000_000 }, hotelMakkah: { idr: 14_000_000 } },
      customRows: [],
    }
    const text = generateWhatsAppText(params, breakdown, d(breakdown, ov))
    expect(text).not.toContain("basis")
  })

  it("contains nights info", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("Madinah: 4 malam")
    expect(text).toContain("Makkah: 9 malam")
  })

  it("contains service items with display amounts", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("$165")
    expect(text).toContain("SAR 325")
  })

  it("contains exchange rate footer", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(text).toContain("SAR 1 = Rp 4.700")
    expect(text).toContain("USD 1 = Rp 17.300")
  })

  it("includes title when provided", () => {
    const text = generateWhatsAppText(params, breakdown, d(breakdown), "Umroh Keluarga")
    expect(text).toContain("Umroh Keluarga")
  })
})

describe("generateWhatsAppText with manual overrides", () => {
  it("reflects an overridden amount and renamed row in the total", () => {
    const ov: ManualOverrides = {
      overrides: { hotelMakkah: { idr: 20_000_000, label: "Hotel Nego Makkah" } },
      customRows: [],
    }
    const text = generateWhatsAppText(params, breakdown, d(breakdown, ov))
    // renamed label + new amount; old formula dropped
    expect(text).toContain("Hotel Nego Makkah")
    expect(text).toContain("20.000.000")
    expect(text).not.toContain("SAR 1.300 × 9 malam")
    // total shifted by +20M-13,747,500
    const expectedTotal = 35_884_500 - 13_747_500 + 20_000_000
    expect(text).toContain(`*TOTAL PER ORANG: Rp ${expectedTotal.toLocaleString("id-ID")}*`)
  })

  it("drops a hidden row from the text and the total", () => {
    const ov: ManualOverrides = { overrides: { flight: { hidden: true } }, customRows: [] }
    const text = generateWhatsAppText(params, breakdown, d(breakdown, ov))
    // the itemized flight cost row is dropped (its amount no longer appears; the ✈️ header line remains)
    expect(text).not.toContain("14.500.000")
    expect(text).toContain(`*TOTAL PER ORANG: Rp ${(35_884_500 - 14_500_000).toLocaleString("id-ID")}*`)
  })

  it("includes a custom row", () => {
    const ov: ManualOverrides = {
      overrides: {},
      customRows: [{ id: "c1", label: "Manasik", idr: 350_000 }],
    }
    const text = generateWhatsAppText(params, breakdown, d(breakdown, ov))
    expect(text).toContain("Manasik")
    expect(text).toContain("350.000")
  })

  it("zero-override output is unchanged from the raw breakdown path", () => {
    const withEmpty = generateWhatsAppText(params, breakdown, d(breakdown, { overrides: {}, customRows: [] }), null)
    const raw = generateWhatsAppText(params, breakdown, d(breakdown), null)
    expect(withEmpty).toBe(raw)
  })
})
