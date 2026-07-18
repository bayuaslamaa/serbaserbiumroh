import { describe, it, expect } from "vitest"
import {
  arePersistableEstimateTotals,
  validateManualOverrides,
  MAX_IDR,
  MAX_ROWS,
  MAX_LABEL_LEN,
} from "@/lib/estimate/overrides"

const valid = {
  overrides: {
    hotelMakkah: { idr: 13_000_000, label: "Negotiated Makkah", autoIdrAtOverride: 12_000_000 },
    "service:VISA": { hidden: true },
    flight: { idr: 15_000_000 },
  },
  customRows: [
    { id: "c1", label: "Manasik", idr: 300_000 },
    { id: "c2", label: "Handling", idr: 3_000_000 },
  ],
}

describe("validateManualOverrides — accepts", () => {
  it("a well-formed object", () => {
    expect(validateManualOverrides(valid)).toBe(true)
  })

  it("an empty structure", () => {
    expect(validateManualOverrides({ overrides: {}, customRows: [] })).toBe(true)
  })

  it("a unit-price override", () => {
    expect(validateManualOverrides({ overrides: { hotelMakkah: { unitPrice: 1300 } }, customRows: [] })).toBe(true)
  })
})

describe("validateManualOverrides — rejects", () => {
  it("non-object input", () => {
    expect(validateManualOverrides(null)).toBe(false)
    expect(validateManualOverrides("x")).toBe(false)
    expect(validateManualOverrides([])).toBe(false)
  })

  it("missing/invalid top-level shape", () => {
    expect(validateManualOverrides({ overrides: {} })).toBe(false) // no customRows
    expect(validateManualOverrides({ customRows: [] })).toBe(false) // no overrides
    expect(validateManualOverrides({ overrides: [], customRows: [] })).toBe(false) // overrides is array
    expect(validateManualOverrides({ overrides: {}, customRows: [], extra: true })).toBe(false)
  })

  it("an unknown, non-custom override key", () => {
    expect(validateManualOverrides({ overrides: { bogus: { idr: 1 } }, customRows: [] })).toBe(false)
    expect(validateManualOverrides({ overrides: { "service:NOPE": { idr: 1 } }, customRows: [] })).toBe(false)
  })

  it("negative or non-integer amounts", () => {
    expect(validateManualOverrides({ overrides: { flight: { idr: -1 } }, customRows: [] })).toBe(false)
    expect(validateManualOverrides({ overrides: { flight: { idr: 1.5 } }, customRows: [] })).toBe(false)
    expect(validateManualOverrides({ overrides: { flight: { idr: MAX_IDR + 1 } }, customRows: [] })).toBe(false)
    expect(validateManualOverrides({ overrides: { flight: { idr: 1, extra: true } }, customRows: [] })).toBe(false)
  })

  it("a negative or non-integer unit price", () => {
    expect(validateManualOverrides({ overrides: { hotelMakkah: { unitPrice: -1 } }, customRows: [] })).toBe(false)
    expect(validateManualOverrides({ overrides: { hotelMakkah: { unitPrice: 1.5 } }, customRows: [] })).toBe(false)
  })

  it("an over-length label", () => {
    const long = "x".repeat(MAX_LABEL_LEN + 1)
    expect(validateManualOverrides({ overrides: { flight: { label: long } }, customRows: [] })).toBe(false)
    expect(validateManualOverrides({ overrides: {}, customRows: [{ id: "c", label: "   ", idr: 1 }] })).toBe(false)
  })

  it("a custom row missing idr or containing undeclared fields", () => {
    expect(
      validateManualOverrides({ overrides: {}, customRows: [{ id: "c", label: "x" }] }),
    ).toBe(false)
    expect(
      validateManualOverrides({ overrides: {}, customRows: [{ id: "c", label: "x", idr: 1, extra: true }] }),
    ).toBe(false)
  })

  it("duplicate custom-row ids", () => {
    expect(
      validateManualOverrides({
        overrides: {},
        customRows: [
          { id: "dup", label: "a", idr: 1 },
          { id: "dup", label: "b", idr: 2 },
        ],
      }),
    ).toBe(false)
  })

  it("more override keys or custom rows than the cap", () => {
    const overrides: Record<string, unknown> = {}
    for (let i = 0; i < MAX_ROWS + 1; i++) overrides[`service:VISA${i}`] = { idr: 1 }
    expect(validateManualOverrides({ overrides, customRows: [] })).toBe(false)

    const customRows = Array.from({ length: MAX_ROWS + 1 }, (_, i) => ({
      id: `c${i}`,
      label: "x",
      idr: 1,
    }))
    expect(validateManualOverrides({ overrides: {}, customRows })).toBe(false)
  })
})

describe("arePersistableEstimateTotals", () => {
  it("accepts PostgreSQL integer totals and rejects aggregate overflow", () => {
    expect(arePersistableEstimateTotals(35_000_000, 140_000_000)).toBe(true)
    expect(arePersistableEstimateTotals(MAX_IDR, MAX_IDR)).toBe(true)
    expect(arePersistableEstimateTotals(MAX_IDR + 1, MAX_IDR)).toBe(false)
    expect(arePersistableEstimateTotals(MAX_IDR, MAX_IDR + 1)).toBe(false)
  })
})
