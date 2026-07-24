import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PricingConfig } from "@/types"

// Shared mock for messages.create — must be defined before vi.mock hoisting
const mockCreate = vi.fn()

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// Import after mock is registered
const { parseEstimate, ParseError } = await import("@/lib/ai/parse")

const mockPricing: PricingConfig = {
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
  hotelOptions: {
    MADINAH: [
      { id: "kayan-hotel", city: "MADINAH", tier: "STANDARD", sarPerNight: 700, label: "Kayan Hotel", sublabel: "standard Madinah", distance: "900m", monthlyPrices: {} },
      { id: "taiba-front", city: "MADINAH", tier: "STANDARD", sarPerNight: 900, label: "Taiba Front", sublabel: "standard Madinah", distance: "ring 1 dekat Nabawi", monthlyPrices: {} },
      { id: "dallah-taiba", city: "MADINAH", tier: "PREMIUM", sarPerNight: 1600, label: "Dallah Taiba", sublabel: "premium Madinah", monthlyPrices: {} },
    ],
    MAKKAH: [
      { id: "olayan-ajyad", city: "MAKKAH", tier: "STANDARD", sarPerNight: 950, label: "Olayan Ajyad", sublabel: "standard Ajyad", distance: "1.2 km shuttle", monthlyPrices: {} },
      { id: "safwa-close", city: "MAKKAH", tier: "STANDARD", sarPerNight: 1350, label: "Safwa Close", sublabel: "standard Makkah", distance: "250m jalan kaki", monthlyPrices: {} },
      { id: "voco-makkah", city: "MAKKAH", tier: "PREMIUM", sarPerNight: 600, label: "Voco", sublabel: "upper Makkah shuttle", monthlyPrices: {} },
    ],
  },
  airlines: {
    BUDGET: { idr: 12500000, label: "Lion Air" },
    STANDARD: { idr: 14500000, label: "Batik Air" },
    GARUDA: { idr: 17000000, label: "Garuda" },
    BUSINESS: { idr: 25000000, label: "Business" },
  },
  services: {
    VISA: { currency: "USD", amount: 165, label: "Visa Umroh Reguler", enabled: true, divideByPax: false },
    SISKOPATUH: { currency: "IDR", amount: 200000, label: "Siskopatuh", enabled: true, divideByPax: false },
    TASREH: { currency: "SAR", amount: 25, label: "Tasreh Raudhah", enabled: true, divideByPax: false },
    TRANSPORT: { currency: "SAR", amount: 325, label: "Transportasi", enabled: true, divideByPax: true },
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
  },
  roomMultipliers: {
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.25 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.5 },
    SINGLE: { paxPerRoom: 1, multiplier: 2.8 },
  },
}

function claudeResponse(json: object) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] }
}

const defaultParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  madinahHotelId: null,
  makkahHotelId: null,
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT"],
  fullboard: true,
  notes: "",
}

