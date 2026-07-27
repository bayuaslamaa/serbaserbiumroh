import { describe, it, expect } from "vitest"
import { SERVICE_FEE_ROWS } from "@/lib/db/service-fees"
import { serviceKeyEnum } from "@/lib/db/schema"
import { SERVICE_KEYS } from "@/types"

const byKey = new Map(SERVICE_FEE_ROWS.map((row) => [row.key, row]))

describe("service fee catalogue", () => {
  it("prices every key the estimator can offer", () => {
    for (const key of SERVICE_KEYS) {
      expect(byKey.get(key), `${key} has no seeded price`).toBeDefined()
    }
  })

  it("seeds nothing outside the offered keys", () => {
    // The converse check: a retired key left in the seed would keep re-appearing in the table
    // after every run, priced but unreachable.
    for (const row of SERVICE_FEE_ROWS) {
      expect(SERVICE_KEYS, `${row.key} is seeded but not offered`).toContain(row.key)
    }
    expect(SERVICE_FEE_ROWS).toHaveLength(SERVICE_KEYS.length)
  })

  it("can persist every offered key — the database enum accepts it", () => {
    for (const key of SERVICE_KEYS) {
      expect(serviceKeyEnum.enumValues, `${key} is missing from the service_key enum`).toContain(key)
    }
  })

  // The rates published on /transportasi, fees included — not the basePrice fields behind them.
  // An itinerary uses three of these five and comes to 1.500 either way round.
  it.each([
    ["TRANSPORT_JED_MAKKAH", 400],
    ["TRANSPORT_JED_MADINAH", 650],
    ["TRANSPORT_MAKKAH_MADINAH", 550],
    ["TRANSPORT_MAKKAH_JED", 300],
    ["TRANSPORT_MADINAH_JED", 550],
  ] as const)("prices %s at SAR %i per group", (key, amount) => {
    const row = byKey.get(key)
    expect(row).toMatchObject({ currency: "SAR", amount, enabled: true, divideByPax: true })
  })

  it("keeps both full-circuit itineraries at the same 1.500 SAR", () => {
    const total = (keys: string[]) =>
      keys.reduce((sum, key) => sum + (SERVICE_FEE_ROWS.find((r) => r.key === key)?.amount ?? 0), 0)

    const makkahFirst = total(["TRANSPORT_JED_MAKKAH", "TRANSPORT_MAKKAH_MADINAH", "TRANSPORT_MADINAH_JED"])
    const madinahFirst = total(["TRANSPORT_JED_MADINAH", "TRANSPORT_MAKKAH_MADINAH", "TRANSPORT_MAKKAH_JED"])

    expect(makkahFirst).toBe(1500)
    expect(madinahFirst).toBe(1500)
  })

  it("names the route in each leg label, not the vehicle", () => {
    // One vehicle tier today; naming it in six labels would mean six edits when a second appears.
    for (const row of SERVICE_FEE_ROWS.filter((r) => r.key.startsWith("TRANSPORT_"))) {
      expect(row.label).not.toMatch(/staria/i)
      expect(row.label).toMatch(/Jeddah|Makkah|Madinah/)
    }
  })

  it("seeds MUTHOWIF disabled so it cannot reach a quote at SAR 0", () => {
    // calculateBudget skips a disabled service but happily prices a zero-amount one, and the
    // muthowif fee is still unconfirmed.
    expect(byKey.get("MUTHOWIF")).toMatchObject({
      currency: "SAR",
      enabled: false,
      divideByPax: true,
    })
  })

  it("no longer seeds the retired TRANSPORT key", () => {
    // Saved estimates that still reference it are expanded on read by normaliseServices, so the
    // row has no reason to exist — and while it exists the admin pricing screen offers it back.
    expect(SERVICE_FEE_ROWS.map((r) => r.key)).not.toContain("TRANSPORT")
    // The Postgres enum keeps the value (it cannot be dropped), which is exactly why the
    // application-layer catalogue is the thing that has to stop naming it.
    expect(serviceKeyEnum.enumValues).toContain("TRANSPORT")
  })
})
