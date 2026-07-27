import { describe, it, expect } from "vitest"
import { calculateBudget } from "@/lib/budget/calculate"
import { applyOverrides } from "@/lib/budget/overrides"
import { isServiceKey, normaliseServices } from "@/lib/estimate/services"
import { normaliseAndValidateEstimateParams, validateEstimateParamsShape } from "@/lib/estimate/params"
import { normaliseAndValidateManualOverrides, validateManualOverrides } from "@/lib/estimate/overrides"
import { DEFAULT_PARAMS, SERVICE_KEYS } from "@/types"
import type { BreakdownDisplay, EstimateParams, PricingConfig } from "@/types"

// Deliberately holds the retired TRANSPORT key: this is the one place in the suite that still
// carries it, standing in for the 19 saved estimates whose JSONB params were written before the
// per-leg catalogue existed.
const pricing: PricingConfig = {
  rates: { SAR: 4700, USD: 17300 },
  hotels: {
    MADINAH: {
      ECONOMY: { sarPerNight: 450, label: "Ekonomi Madinah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 650, label: "Standard Madinah", sublabel: "4★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 2000, label: "Pelataran Nabawi", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 3500, label: "Premium Madinah", sublabel: "5★", monthlyPrices: {} },
    },
    MAKKAH: {
      ECONOMY: { sarPerNight: 800, label: "Ekonomi Makkah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 1300, label: "Safwa Tower 3", sublabel: "3★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 3500, label: "Pelataran Haram", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 6000, label: "Premium Makkah", sublabel: "5★", monthlyPrices: {} },
    },
  },
  airlines: {
    BUDGET: { idr: 12_500_000, label: "Lion Air", monthlyPrices: {} },
    STANDARD: { idr: 14_500_000, label: "Batik Air", monthlyPrices: {} },
    GARUDA: { idr: 17_000_000, label: "Garuda", monthlyPrices: {} },
    BUSINESS: { idr: 25_000_000, label: "Business", monthlyPrices: {} },
  },
  services: {
    VISA: { currency: "USD", amount: 165, label: "Visa Umroh Reguler", enabled: true, divideByPax: false },
    SISKOPATUH: { currency: "IDR", amount: 200_000, label: "Siskopatuh", enabled: true, divideByPax: false },
    TASREH: { currency: "SAR", amount: 25, label: "Tasreh Raudhah", enabled: true, divideByPax: false },
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
    TRANSPORT_JED_MAKKAH: { currency: "SAR", amount: 400, label: "Transportasi Jeddah → Makkah", enabled: true, divideByPax: true },
    TRANSPORT_JED_MADINAH: { currency: "SAR", amount: 650, label: "Transportasi Jeddah → Madinah", enabled: true, divideByPax: true },
    TRANSPORT_MAKKAH_MADINAH: { currency: "SAR", amount: 550, label: "Transportasi Makkah ↔ Madinah", enabled: true, divideByPax: true },
    TRANSPORT_MAKKAH_JED: { currency: "SAR", amount: 300, label: "Transportasi Makkah → Jeddah", enabled: true, divideByPax: true },
    TRANSPORT_MADINAH_JED: { currency: "SAR", amount: 550, label: "Transportasi Madinah → Jeddah", enabled: true, divideByPax: true },
    MUTHOWIF: { currency: "SAR", amount: 0, label: "Muthowif", enabled: false, divideByPax: true },
    // The retired all-or-nothing row, as a deployed database that has not been re-synced still
    // holds it. Nothing may price against it.
    TRANSPORT: { currency: "SAR", amount: 325, label: "Transportasi Full Rute", enabled: true, divideByPax: true },
  } as PricingConfig["services"],
  roomMultipliers: {
    QUINT: { paxPerRoom: 5, multiplier: 1.0 },
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.0 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.0 },
  },
}

// A saved estimate as it sits in JSONB today: services still names the retired composite key.
const storedParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "NONE",
  services: ["TRANSPORT"],
  fullboard: true,
} as unknown as EstimateParams