describe("parseEstimate", () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it("happy path: standard quad 9+4 nights → correct params", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse(defaultParams))
    const result = await parseEstimate("umroh 9 malam makkah 4 malam madinah standard quad", mockPricing)
    expect(result.params.nightsMakkah).toBe(9)
    expect(result.params.nightsMadinah).toBe(4)
    expect(result.params.hotelTier).toBe("STANDARD")
    expect(result.params.roomType).toBe("QUAD")
  })

  it("happy path: Garuda → airline GARUDA", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, airline: "GARUDA" }))
    const result = await parseEstimate("Garuda direct", mockPricing)
    expect(result.params.airline).toBe("GARUDA")
  })

  it("happy path: pelataran haram 2 orang → PELATARAN + pax 2", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({ ...defaultParams, hotelTier: "PELATARAN", pax: 2 })
    )
    const result = await parseEstimate("pelataran haram 2 orang", mockPricing)
    expect(result.params.hotelTier).toBe("PELATARAN")
    expect(result.params.pax).toBe(2)
  })

  it("happy path: lion air → airline BUDGET", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, airline: "BUDGET" }))
    const result = await parseEstimate("lion air budget", mockPricing)
    expect(result.params.airline).toBe("BUDGET")
  })

  it("happy path: tanpa penerbangan → airline NONE", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, airline: "NONE" }))
    const result = await parseEstimate("tanpa penerbangan, tiket sendiri", mockPricing)
    expect(result.params.airline).toBe("NONE")
  })

  it("corrects airline NONE when input did not explicitly exclude flights", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, airline: "NONE" }))
    const result = await parseEstimate("2 pax dewasa hotel pelataran untuk 12 hari", mockPricing)
    expect(result.params.airline).toBe("STANDARD")
    expect(result.notes).toContain("input tidak menyebut tanpa tiket")
  })

  it("corrects total hari into explicit Madinah and Makkah nights", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, nightsMadinah: 4, nightsMakkah: 9 }))
    const result = await parseEstimate("3 dewasa 1 anak umur 7 tahun 20 hari bulan desember", mockPricing)
    expect(result.params.nightsMadinah).toBe(4)
    expect(result.params.nightsMakkah).toBe(16)
    expect(result.notes).toContain("Durasi 20 hari")
  })

  it("happy path: tour makkah madinah → services include TOUR_MAKKAH and TOUR_MADINAH", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({
        ...defaultParams,
        services: ["VISA", "SISKOPATUH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"],
      })
    )
    const result = await parseEstimate("tour makkah madinah", mockPricing)
    expect(result.params.services).toContain("TOUR_MAKKAH")
    expect(result.params.services).toContain("TOUR_MADINAH")
  })

  it("happy path: mentioned month is preserved as travelMonth", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, travelMonth: 11 }))
    const result = await parseEstimate("umroh bulan november 2 pax", mockPricing)
    expect(result.params.travelMonth).toBe(11)
  })

  it("ignores invalid travelMonth values from Claude", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, travelMonth: 13 }))
    const result = await parseEstimate("umroh bulan tidak jelas", mockPricing)
    expect(result.params.travelMonth).toBeUndefined()
  })

  it("asks Claude to emit travelMonth when a month is mentioned", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse(defaultParams))
    await parseEstimate("umroh bulan november 2 pax", mockPricing)

    const system = mockCreate.mock.calls[0][0].system as Array<{ text: string }>
    expect(system[0].text).toContain('"travelMonth": integer | null')
    expect(system[0].text).toContain('"november"/"nov"')
  })

  it("preserves valid city hotel IDs returned by Claude", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({
        ...defaultParams,
        madinahHotelId: "kayan-hotel",
        makkahHotelId: "olayan-ajyad",
        travelMonth: 11,
      })
    )
    const result = await parseEstimate("olayan ajyad makkah kayan hotel madinah bulan november", mockPricing)
    expect(result.params.madinahHotelId).toBe("kayan-hotel")
    expect(result.params.makkahHotelId).toBe("olayan-ajyad")
    expect(result.params.travelMonth).toBe(11)
  })

  it("matches hotel labels when Claude returns names instead of IDs", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({
        ...defaultParams,
        madinahHotel: "Kayan",
        makkahHotel: "Olayan Ajyad",
      })
    )
    const result = await parseEstimate("makkah olayan ajyad madinah kayan", mockPricing)
    expect(result.params.madinahHotelId).toBe("kayan-hotel")
    expect(result.params.makkahHotelId).toBe("olayan-ajyad")
  })

  it("falls back to same-tier city hotel when requested hotel is absent", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({
        ...defaultParams,
        madinahHotel: "Hotel Tidak Ada",
        makkahHotel: "Hotel Juga Tidak Ada",
      })
    )
    const result = await parseEstimate("hotel tidak ada", mockPricing)
    expect(result.params.madinahHotelId).toBe("kayan-hotel")
    expect(result.params.makkahHotelId).toBe("olayan-ajyad")
    expect(result.notes).toContain("memakai opsi setara STANDARD")
  })

  it("uses distance ranking for missing requested hotels when input asks for walking distance", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({
        ...defaultParams,
        madinahHotel: "Hotel Dekat Nabawi Tidak Ada",
        makkahHotel: "Hotel Dekat Haram Tidak Ada",
      })
    )
    const result = await parseEstimate("hotel jalan kaki dekat haram dan dekat nabawi", mockPricing)
    expect(result.params.madinahHotelId).toBe("taiba-front")
    expect(result.params.makkahHotelId).toBe("safwa-close")
    expect(result.notes).toContain("Taiba Front (ring 1 dekat Nabawi)")
    expect(result.notes).toContain("Safwa Close (250m jalan kaki)")
  })

  it("selects close options when proximity is requested without hotel names", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse(defaultParams))
    const result = await parseEstimate("umroh 2 pax hotel ring 1 jalan kaki", mockPricing)
    expect(result.params.madinahHotelId).toBe("taiba-front")
    expect(result.params.makkahHotelId).toBe("safwa-close")
  })

  it("includes hotel options and IDs in the system prompt", async () => {
    mockCreate.mockResolvedValueOnce(claudeResponse(defaultParams))
    await parseEstimate("umroh hotel olayan ajyad", mockPricing)

    const system = mockCreate.mock.calls[0][0].system as Array<{ text: string }>
    expect(system[0].text).toContain('"madinahHotelId": string | null')
    expect(system[0].text).toContain('"makkahHotelId": string | null')
    expect(system[0].text).toContain("Hotel distance is relative")
    expect(system[1].text).toContain("id=olayan-ajyad")
    expect(system[1].text).toContain("id=kayan-hotel")
    expect(system[1].text).toContain("distance=250m jalan kaki")
  })

  it("happy path: vague input → pax defaults to 1, notes non-empty", async () => {
    mockCreate.mockResolvedValueOnce(
      claudeResponse({
        ...defaultParams,
        notes: "Jumlah peserta tidak disebutkan, diasumsikan 1 orang.",
      })
    )
    const result = await parseEstimate("umroh paket standar", mockPricing)
    expect(result.params.pax).toBe(1)
    expect(result.notes.length).toBeGreaterThan(0)
  })

  it("error path: Claude returns non-JSON → throws ParseError", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Sorry, I cannot process this request." }],
    })
    await expect(parseEstimate("some input", mockPricing)).rejects.toThrow(ParseError)
  })

  it("error path: Claude returns JSON with missing required fields → throws ParseError", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ nightsMadinah: 4 }) }],
    })
    await expect(parseEstimate("some input", mockPricing)).rejects.toThrow(ParseError)
  })

  it("error path: Anthropic API throws → error includes 'Anthropic API error'", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"))
    await expect(parseEstimate("some input", mockPricing)).rejects.toThrow("Anthropic API error")
  })

  // --- U5: prefer real-priced hotels among comparable options ---

  // Clone mockPricing and attach realMonthlyPrices to specific hotel options by id.
  function withRealPrices(real: Record<string, Record<number, number>>): PricingConfig {
    const clone = structuredClone(mockPricing)
    for (const city of ["MADINAH", "MAKKAH"] as const) {
      for (const h of clone.hotelOptions?.[city] ?? []) {
        if (real[h.id]) h.realMonthlyPrices = real[h.id]
      }
    }
    return clone
  }

  it("prefers a real-priced same-tier option over the default pick when the month has a real price", async () => {
    // Default same-tier fallback for a missing Madinah hotel is kayan-hotel; taiba-front carries a
    // real price for month 11, so it should win when travelMonth=11.
    const pricing = withRealPrices({ "taiba-front": { 11: 850 } })
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, madinahHotel: "Hotel Tidak Ada", travelMonth: 11 }))
    const result = await parseEstimate("hotel tidak ada bulan november", pricing)
    expect(result.params.madinahHotelId).toBe("taiba-front")
  })

  it("keeps the default same-tier pick when the requested month has no real price", async () => {
    // taiba-front only has a real price for month 11; a request for month 6 falls back to kayan-hotel.
    const pricing = withRealPrices({ "taiba-front": { 11: 850 } })
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, madinahHotel: "Hotel Tidak Ada", travelMonth: 6 }))
    const result = await parseEstimate("hotel tidak ada bulan juni", pricing)
    expect(result.params.madinahHotelId).toBe("kayan-hotel")
  })

  it("does not prefer real when no travelMonth is set (real prices are month-gated)", async () => {
    const pricing = withRealPrices({ "taiba-front": { 11: 850 } })
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, madinahHotel: "Hotel Tidak Ada" }))
    const result = await parseEstimate("hotel tidak ada", pricing)
    expect(result.params.madinahHotelId).toBe("kayan-hotel")
  })

  it("prefers the closest real-priced option under proximity intent, keeping distance ranking", async () => {
    // Proximity intent ranks by distance; safwa-close (250m) is the closest and is real-priced, so it
    // stays the pick — real preference doesn't drag in a farther estimate-only option.
    const pricing = withRealPrices({ "safwa-close": { 3: 1400 } })
    mockCreate.mockResolvedValueOnce(claudeResponse({ ...defaultParams, makkahHotel: "Hotel Dekat Haram Tidak Ada", travelMonth: 3 }))
    const result = await parseEstimate("hotel jalan kaki dekat haram bulan maret", pricing)
    expect(result.params.makkahHotelId).toBe("safwa-close")
  })

  it("marks catalog-priced options with real=catalog in the system prompt", async () => {
    const pricing = withRealPrices({ "safwa-close": { 3: 1400 } })
    mockCreate.mockResolvedValueOnce(claudeResponse(defaultParams))
    await parseEstimate("umroh makkah", pricing)

    const system = mockCreate.mock.calls[0][0].system as Array<{ text: string }>
    expect(system[1].text).toContain("id=safwa-close")
    expect(system[1].text).toMatch(/id=safwa-close[^\n]*real=catalog/)
    // Estimate-only options are not marked.
    expect(system[1].text).not.toMatch(/id=olayan-ajyad[^\n]*real=catalog/)
  })
})
