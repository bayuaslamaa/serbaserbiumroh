import { describe, it, expect } from "vitest"
import { generateWhatsAppText, buildWhatsAppMessage } from "@/lib/export/whatsapp"
import { applyOverrides } from "@/lib/budget/overrides"
import { EXPORT_NOTES } from "@/lib/export/summary"
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
  services: ["VISA", "SISKOPATUH", "TRANSPORT_JED_MAKKAH"],
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
    { key: "TRANSPORT_JED_MAKKAH", label: "Transportasi", amountDisplay: "SAR 325", unitAmount: 325, currency: "SAR", idr: 1_527_500, divideByPax: true },
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
    // The transport leg is divideByPax → its unit price is spelled out with ÷pax
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

// buildWhatsAppMessage is a distinct, friendlier greeting-style message for the always-visible
// estimator rail's "Kirim WA" flow — not the same shape as generateWhatsAppText's itemized copy
// above, nor BudgetBreakdown's "Salin rincian" text (which stays as-is).
describe("buildWhatsAppMessage", () => {
  it("includes a greeting line", () => {
    const text = buildWhatsAppMessage(d(breakdown), params, params.pax)
    expect(text).toContain("Assalamu'alaikum")
  })

  it("includes a trip summary line with total days, pax, and month", () => {
    const withMonth = { ...params, travelMonth: 11 }
    const text = buildWhatsAppMessage(d(breakdown), withMonth, withMonth.pax)
    // 4 nights Madinah + 9 nights Makkah = 13 days
    expect(text).toContain("Umroh 13 hari untuk 1 orang di bulan November")
  })

  it("omits the month clause when travelMonth is not set", () => {
    const text = buildWhatsAppMessage(d(breakdown), params, params.pax)
    expect(text).toContain("Umroh 13 hari untuk 1 orang")
    expect(text).not.toContain(" di bulan ")
  })

  it("includes nights and hotel name lines for Madinah and Makkah", () => {
    const text = buildWhatsAppMessage(d(breakdown), params, params.pax)
    expect(text).toContain("Madinah: 4 malam di Kayan Hotel")
    expect(text).toContain("Makkah: 9 malam di Olayan Ajyad")
  })

  it("includes the formatted total per person", () => {
    const text = buildWhatsAppMessage(d(breakdown), params, params.pax)
    expect(text).toContain("Total per orang: Rp 35.884.500")
  })

  it("includes a group total line only when pax > 1", () => {
    const groupBreakdown = { ...breakdown, totalIdrGrp: breakdown.totalIdrPax * 3 }
    const single = buildWhatsAppMessage(d(breakdown), params, 1)
    const group = buildWhatsAppMessage(d(groupBreakdown, null, 3), { ...params, pax: 3 }, 3)
    expect(single).not.toContain("Total 1 orang")
    expect(group).toContain("Total 3 orang: Rp 107.653.500")
  })

  it("reuses the shared EXPORT_NOTES contact/disclaimer lines verbatim", () => {
    const text = buildWhatsAppMessage(d(breakdown), params, params.pax)
    expect(text).toContain(EXPORT_NOTES.exclusions)
    expect(text).toContain(EXPORT_NOTES.priceChange)
    expect(text).toContain(EXPORT_NOTES.contact)
  })

  it("produces a different, friendlier shape than the itemized generateWhatsAppText output", () => {
    const friendly = buildWhatsAppMessage(d(breakdown), params, params.pax)
    const itemized = generateWhatsAppText(params, breakdown, d(breakdown))
    expect(friendly).not.toBe(itemized)
    expect(friendly).not.toContain("*RINCIAN PER ORANG*")
  })
})