describe("saved estimates carrying the retired TRANSPORT key", () => {
  // Every assertion here is on a price or a service list. `calculateBudget` skips a key it cannot
  // find in the pricing map without throwing, so "it did not throw" would pass with or without the
  // normaliser and would prove nothing.
  it("prices the three Makkah-first legs — 1.500 SAR", () => {
    const result = calculateBudget(storedParams, pricing)

    expect(result.serviceItems.map((s) => s.key)).toEqual([
      "TRANSPORT_JED_MAKKAH",
      "TRANSPORT_MAKKAH_MADINAH",
      "TRANSPORT_MADINAH_JED",
    ])
    expect(result.servicesIdr).toBe(1_500 * 4_700)
  })

  it("never prices the retired row itself, even while the database still holds it", () => {
    const result = calculateBudget(storedParams, pricing)
    expect(result.serviceItems.map((s) => s.key)).not.toContain("TRANSPORT")
    expect(result.servicesIdr).not.toBe(325 * 4_700)
  })

  it("keeps the retired key out of the pricing config a deployed database builds", () => {
    // fetchPricingConfig reads whatever rows service_fees holds, and a deployed table still has
    // the TRANSPORT row until syncServiceFees runs.
    expect(isServiceKey("TRANSPORT")).toBe(false)
  })
})

describe("normaliseServices", () => {
  it("expands the retired key to the three Makkah-first legs, in itinerary order", () => {
    expect(normaliseServices(["VISA", "TRANSPORT"])).toEqual([
      "VISA",
      "TRANSPORT_JED_MAKKAH",
      "TRANSPORT_MAKKAH_MADINAH",
      "TRANSPORT_MADINAH_JED",
    ])
  })

  it("drops a key the catalogue does not know and keeps the rest — a general guard, not a TRANSPORT case", () => {
    expect(normaliseServices(["VISA", "SOME_KEY_FROM_2024", "TASREH"])).toEqual(["VISA", "TASREH"])
  })

  it("still prices the surviving services when a stored list carries an unknown key", () => {
    const result = calculateBudget(
      { ...storedParams, services: ["SISKOPATUH", "AIRPORT_LOUNGE"] } as unknown as EstimateParams,
      pricing
    )
    expect(result.serviceItems.map((s) => s.key)).toEqual(["SISKOPATUH"])
    expect(result.servicesIdr).toBe(200_000)
  })

  it("leaves a list that already holds leg keys untouched", () => {
    const legs = ["VISA", "TRANSPORT_JED_MAKKAH", "TRANSPORT_MAKKAH_MADINAH", "TRANSPORT_MADINAH_JED"]
    expect(normaliseServices(legs)).toEqual(legs)
  })

  it("is idempotent — applying it twice expands nothing a second time", () => {
    const once = normaliseServices(["VISA", "TRANSPORT"])
    expect(normaliseServices(once)).toEqual(once)
  })

  it("collapses the duplicate when a list holds both the retired key and one of its legs", () => {
    expect(normaliseServices(["TRANSPORT_JED_MAKKAH", "TRANSPORT"])).toEqual([
      "TRANSPORT_JED_MAKKAH",
      "TRANSPORT_MAKKAH_MADINAH",
      "TRANSPORT_MADINAH_JED",
    ])
  })

  it("survives a params snapshot with no services array at all", () => {
    expect(normaliseServices(undefined)).toEqual([])
  })
})

