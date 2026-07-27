import { describe, it, expect } from "vitest"
import { applyOverrides, breakdownToBaseRows, isEmptyOverrides } from "@/lib/budget/overrides"
import type { BudgetBreakdown, HotelCostDetail, ManualOverrides } from "@/types"

const madinahDetail: HotelCostDetail = {
  label: "Kayan Hotel",
  tier: "STANDARD",
  sarPerNight: 650,
  nights: 4,
  roomPax: 4,
  roomCount: 1,
  totalPax: 4,
  roomMultiplier: 1,
}

const makkahDetail: HotelCostDetail = {
  label: "Olayan Ajyad",
  tier: "STANDARD",
  sarPerNight: 1300,
  nights: 9,
  roomPax: 4,
  roomCount: 1,
  totalPax: 4,
  roomMultiplier: 1,
}

function makeBreakdown(): BudgetBreakdown {
  return {
    hotelMadinahIdr: 3_000_000,
    hotelMakkahIdr: 12_000_000,
    hotelMadinahDetail: madinahDetail,
    hotelMakkahDetail: makkahDetail,
    servicesIdr: 4_500_000,
    serviceItems: [
      { key: "VISA", label: "Visa Umroh Reguler", amountDisplay: "$165", unitAmount: 165, currency: "USD", idr: 2_800_000, divideByPax: false },
      { key: "SISKOPATUH", label: "Siskopatuh", amountDisplay: "Rp 200.000", unitAmount: 200_000, currency: "IDR", idr: 200_000, divideByPax: false },
      { key: "TRANSPORT_JED_MAKKAH", label: "Transportasi", amountDisplay: "SAR 325", unitAmount: 325, currency: "SAR", idr: 1_500_000, divideByPax: true },
    ],
    flightIdr: 14_500_000,
    totalIdrPax: 34_000_000,
    totalIdrGrp: 34_000_000,
    sarRate: 4700,
    usdRate: 17300,
  }
}

const empty: ManualOverrides = { overrides: {}, customRows: [] }

describe("breakdownToBaseRows", () => {
  it("produces ordered keyed rows: hotels, services, flight", () => {
    const rows = breakdownToBaseRows(makeBreakdown())
    expect(rows.map((r) => r.key)).toEqual([
      "hotelMadinah",
      "hotelMakkah",
      "service:VISA",
      "service:SISKOPATUH",
      "service:TRANSPORT_JED_MAKKAH",
      "flight",
    ])
  })
})

describe("applyOverrides — empty/backward compatible", () => {
  it("null overrides yield rows and totals identical to the raw breakdown", () => {
    const b = makeBreakdown()
    const d = applyOverrides(b, null, 4)
    expect(d.rows).toHaveLength(6)
    expect(d.rows.every((r) => r.source === "computed")).toBe(true)
    expect(d.totalIdrPax).toBe(34_000_000)
    expect(d.totalIdrGrp).toBe(34_000_000 * 4)
    // order preserved
    expect(d.rows[1].label).toBe("Hotel Makkah - Olayan Ajyad")
    // hotel formula data carried for auto rows
    expect(d.rows[0].hotelDetail).toEqual(madinahDetail)
    expect(d.rows[5].label).toBe("Penerbangan")
  })

  it("empty override object behaves like null", () => {
    const b = makeBreakdown()
    expect(applyOverrides(b, empty, 4)).toEqual(applyOverrides(b, null, 4))
  })

  it("totalIdrGrp = totalIdrPax * pax when all rows are per-person", () => {
    const d = applyOverrides(makeBreakdown(), null, 3)
    expect(d.totalIdrGrp).toBe(d.totalIdrPax * 3)
  })
})

