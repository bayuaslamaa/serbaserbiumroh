import { describe, it, expect } from "vitest"
import { hargaHotel, resolveToolRate } from "@/lib/ai/tools/hotel-price"
import { resolveHotelSar } from "@/lib/estimate/hotel-pricing"
import { ROOM_TYPES } from "@/lib/estimate/room-types"
import { makeHotel, makePricing, realPrices } from "./fixtures"

// Month 3 quotes every room type; month 4 quotes QUAD only; month 5 has no catalogue coverage.
const kayan = makeHotel({
  id: "kayan-hotel",
  label: "Kayan Hotel",
  sublabel: "standard Madinah",
  distance: "900m",
  sarPerNight: 700,
  monthlyPrices: { 5: 780 },
  realMonthlyPrices: realPrices({
    3: {
      QUAD: [820, "Katalog Emaar 1448H"],
      TRIPLE: [900, "Katalog Emaar 1448H"],
      DOUBLE: [1100, "Katalog Emaar 1448H"],
    },
    4: { QUAD: [640, "Katalog Emaar 1448H"] },
  }),
})

const pricing = makePricing({ MADINAH: [kayan] })

describe("harga_hotel", () => {
  it("returns the exact (month, roomType) catalogue rate tagged real with its source_label", () => {
    const result = hargaHotel(pricing, { hotel: "kayan-hotel", months: [3], room_types: ["TRIPLE"] })

    expect(result.found).toBe(true)
    expect(result.hotel?.id).toBe("kayan-hotel")
    expect(result.rates).toEqual([
      {
        month: 3,
        room_type: "TRIPLE",
        priced_room_type: "TRIPLE",
        sar_per_night: 900,
        basis: "catalogue_exact",
        source: "real",
        room_type_priced: true,
        source_label: "Katalog Emaar 1448H",
      },
    ])
  })

  // The KTD4 guard. Month 4 quotes QUAD only; asking for TRIPLE must not come back looking like a
  // TRIPLE rate, or calculate.ts would set the room multiplier to 1 and under-price the room.
  it("flags a QUAD stand-in rather than returning it as the asked room type's rate", () => {
    const [rate] = hargaHotel(pricing, { hotel: "kayan-hotel", months: [4], room_types: ["TRIPLE"] }).rates

    expect(rate.basis).toBe("catalogue_quad_fallback")
    expect(rate.room_type).toBe("TRIPLE")
    expect(rate.priced_room_type).toBe("QUAD")
    expect(rate.sar_per_night).toBe(640)
    expect(rate.source).toBe("real")
    // False is what tells calculate.ts the quad-relative ratio still applies.
    expect(rate.room_type_priced).toBe(false)
    expect(rate.source_label).toBe("Katalog Emaar 1448H")
  })

  it("does not mistake an asked-for QUAD with a QUAD rate for a fallback", () => {
    const [rate] = hargaHotel(pricing, { hotel: "kayan-hotel", months: [4], room_types: ["QUAD"] }).rates

    expect(rate.basis).toBe("catalogue_exact")
    expect(rate.room_type_priced).toBe(true)
  })

  it("marks a month with no catalogue rate as not catalogue-backed", () => {
    const [rate] = hargaHotel(pricing, { hotel: "kayan-hotel", months: [5], room_types: ["TRIPLE"] }).rates

    expect(rate.basis).toBe("estimate")
    expect(rate.source).toBe("estimate")
    expect(rate.sar_per_night).toBe(780) // the monthly estimate override, not a catalogue figure
    expect(rate.room_type_priced).toBe(false)
    // An estimate has no catalogue behind it, so there is nothing to cite.
    expect(rate.source_label).toBe("")
  })

  it("falls back to the base estimate when the month has neither a catalogue nor a monthly rate", () => {
    const [rate] = hargaHotel(pricing, { hotel: "kayan-hotel", months: [9], room_types: ["QUAD"] }).rates

    expect(rate.basis).toBe("estimate")
    expect(rate.sar_per_night).toBe(700)
  })

  // The anti-divergence guard: the tool must quote exactly what the cost calculation will charge.
  // Asserted against the real resolveHotelSar across the whole month × room-type grid, not against
  // copied expectations, so a change to either ladder breaks this test.
  it("never disagrees with resolveHotelSar for any (month, roomType)", () => {
    const months = [1, 3, 4, 5, 9, 12]
    const result = hargaHotel(pricing, { hotel: "kayan-hotel", months, room_types: [...ROOM_TYPES] })

    expect(result.rates).toHaveLength(months.length * ROOM_TYPES.length)
    for (const rate of result.rates) {
      const expected = resolveHotelSar(kayan, rate.room_type, rate.month)
      expect(rate.sar_per_night).toBe(expected.sarPerNight)
      expect(rate.source).toBe(expected.source)
      expect(rate.room_type_priced).toBe(expected.roomTypePriced)
      expect(rate.source_label).toBe(expected.sourceLabel)
    }
  })

  it("resolveToolRate labels each of resolveHotelSar's three outcomes distinguishably", () => {
    expect(resolveToolRate(kayan, "TRIPLE", 3).basis).toBe("catalogue_exact")
    expect(resolveToolRate(kayan, "TRIPLE", 4).basis).toBe("catalogue_quad_fallback")
    expect(resolveToolRate(kayan, "TRIPLE", 5).basis).toBe("estimate")
  })

  it("resolves one hotel across several months and room types in one call", () => {
    const result = hargaHotel(pricing, { hotel: "Kayan", months: [3, 4], room_types: ["DOUBLE", "QUAD"] })

    expect(result.rates.map((rate) => [rate.month, rate.room_type, rate.basis])).toEqual([
      [3, "DOUBLE", "catalogue_exact"],
      [3, "QUAD", "catalogue_exact"],
      [4, "DOUBLE", "catalogue_quad_fallback"],
      [4, "QUAD", "catalogue_exact"],
    ])
  })

  it("defaults to QUAD when no room type is asked for", () => {
    const result = hargaHotel(pricing, { hotel: "kayan-hotel", months: [3] })

    expect(result.rates).toHaveLength(1)
    expect(result.rates[0].room_type).toBe("QUAD")
    expect(result.rates[0].sar_per_night).toBe(820)
  })

  it("drops out-of-range and duplicate months instead of pricing them as uncovered", () => {
    const result = hargaHotel(pricing, { hotel: "kayan-hotel", months: [3, 3, 0, 13, 3.5] })

    expect(result.rates.map((rate) => rate.month)).toEqual([3])
  })

  it("reports a hotel that is not in the catalogue rather than inventing a rate", () => {
    const result = hargaHotel(pricing, { hotel: "Hotel Yang Tidak Ada", months: [3] })

    expect(result.found).toBe(false)
    expect(result.rates).toEqual([])
    expect(result.not_found_reason).toBeTruthy()
  })

  // D3: synthetic tier options have no realMonthlyPrices by construction, so they are not
  // addressable through a tool whose purpose is quoting catalogue rates.
  it("cannot price a synthetic tier option", () => {
    const empty = makePricing({})

    expect(hargaHotel(empty, { hotel: "MADINAH:STANDARD", months: [3] }).found).toBe(false)
    expect(hargaHotel(empty, { hotel: "STANDARD MADINAH", months: [3] }).found).toBe(false)
  })

  it("narrows by city when the same label exists in both", () => {
    const both = makePricing({
      MADINAH: [makeHotel({ id: "md-taiba", city: "MADINAH", label: "Taiba" })],
      MAKKAH: [makeHotel({ id: "mk-taiba", city: "MAKKAH", label: "Taiba" })],
    })

    expect(hargaHotel(both, { hotel: "Taiba", months: [3], city: "MAKKAH" }).hotel?.id).toBe("mk-taiba")
    expect(hargaHotel(both, { hotel: "Taiba", months: [3], city: "MADINAH" }).hotel?.id).toBe("md-taiba")
  })
})