describe("validation at the API boundary", () => {
  it("TRANSPORT is no longer a valid input service", () => {
    expect(validateEstimateParamsShape(storedParams)).toBe(false)
    expect(SERVICE_KEYS).not.toContain("TRANSPORT")
  })

  it("but a stored snapshot naming it is normalised and then accepted, with the legs in place", () => {
    const accepted = normaliseAndValidateEstimateParams(storedParams)
    expect(accepted?.services).toEqual([
      "TRANSPORT_JED_MAKKAH",
      "TRANSPORT_MAKKAH_MADINAH",
      "TRANSPORT_MADINAH_JED",
    ])
  })

  it("a genuinely invalid snapshot is still rejected", () => {
    expect(normaliseAndValidateEstimateParams({ ...storedParams, hotelTier: "PENTHOUSE" })).toBeNull()
    expect(normaliseAndValidateEstimateParams("not an object")).toBeNull()
  })

  it("a key the catalogue has never known is rejected, not quietly discarded from the request", () => {
    // Dropping unknowns is right when re-costing stored history, wrong at an input boundary: a
    // typo'd key would vanish from the quote with nothing to show for it.
    expect(
      normaliseAndValidateEstimateParams({ ...storedParams, services: ["VISA", "NOT_A_SERVICE"] })
    ).toBeNull()
  })
})

// What the transport lines actually contribute to the quote, hidden rows excluded — the money the
// remap is supposed to preserve, isolated from the hotel and flight rows around it.
function visibleTransportIdr(display: BreakdownDisplay): number {
  return display.rows
    .filter((r) => r.key.startsWith("service:TRANSPORT") && !r.hidden)
    .reduce((sum, r) => sum + r.idr, 0)
}

describe("manual overrides keyed on the retired service", () => {
  const stored = {
    overrides: { "service:TRANSPORT": { unitPrice: 650 } },
    customRows: [],
  }

  it("a stored service:TRANSPORT override does not validate as-is", () => {
    expect(validateManualOverrides(stored)).toBe(false)
  })

  it("is remapped onto the first leg rather than being dropped, and then validates", () => {
    const normalised = normaliseAndValidateManualOverrides(stored)
    expect(normalised).not.toBeNull()
    expect(normalised!.overrides["service:TRANSPORT"]).toBeUndefined()
    expect(normalised!.overrides["service:TRANSPORT_JED_MAKKAH"]).toEqual({ unitPrice: 650 })
  })

  it("hides the other two legs so the hand-set price still means the same money", () => {
    // The retired key was ONE row at ONE price. One priced leg plus two hidden ones reproduces
    // the saved line and the saved total; leaving the legs visible would silently add 1.100 SAR.
    const normalised = normaliseAndValidateManualOverrides(stored)!
    const display = applyOverrides(calculateBudget(storedParams, pricing), normalised, 1)
    const transportRows = display.rows.filter((r) => r.key.startsWith("service:TRANSPORT"))

    expect(transportRows.filter((r) => !r.hidden).map((r) => r.key)).toEqual([
      "service:TRANSPORT_JED_MAKKAH",
    ])
    expect(visibleTransportIdr(display)).toBe(650 * 4_700)
  })

  it("a label-only override carries no money, so it moves across without hiding anything", () => {
    const normalised = normaliseAndValidateManualOverrides({
      overrides: { "service:TRANSPORT": { label: "Bus carter" } },
      customRows: [],
    })!
    expect(normalised.overrides["service:TRANSPORT_JED_MAKKAH"]).toEqual({ label: "Bus carter" })
    expect(normalised.overrides["service:TRANSPORT_MAKKAH_MADINAH"]).toBeUndefined()

    const display = applyOverrides(calculateBudget(storedParams, pricing), normalised, 1)
    expect(visibleTransportIdr(display)).toBe(1_500 * 4_700)
  })

  it("leaves overrides that name no retired key exactly as they were", () => {
    const untouched = { overrides: { hotelMakkah: { idr: 12_000_000 } }, customRows: [] }
    expect(normaliseAndValidateManualOverrides(untouched)).toEqual(untouched)
  })
})

describe("DEFAULT_PARAMS", () => {
  it("names no retired key and quotes exactly one Jeddah→Makkah leg", () => {
    expect(DEFAULT_PARAMS.services).not.toContain("TRANSPORT")
    expect(DEFAULT_PARAMS.services.filter((s) => s === "TRANSPORT_JED_MAKKAH")).toHaveLength(1)
    expect(normaliseServices(DEFAULT_PARAMS.services)).toEqual(DEFAULT_PARAMS.services)
  })
})
