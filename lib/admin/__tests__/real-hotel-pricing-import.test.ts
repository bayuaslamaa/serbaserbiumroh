import { describe, it, expect, vi } from "vitest"
import { normalizeHotelPricingImportKey } from "@/lib/admin/hotel-pricing-import"
import { realHotelPrices } from "@/lib/db/schema"
import { applyRealHotelPricing, parseRealHotelPricingCsv } from "@/lib/admin/real-hotel-pricing-import"

const existingHotels = [
  {
    id: "h-makkah",
    city: "MAKKAH" as const,
    tier: "STANDARD" as const,
    label: "Safwa Tower 3",
    importKey: normalizeHotelPricingImportKey({ city: "MAKKAH", tier: "STANDARD", label: "Safwa Tower 3" }),
  },
]

function plan(csv: string, sourceLabel = "Katalog Test") {
  return parseRealHotelPricingCsv(csv, existingHotels, sourceLabel)
}

describe("parseRealHotelPricingCsv", () => {
  it("upserts each filled month for a matched existing hotel, tagged with the source", () => {
    const p = plan(
      ["city,tier,label,base_sar_per_night,feb_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,1300,2500,1400"].join("\n"),
      "Katalog Emaar 2027",
    )
    expect(p.hotelsMatched).toBe(1)
    expect(p.unmatched).toEqual([])
    expect(p.rowErrors).toEqual([])
    expect(p.upserts).toEqual([
      { hotelPriceId: "h-makkah", month: 2, roomType: "QUAD", sarPerNight: 2500, sourceLabel: "Katalog Emaar 2027" },
      { hotelPriceId: "h-makkah", month: 8, roomType: "QUAD", sarPerNight: 1400, sourceLabel: "Katalog Emaar 2027" },
    ])
  })

  it("only emits explicitly-filled months — a blank month cell (and the base column) is skipped", () => {
    const p = plan(["city,tier,label,base_sar_per_night,feb_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,1300,2500,"].join("\n"))
    expect(p.upserts.map((u) => u.month)).toEqual([2])
    expect(p.rowErrors).toEqual([])
  })

  it("reports a row whose hotel is not in the catalog as unmatched, writing nothing", () => {
    const p = plan(["city,tier,label,base_sar_per_night,feb_sar", "MAKKAH,STANDARD,Hotel Tak Terdaftar,1300,2500"].join("\n"))
    expect(p.upserts).toEqual([])
    expect(p.hotelsMatched).toBe(0)
    expect(p.unmatched).toEqual([{ rowNumber: 2, label: "Hotel Tak Terdaftar" }])
  })

  it("produces exactly one upsert per (hotel, month) — no duplicates within a plan", () => {
    const p = plan(["city,tier,label,base_sar_per_night,feb_sar,mar_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,1300,2500,2600,1400"].join("\n"))
    const keys = p.upserts.map((u) => `${u.hotelPriceId}:${u.month}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(["h-makkah:2", "h-makkah:3", "h-makkah:8"])
  })

  it("flags a matched row with no filled month cells as a row error (nothing to import)", () => {
    const p = plan(["city,tier,label,base_sar_per_night", "MAKKAH,STANDARD,Safwa Tower 3,1300"].join("\n"))
    expect(p.upserts).toEqual([])
    expect(p.rowErrors).toEqual([{ rowNumber: 2, errors: ["no real month prices provided"] }])
  })

  it("reports an invalid month cell as a row error while keeping the row's valid months", () => {
    const p = plan(["city,tier,label,feb_sar,mar_sar", "MAKKAH,STANDARD,Safwa Tower 3,abc,2600"].join("\n"))
    expect(p.upserts).toEqual([
      { hotelPriceId: "h-makkah", month: 3, roomType: "QUAD", sarPerNight: 2600, sourceLabel: "Katalog Test" },
    ])
    expect(p.rowErrors).toEqual([{ rowNumber: 2, errors: ['invalid feb_sar "abc"'] }])
  })

  it("parses month cells like the estimate importer: thousands separators in, non-plain formats out", () => {
    // "1,300" (grouped) → 1300 accepted; "1e3"/"0x10"/"1300.0" rejected as row errors, so a
    // catalog transcribed with the same conventions as the estimate CSV behaves identically.
    const p = plan(["city,tier,label,feb_sar,mar_sar,apr_sar", "MAKKAH,STANDARD,Safwa Tower 3,\"1,300\",1e3,1300.0"].join("\n"))
    expect(p.upserts).toEqual([
      { hotelPriceId: "h-makkah", month: 2, roomType: "QUAD", sarPerNight: 1300, sourceLabel: "Katalog Test" },
    ])
    expect(p.rowErrors).toEqual([{ rowNumber: 2, errors: ['invalid mar_sar "1e3"', 'invalid apr_sar "1300.0"'] }])
  })

  it("plans only real-price writes (never estimate rows) — every upsert carries a sourceLabel", () => {
    const p = plan(["city,tier,label,feb_sar", "MAKKAH,STANDARD,Safwa Tower 3,2500"].join("\n"), "Katalog X")
    expect(p.upserts.every((u) => u.sourceLabel === "Katalog X")).toBe(true)
  })

  it("reports a missing required header as a file error, importing nothing", () => {
    const p = plan(["tier,label,feb_sar", "STANDARD,Safwa Tower 3,2500"].join("\n"))
    expect(p.fileErrors).toEqual(["Missing required header: city"])
    expect(p.upserts).toEqual([])
  })

  describe("room_type column", () => {
    it("tags every month of a row with its declared room type", () => {
      const p = plan(["city,tier,label,room_type,feb_sar,aug_sar", "MAKKAH,STANDARD,Safwa Tower 3,DOUBLE,1800,1000"].join("\n"))
      expect(p.rowErrors).toEqual([])
      expect(p.upserts).toEqual([
        { hotelPriceId: "h-makkah", month: 2, roomType: "DOUBLE", sarPerNight: 1800, sourceLabel: "Katalog Test" },
        { hotelPriceId: "h-makkah", month: 8, roomType: "DOUBLE", sarPerNight: 1000, sourceLabel: "Katalog Test" },
      ])
    })

    it("treats an empty room_type cell as QUAD", () => {
      const p = plan(["city,tier,label,room_type,feb_sar", "MAKKAH,STANDARD,Safwa Tower 3,,2500"].join("\n"))
      expect(p.rowErrors).toEqual([])
      expect(p.upserts).toEqual([
        { hotelPriceId: "h-makkah", month: 2, roomType: "QUAD", sarPerNight: 2500, sourceLabel: "Katalog Test" },
      ])
    })

    it("parses a CSV with no room_type column at all exactly as before — every month lands as QUAD", () => {
      // Regression guard: previously-transcribed catalogs and the shipped template carry no
      // room_type column, and must keep importing without edits.
      const p = plan(["city,tier,label,feb_sar,mar_sar", "MAKKAH,STANDARD,Safwa Tower 3,2500,2600"].join("\n"))
      expect(p.fileErrors).toEqual([])
      expect(p.rowErrors).toEqual([])
      expect(p.upserts.every((u) => u.roomType === "QUAD")).toBe(true)
      expect(p.upserts.map((u) => u.month)).toEqual([2, 3])
    })

    it("lets one hotel carry a rate per room type for the same month without colliding", () => {
      const p = plan(
        [
          "city,tier,label,room_type,feb_sar",
          "MAKKAH,STANDARD,Safwa Tower 3,QUAD,2500",
          "MAKKAH,STANDARD,Safwa Tower 3,TRIPLE,2200",
          "MAKKAH,STANDARD,Safwa Tower 3,DOUBLE,1900",
        ].join("\n"),
      )
      expect(p.rowErrors).toEqual([])
      expect(p.hotelsMatched).toBe(1)
      expect(p.upserts.map((u) => `${u.roomType}:${u.sarPerNight}`)).toEqual(["QUAD:2500", "TRIPLE:2200", "DOUBLE:1900"])
    })

    it("rejects an unrecognised room type as a row error rather than silently importing it as QUAD", () => {
      // A catalog abbreviation typo'd straight into the CSV ("DBL") must surface, not quietly
      // overwrite the hotel's quad rate.
      const p = plan(["city,tier,label,room_type,feb_sar", "MAKKAH,STANDARD,Safwa Tower 3,DBL,1900"].join("\n"))
      expect(p.upserts).toEqual([])
      expect(p.rowErrors).toEqual([{ rowNumber: 2, errors: ['invalid room_type "DBL"'] }])
    })

    it("accepts a lowercase room type", () => {
      const p = plan(["city,tier,label,room_type,feb_sar", "MAKKAH,STANDARD,Safwa Tower 3,triple,2200"].join("\n"))
      expect(p.rowErrors).toEqual([])
      expect(p.upserts).toEqual([
        { hotelPriceId: "h-makkah", month: 2, roomType: "TRIPLE", sarPerNight: 2200, sourceLabel: "Katalog Test" },
      ])
    })

    it("collapses two rows for the same hotel, month and room type to a single upsert, last value winning", () => {
      const p = plan(
        [
          "city,tier,label,room_type,feb_sar",
          "MAKKAH,STANDARD,Safwa Tower 3,DOUBLE,1900",
          "MAKKAH,STANDARD,Safwa Tower 3,DOUBLE,1950",
        ].join("\n"),
      )
      expect(p.upserts).toEqual([
        { hotelPriceId: "h-makkah", month: 2, roomType: "DOUBLE", sarPerNight: 1950, sourceLabel: "Katalog Test" },
      ])
    })
  })
})

describe("applyRealHotelPricing", () => {
  // The conflict target is the single most destructive thing to get wrong here. If it stays at
  // (hotel, month) after room_type ships, the DOUBLE row for a hotel-month overwrites that
  // hotel's QUAD rate instead of sitting beside it -- every quad quote at that hotel silently
  // drops ~25% while still carrying the "harga real" badge. Nothing else in the suite reaches
  // this function, so without these tests that failure ships green.
  function makeTx() {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate })
    const insert = vi.fn().mockReturnValue({ values })
    return { tx: { insert } as never, spies: { insert, values, onConflictDoUpdate } }
  }

  const plan = (upserts: Array<Record<string, unknown>>) =>
    ({ rowsParsed: 0, upserts, hotelsMatched: 0, unmatched: [], rowErrors: [], fileErrors: [] }) as never

  it("keys the upsert on (hotel, month, room type) so a DOUBLE rate cannot overwrite the QUAD row", async () => {
    const { tx, spies } = makeTx()
    await applyRealHotelPricing(tx, plan([
      { hotelPriceId: "h1", month: 7, roomType: "DOUBLE", sarPerNight: 550, sourceLabel: "Katalog" },
    ]))

    const target = spies.onConflictDoUpdate.mock.calls[0][0].target
    expect(target).toContain(realHotelPrices.roomType)
    expect(target).toContain(realHotelPrices.hotelPriceId)
    expect(target).toContain(realHotelPrices.month)
  })

  it("writes the room type onto the row rather than dropping it", async () => {
    const { tx, spies } = makeTx()
    await applyRealHotelPricing(tx, plan([
      { hotelPriceId: "h1", month: 7, roomType: "TRIPLE", sarPerNight: 625, sourceLabel: "Katalog" },
    ]))

    expect(spies.values.mock.calls[0][0]).toMatchObject({
      hotelPriceId: "h1",
      month: 7,
      roomType: "TRIPLE",
      sarPerNight: 625,
      sourceLabel: "Katalog",
    })
  })

  it("issues one write per room type for the same hotel and month", async () => {
    const { tx, spies } = makeTx()
    const imported = await applyRealHotelPricing(tx, plan([
      { hotelPriceId: "h1", month: 7, roomType: "QUAD", sarPerNight: 700, sourceLabel: "Katalog" },
      { hotelPriceId: "h1", month: 7, roomType: "TRIPLE", sarPerNight: 625, sourceLabel: "Katalog" },
      { hotelPriceId: "h1", month: 7, roomType: "DOUBLE", sarPerNight: 550, sourceLabel: "Katalog" },
    ]))

    expect(imported).toBe(3)
    expect(spies.values).toHaveBeenCalledTimes(3)
    expect(spies.values.mock.calls.map((c) => [c[0].roomType, c[0].sarPerNight])).toEqual([
      ["QUAD", 700],
      ["TRIPLE", 625],
      ["DOUBLE", 550],
    ])
  })

  it("updates only the rate, source and timestamp on conflict — never the key columns", async () => {
    // A conflicting import must refresh the price in place. If room_type or month leaked into the
    // update set, an overlapping catalog could rewrite which row it landed on.
    const { tx, spies } = makeTx()
    await applyRealHotelPricing(tx, plan([
      { hotelPriceId: "h1", month: 7, roomType: "DOUBLE", sarPerNight: 550, sourceLabel: "Katalog" },
    ]))

    expect(Object.keys(spies.onConflictDoUpdate.mock.calls[0][0].set).sort()).toEqual([
      "sarPerNight",
      "sourceLabel",
      "updatedAt",
    ])
  })

  it("writes nothing when the plan is empty", async () => {
    const { tx, spies } = makeTx()
    expect(await applyRealHotelPricing(tx, plan([]))).toBe(0)
    expect(spies.insert).not.toHaveBeenCalled()
  })
})
