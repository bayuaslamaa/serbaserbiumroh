import { describe, it, expect } from "vitest"
import { generateWhatsAppText } from "@/lib/export/whatsapp"
import type { BudgetBreakdown, EstimateParams } from "@/types"

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
    { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", idr: 2_854_500, divideByPax: false },
    { key: "SISKOPATUH", label: "Siskopatuh", amountDisplay: "Rp 200.000", idr: 200_000, divideByPax: false },
    { key: "TRANSPORT", label: "Transportasi", amountDisplay: "SAR 325", idr: 1_527_500, divideByPax: true },
  ],
  flightIdr: 14_500_000,
  totalIdrPax: 35_884_500,
  totalIdrGrp: 35_884_500,
  sarRate: 4700,
  usdRate: 17300,
}

describe("generateWhatsAppText", () => {
  it("happy path: contains emoji header", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).toContain("🕋 *ESTIMASI BIAYA UMROH*")
  })

  it("contains selected hotel names", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).toContain("Kayan Hotel")
    expect(text).toContain("Olayan Ajyad")
    expect(text).toContain("SAR 650 × 4 malam × 1 kamar ÷ 4 org (4 org/kamar)")
  })

  it("contains formatted total per person", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).toContain("35.884.500")
  })

  it("pax=1 → no TOTAL GRUP line", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).not.toContain("TOTAL GRUP")
  })

  it("pax=3 → TOTAL GRUP (3 org) line", () => {
    const groupParams = { ...params, pax: 3 }
    const groupBreakdown = { ...breakdown, totalIdrGrp: breakdown.totalIdrPax * 3 }
    const text = generateWhatsAppText(groupParams, groupBreakdown)
    expect(text).toContain("TOTAL GRUP (3 org)")
    expect(text).toContain((breakdown.totalIdrPax * 3).toLocaleString("id-ID"))
  })

  it("contains nights info", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).toContain("Madinah: 4 malam")
    expect(text).toContain("Makkah: 9 malam")
  })

  it("contains service items with display amounts", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).toContain("$165")
    expect(text).toContain("SAR 325")
  })

  it("contains exchange rate footer", () => {
    const text = generateWhatsAppText(params, breakdown)
    expect(text).toContain("SAR 4.700")
    expect(text).toContain("USD 17.300")
  })

  it("includes title when provided", () => {
    const text = generateWhatsAppText(params, breakdown, "Umroh Keluarga")
    expect(text).toContain("Umroh Keluarga")
  })
})