describe("applyOverrides — amount and label overrides", () => {
  it("amount override replaces the value, drops the formula, marks overridden", () => {
    const ov: ManualOverrides = { overrides: { hotelMakkah: { idr: 13_000_000 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const makkah = d.rows.find((r) => r.key === "hotelMakkah")!
    expect(makkah.idr).toBe(13_000_000)
    expect(makkah.source).toBe("overridden")
    expect(makkah.hotelDetail).toBeUndefined()
    // total reflects: 34M - 12M + 13M
    expect(d.totalIdrPax).toBe(35_000_000)
    // other rows untouched
    expect(d.rows.find((r) => r.key === "hotelMadinah")!.idr).toBe(3_000_000)
  })

  it("label-only override keeps the computed amount and formula", () => {
    const ov: ManualOverrides = { overrides: { hotelMadinah: { label: "Hotel Nabawi Deluxe" } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const row = d.rows.find((r) => r.key === "hotelMadinah")!
    expect(row.label).toBe("Hotel Nabawi Deluxe")
    expect(row.idr).toBe(3_000_000)
    expect(row.hotelDetail).toEqual(madinahDetail)
    expect(row.source).toBe("overridden")
    expect(d.totalIdrPax).toBe(34_000_000)
  })

  it("overriding a service amount drops its foreign-currency display", () => {
    const ov: ManualOverrides = { overrides: { "service:VISA": { idr: 3_000_000 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 1)
    const visa = d.rows.find((r) => r.key === "service:VISA")!
    expect(visa.idr).toBe(3_000_000)
    expect(visa.amountDisplay).toBeUndefined()
    expect(visa.label).toBe("Visa Umroh Reguler")
  })
})

describe("applyOverrides — unit price column", () => {
  it("exposes each row's native unit price and currency", () => {
    const d = applyOverrides(makeBreakdown(), null, 4)
    const byKey = Object.fromEntries(d.rows.map((r) => [r.key, r]))
    expect(byKey["hotelMadinah"].unitPrice).toBe(650)
    expect(byKey["hotelMadinah"].unitCurrency).toBe("SAR")
    expect(byKey["service:VISA"].unitPrice).toBe(165)
    expect(byKey["service:VISA"].unitCurrency).toBe("USD")
    expect(byKey["service:SISKOPATUH"].unitCurrency).toBe("IDR")
    expect(byKey["flight"].unitPrice).toBe(14_500_000)
    expect(byKey["flight"].unitCurrency).toBe("IDR")
  })

  it("a unit-price override rescales the value linearly and marks the row overridden", () => {
    // 1300 → 1430 SAR is a 1.1× bump on the 12,000,000 base
    const ov: ManualOverrides = { overrides: { hotelMakkah: { unitPrice: 1430 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const makkah = d.rows.find((r) => r.key === "hotelMakkah")!
    expect(makkah.unitPrice).toBe(1430)
    expect(makkah.idr).toBe(13_200_000)
    expect(makkah.source).toBe("overridden")
    // formula caption reflects the overridden SAR rate
    expect(makkah.hotelDetail?.sarPerNight).toBe(1430)
    expect(d.totalIdrPax).toBe(34_000_000 - 12_000_000 + 13_200_000)
  })

  it("a unit-price override on a service drops its foreign-currency display", () => {
    const ov: ManualOverrides = { overrides: { "service:VISA": { unitPrice: 330 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 1)
    const visa = d.rows.find((r) => r.key === "service:VISA")!
    expect(visa.idr).toBe(5_600_000) // 330/165 × 2,800,000
    expect(visa.amountDisplay).toBeUndefined()
    expect(visa.label).toBe("Visa Umroh Reguler")
  })

  it("a direct value override wins and leaves the unit price at the catalog rate", () => {
    const ov: ManualOverrides = { overrides: { hotelMakkah: { idr: 13_000_000 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const makkah = d.rows.find((r) => r.key === "hotelMakkah")!
    expect(makkah.idr).toBe(13_000_000)
    expect(makkah.unitPrice).toBe(1300) // base catalog SAR rate
    expect(makkah.hotelDetail).toBeUndefined() // formula dropped for a direct value override
  })

  it("custom rows expose the amount as an IDR unit price", () => {
    const ov: ManualOverrides = { overrides: {}, customRows: [{ id: "c1", label: "Manasik", idr: 300_000 }] }
    const custom = applyOverrides(makeBreakdown(), ov, 4).rows.find((r) => r.key === "custom:c1")!
    expect(custom.unitPrice).toBe(300_000)
    expect(custom.unitCurrency).toBe("IDR")
    expect(custom.unitEditable).toBe(true)
  })

  it("rescales a divide-by-pax service and keeps the group total consistent", () => {
    // The Jeddah→Makkah leg is shared (÷pax); 325 → 650 SAR doubles its per-person value
    const ov: ManualOverrides = { overrides: { "service:TRANSPORT_JED_MAKKAH": { unitPrice: 650 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const transport = d.rows.find((r) => r.key === "service:TRANSPORT_JED_MAKKAH")!
    expect(transport.idr).toBe(3_000_000) // 650/325 × 1,500,000
    expect(transport.shared).toBe(true)
    expect(d.totalIdrGrp).toBe(d.totalIdrPax * 4)
  })

  it("rounds a non-clean rescale to an integer", () => {
    // 650 → 651 on a 3,000,000 base: 651/650 × 3,000,000 = 3,004,615.38…
    const ov: ManualOverrides = { overrides: { hotelMadinah: { unitPrice: 651 } }, customRows: [] }
    const madinah = applyOverrides(makeBreakdown(), ov, 4).rows.find((r) => r.key === "hotelMadinah")!
    expect(madinah.idr).toBe(3_004_615)
    expect(Number.isInteger(madinah.idr)).toBe(true)
  })

  it("marks a zero-base foreign-currency row as non-unit-editable, but keeps plain-IDR rows editable", () => {
    // A waived service still priced in SAR has no recoverable rate → unit editing must be disabled
    // so a typed SAR amount is never mistaken for raw IDR (factor=1 fallback ambiguity).
    const b = makeBreakdown()
    b.serviceItems = [
      ...b.serviceItems,
      { key: "TASREH", label: "Tasreh", amountDisplay: "SAR 0", unitAmount: 0, currency: "SAR", idr: 0, divideByPax: false },
    ]
    const d = applyOverrides(b, null, 4)
    expect(d.rows.find((r) => r.key === "service:TASREH")!.unitEditable).toBe(false)
    // a plain-IDR row with a 0 base (flight NONE) keeps factor=1 correctly and stays editable
    const zeroFlight = makeBreakdown()
    zeroFlight.flightIdr = 0
    expect(applyOverrides(zeroFlight, null, 4).rows.find((r) => r.key === "flight")!.unitEditable).toBe(true)
  })
})

describe("applyOverrides — hidden rows", () => {
  it("hidden row stays in the list, struck from totals", () => {
    const ov: ManualOverrides = { overrides: { flight: { hidden: true } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const flight = d.rows.find((r) => r.key === "flight")!
    expect(flight.hidden).toBe(true)
    expect(d.rows).toHaveLength(6)
    expect(d.totalIdrPax).toBe(34_000_000 - 14_500_000)
    expect(d.totalIdrGrp).toBe((34_000_000 - 14_500_000) * 4)
  })
})

describe("applyOverrides — custom rows", () => {
  it("per-person custom row counts once per person and ×pax at group", () => {
    const ov: ManualOverrides = {
      overrides: {},
      customRows: [{ id: "c1", label: "Manasik", idr: 300_000 }],
    }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    const custom = d.rows.find((r) => r.key === "custom:c1")!
    expect(custom.source).toBe("custom")
    expect(custom.label).toBe("Manasik")
    expect(d.totalIdrPax).toBe(34_300_000)
    expect(d.totalIdrGrp).toBe(34_300_000 * 4)
  })

})

describe("applyOverrides — stale detection", () => {
  it("flags a row when the auto value has changed since the override was captured", () => {
    const ov: ManualOverrides = {
      overrides: { hotelMakkah: { idr: 13_000_000, autoIdrAtOverride: 11_000_000 } },
      customRows: [],
    }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    expect(d.rows.find((r) => r.key === "hotelMakkah")!.stale).toBe(true)
  })

  it("not stale when the captured auto value still matches", () => {
    const ov: ManualOverrides = {
      overrides: { hotelMakkah: { idr: 13_000_000, autoIdrAtOverride: 12_000_000 } },
      customRows: [],
    }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    expect(d.rows.find((r) => r.key === "hotelMakkah")!.stale).toBe(false)
  })
})

describe("applyOverrides — orphan override keys", () => {
  it("ignores an override for a service that is not in the breakdown", () => {
    const ov: ManualOverrides = { overrides: { "service:TASREH": { idr: 500_000 } }, customRows: [] }
    const d = applyOverrides(makeBreakdown(), ov, 4)
    expect(d.rows).toHaveLength(6)
    expect(d.rows.some((r) => r.key === "service:TASREH")).toBe(false)
    expect(d.totalIdrPax).toBe(34_000_000)
  })
})

describe("isEmptyOverrides", () => {
  it("true for null, undefined, and empty structures", () => {
    expect(isEmptyOverrides(null)).toBe(true)
    expect(isEmptyOverrides(undefined)).toBe(true)
    expect(isEmptyOverrides(empty)).toBe(true)
    expect(isEmptyOverrides({ overrides: { hotelMakkah: {} }, customRows: [] })).toBe(true)
  })

  it("false when there is a real override or custom row", () => {
    expect(isEmptyOverrides({ overrides: { hotelMakkah: { idr: 1 } }, customRows: [] })).toBe(false)
    expect(
      isEmptyOverrides({ overrides: {}, customRows: [{ id: "x", label: "y", idr: 1 }] }),
    ).toBe(false)
  })
})
