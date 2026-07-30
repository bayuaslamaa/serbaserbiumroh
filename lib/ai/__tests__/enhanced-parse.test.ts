import { describe, it, expect, vi, beforeEach } from "vitest"
import type { EstimateParams, PricingConfig } from "@/types"

// The optional real-price-grounded parse path. What these tests are for:
//
//   1. Flag off means *nothing* changes — the tool runner is never touched.
//   2. Flag on sends the D1 model config. Two of its three settings fail silently if inherited from
//      the normal path: `thinking: disabled` makes Sonnet 5 reluctant to call tools (expensive path,
//      cheap path's answer), and max_tokens 1024 truncates the JSON mid-answer once adaptive
//      thinking shares that budget (reads as a prompt bug, not a token limit).
//   3. Whatever the tools produce still goes through the one shared correction pipeline (KTD1).
//   4. `total_matches: 0` is an answer, not a failure (D3).

const mockCreate = vi.fn()
const mockToolRunner = vi.fn()

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
    beta: { messages: { toolRunner: mockToolRunner } },
  })),
}))

const {
  parseEstimate,
  ParseError,
  ENHANCED_PARSE_MAX_ITERATIONS,
  buildEnhancedTools,
  buildProvenanceNotes,
} = await import("@/lib/ai/parse")
const { buildEnhancedSystemPrompt } = await import("@/lib/ai/enhanced-prompt")

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
      STANDARD: { sarPerNight: 1300, label: "Standard Makkah", sublabel: "3★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 3500, label: "Pelataran Haram", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 6000, label: "Premium Makkah", sublabel: "5★", monthlyPrices: {} },
    },
  },
  hotelOptions: {
    MADINAH: [
      {
        id: "kayan-hotel",
        city: "MADINAH",
        tier: "STANDARD",
        sarPerNight: 700,
        label: "Kayan Hotel",
        sublabel: "standard Madinah",
        distance: "900m",
        monthlyPrices: {},
        realMonthlyPrices: {
          3: { QUAD: { sarPerNight: 620, sourceLabel: "Katalog 1448H" } },
        },
      },
      {
        id: "taiba-front",
        city: "MADINAH",
        tier: "STANDARD",
        sarPerNight: 900,
        label: "Taiba Front",
        sublabel: "standard Madinah",
        distance: "ring 1 dekat Nabawi",
        monthlyPrices: {},
      },
    ],
    MAKKAH: [
      {
        id: "olayan-ajyad",
        city: "MAKKAH",
        tier: "STANDARD",
        sarPerNight: 950,
        label: "Olayan Ajyad",
        sublabel: "standard Ajyad",
        distance: "1.2 km shuttle",
        monthlyPrices: {},
        realMonthlyPrices: {
          3: {
            QUAD: { sarPerNight: 880, sourceLabel: "Katalog Emaar 2027" },
            DOUBLE: { sarPerNight: 1400, sourceLabel: "Katalog Emaar 2027" },
          },
        },
      },
      {
        id: "safwa-close",
        city: "MAKKAH",
        tier: "STANDARD",
        sarPerNight: 1350,
        label: "Safwa Close",
        sublabel: "standard Makkah",
        distance: "250m jalan kaki",
        monthlyPrices: {},
      },
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
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
    TRANSPORT_JED_MAKKAH: { currency: "SAR", amount: 400, label: "Transportasi Jeddah → Makkah", enabled: true, divideByPax: true },
    TRANSPORT_JED_MADINAH: { currency: "SAR", amount: 650, label: "Transportasi Jeddah → Madinah", enabled: true, divideByPax: true },
    TRANSPORT_MAKKAH_MADINAH: { currency: "SAR", amount: 550, label: "Transportasi Makkah ↔ Madinah", enabled: true, divideByPax: true },
    TRANSPORT_MAKKAH_JED: { currency: "SAR", amount: 300, label: "Transportasi Makkah → Jeddah", enabled: true, divideByPax: true },
    TRANSPORT_MADINAH_JED: { currency: "SAR", amount: 550, label: "Transportasi Madinah → Jeddah", enabled: true, divideByPax: true },
    MUTHOWIF: { currency: "SAR", amount: 0, label: "Muthowif", enabled: false, divideByPax: true },
  },
  roomMultipliers: {
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.0 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.0 },
    QUINT: { paxPerRoom: 5, multiplier: 1.0 },
  },
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
  services: ["VISA", "SISKOPATUH", "TRANSPORT_JED_MAKKAH"],
  fullboard: true,
  notes: "",
}

type FakeBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }

type FakeMessage = { stop_reason: string; stop_details?: unknown; content: FakeBlock[] }

function textMessage(json: object): FakeMessage {
  return {
    stop_reason: "end_turn",
    // A thinking block first, because adaptive thinking is on for this path — the JSON must still be
    // found by scanning for the text block rather than reading content[0].
    content: [
      { type: "thinking", thinking: "membandingkan tarif katalog" },
      { type: "text", text: JSON.stringify(json) },
    ],
  }
}

function toolCallMessage(name: string, input: unknown, id = "toolu_1"): FakeMessage {
  return { stop_reason: "tool_use", content: [{ type: "tool_use", id, name, input }] }
}

/**
 * A stand-in for the SDK's BetaToolRunner: it walks a scripted list of assistant messages, runs the
 * real tool closures parseEstimate handed it, and honours the `max_iterations` parseEstimate passed.
 *
 * What this genuinely proves: the tools are wired to the model's arguments and return the payloads
 * the model would read, the final message is picked up correctly, and a bound-exhausted run is
 * reported as such. What it cannot prove is the SDK's own loop arithmetic — that belongs to the SDK,
 * which is why the bound is also asserted at the boundary (`max_iterations` in the request).
 */
function installRunner(script: FakeMessage[]) {
  const executions: { name: string; input: unknown; result: unknown }[] = []

  mockToolRunner.mockImplementation((params: Record<string, unknown>) => {
    const tools = params.tools as { name: string; parse: (c: unknown) => unknown; run: (i: unknown) => string }[]
    const byName = new Map(tools.map((tool) => [tool.name, tool]))
    const maxIterations = params.max_iterations as number | undefined

    return {
      async runUntilDone() {
        let last: FakeMessage | undefined
        let iterations = 0

        for (const message of script) {
          if (maxIterations != null && iterations >= maxIterations) break
          iterations++
          last = message

          const toolUses = message.content.filter((block): block is Extract<FakeBlock, { type: "tool_use" }> =>
            block.type === "tool_use"
          )
          if (toolUses.length === 0) break

          for (const use of toolUses) {
            const tool = byName.get(use.name)
            if (!tool) throw new Error(`model called an undeclared tool: ${use.name}`)
            executions.push({ name: use.name, input: use.input, result: JSON.parse(tool.run(tool.parse(use.input))) })
          }
        }

        if (!last) throw new Error("runner concluded without a message")
        return last
      },
    }
  })

  return { executions }
}

function claudeResponse(json: object) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] }
}

describe("parseEstimate — enhanced path", () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockToolRunner.mockReset()
  })

  describe("the flag gates the branch", () => {
    it("takes the normal single-shot path when the flag is off, with the same output", async () => {
      mockCreate.mockResolvedValue(claudeResponse({ ...defaultParams, pax: 3 }))

      const implicit = await parseEstimate("umroh 3 orang", mockPricing)
      const explicitOff = await parseEstimate("umroh 3 orang", mockPricing, { enhanced: false })

      expect(mockToolRunner).not.toHaveBeenCalled()
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(implicit.params).toEqual(explicitOff.params)
      expect(implicit.params.pax).toBe(3)
    })

    it("uses the tool runner and not messages.create when the flag is on", async () => {
      installRunner([textMessage(defaultParams)])

      const result = await parseEstimate("umroh maret", mockPricing, { enhanced: true })

      expect(mockToolRunner).toHaveBeenCalledTimes(1)
      expect(mockCreate).not.toHaveBeenCalled()
      expect(result.params.nightsMakkah).toBe(9)
    })
  })

  describe("model config (D1)", () => {
    it("sends adaptive thinking and a token cap far above the normal path's 1024", async () => {
      installRunner([textMessage(defaultParams)])
      await parseEstimate("umroh maret", mockPricing, { enhanced: true })

      const body = mockToolRunner.mock.calls[0][0]
      expect(body).toMatchObject({
        model: "claude-sonnet-5",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
      })
      // Asserted as an inequality as well as a value: the failure this guards against is inheriting
      // the normal path's 1024, which truncates the JSON instead of erroring.
      expect(body.max_tokens).toBe(8000)
      expect(body.max_tokens).toBeGreaterThan(1024)
      expect(body.thinking.type).not.toBe("disabled")
    })

    it("bounds the tool loop and declares both price tools", async () => {
      installRunner([textMessage(defaultParams)])
      await parseEstimate("umroh maret", mockPricing, { enhanced: true })

      const body = mockToolRunner.mock.calls[0][0]
      expect(body.max_iterations).toBe(ENHANCED_PARSE_MAX_ITERATIONS)
      expect(Number.isFinite(body.max_iterations)).toBe(true)
      expect(body.tools.map((tool: { name: string }) => tool.name).sort()).toEqual(["cari_hotel", "harga_hotel"])
    })
  })

  describe("tool wiring", () => {
    it("answers cari_hotel from the real catalogue rate for the requested month", async () => {
      const { executions } = installRunner([
        toolCallMessage("cari_hotel", { city: "MAKKAH", month: 3, room_type: "QUAD", tier: "STANDARD" }),
        textMessage({ ...defaultParams, travelMonth: 3, makkahHotelId: "olayan-ajyad" }),
      ])

      const result = await parseEstimate("umroh maret standard makkah", mockPricing, { enhanced: true })

      expect(executions).toHaveLength(1)
      const payload = executions[0].result as {
        total_matches: number
        rows: { id: string; sar_per_night: number; basis: string; source_label: string }[]
      }
      expect(payload.total_matches).toBe(2)
      // Cheapest first, and the head row carries the March catalogue rate rather than the base 950.
      expect(payload.rows[0]).toMatchObject({
        id: "olayan-ajyad",
        sar_per_night: 880,
        basis: "catalogue_exact",
        source_label: "Katalog Emaar 2027",
      })
      expect(result.params.makkahHotelId).toBe("olayan-ajyad")
      expect(result.params.travelMonth).toBe(3)
    })

    it("prices a named hotel through harga_hotel", async () => {
      const { executions } = installRunner([
        toolCallMessage("harga_hotel", { hotel: "Olayan", months: [3], room_types: ["DOUBLE"] }),
        textMessage({ ...defaultParams, travelMonth: 3, roomType: "DOUBLE", makkahHotelId: "olayan-ajyad" }),
      ])

      await parseEstimate("umroh maret double di olayan", mockPricing, { enhanced: true })

      const payload = executions[0].result as { found: boolean; rates: { sar_per_night: number; basis: string }[] }
      expect(payload.found).toBe(true)
      expect(payload.rates[0]).toMatchObject({ sar_per_night: 1400, basis: "catalogue_exact" })
    })

    it("rejects an unusable tool payload instead of answering with an empty city", () => {
      const [cariHotelTool] = buildEnhancedTools(mockPricing)
      expect(() => cariHotelTool.parse({ city: "JEDDAH" })).toThrow(/MADINAH/)
      expect(() => cariHotelTool.parse("MAKKAH")).toThrow(/object/)
    })
  })

  describe("the shared correction pipeline still runs (KTD1)", () => {
    it("reduces an impossible five-leg transport answer to three", async () => {
      installRunner([
        toolCallMessage("cari_hotel", { city: "MADINAH", month: 3 }),
        textMessage({
          ...defaultParams,
          travelMonth: 3,
          services: [
            "VISA",
            "TRANSPORT_JED_MAKKAH",
            "TRANSPORT_JED_MADINAH",
            "TRANSPORT_MAKKAH_MADINAH",
            "TRANSPORT_MAKKAH_JED",
            "TRANSPORT_MADINAH_JED",
          ],
        }),
      ])

      const result = await parseEstimate("umroh maret full rute", mockPricing, { enhanced: true })

      expect(result.params.services).toEqual([
        "VISA",
        "TRANSPORT_JED_MAKKAH",
        "TRANSPORT_MAKKAH_MADINAH",
        "TRANSPORT_MADINAH_JED",
      ])
      expect(result.notes).toContain("dihapus")
    })

    it("restores airline NONE to STANDARD when the input never asked to skip the flight", async () => {
      installRunner([textMessage({ ...defaultParams, airline: "NONE" })])

      const result = await parseEstimate("umroh maret standard", mockPricing, { enhanced: true })

      expect(result.params.airline).toBe("STANDARD")
      expect(result.notes).toContain("STANDARD")
    })

    it("still reconciles a stated total-day count", async () => {
      installRunner([textMessage({ ...defaultParams, nightsMadinah: 2, nightsMakkah: 2 })])

      const result = await parseEstimate("umroh 12 hari maret", mockPricing, { enhanced: true })

      expect(result.params.nightsMadinah + result.params.nightsMakkah).toBe(12)
    })

    it("still drops a hotel id the catalogue does not have", async () => {
      installRunner([textMessage({ ...defaultParams, makkahHotelId: "hotel-yang-tidak-ada" })])

      const result = await parseEstimate("umroh maret", mockPricing, { enhanced: true })

      // Not a catalogue id, and not a matching label either, so the resolver substitutes a
      // comparable option and says so — the same behaviour the normal path gets.
      expect(result.params.makkahHotelId).not.toBe("hotel-yang-tidak-ada")
      expect(result.notes).toContain("tidak ada di daftar harga")
    })
  })

  describe("empty search results (D3)", () => {
    it("treats total_matches: 0 as an answer and keeps the note about estimate rates", async () => {
      const { executions } = installRunner([
        toolCallMessage("cari_hotel", { city: "MAKKAH", month: 3, max_sar_per_night: 100 }),
        textMessage({
          ...defaultParams,
          travelMonth: 3,
          makkahHotelId: null,
          notes: "Tidak ada hotel katalog Makkah di bawah 100 SAR/malam bulan Maret; harga memakai tarif estimasi tier STANDARD.",
        }),
      ])

      const result = await parseEstimate("umroh maret makkah maksimal 100 sar", mockPricing, { enhanced: true })

      expect((executions[0].result as { total_matches: number }).total_matches).toBe(0)
      expect(result.params.hotelTier).toBe("STANDARD")
      expect(result.params.makkahHotelId).toBeUndefined()
      expect(result.notes).toContain("estimasi")
    })
  })

  describe("terminal outcomes", () => {
    it("reports a refusal before reading content", async () => {
      mockToolRunner.mockImplementation(() => ({
        async runUntilDone() {
          return { stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" }, content: [] }
        },
      }))

      await expect(parseEstimate("umroh maret", mockPricing, { enhanced: true })).rejects.toThrow(ParseError)
      await expect(parseEstimate("umroh maret", mockPricing, { enhanced: true })).rejects.toThrow(/declined/i)
    })

    it("stops at the iteration bound instead of looping, and says so", async () => {
      // Twice the bound's worth of tool calls, and never an answer: a model in a loop.
      const script = Array.from({ length: ENHANCED_PARSE_MAX_ITERATIONS * 2 }, (_, i) =>
        toolCallMessage("cari_hotel", { city: "MAKKAH", month: 3 }, `toolu_${i}`)
      )
      const { executions } = installRunner(script)

      await expect(parseEstimate("umroh maret", mockPricing, { enhanced: true })).rejects.toThrow(ParseError)
      expect(executions).toHaveLength(ENHANCED_PARSE_MAX_ITERATIONS)
    })

    it("names a token-cap truncation instead of blaming the JSON", async () => {
      installRunner([
        { stop_reason: "max_tokens", content: [{ type: "text", text: '{"nightsMadinah": 4, "nights' }] },
      ])

      await expect(parseEstimate("umroh maret", mockPricing, { enhanced: true })).rejects.toThrow(
        /8000-token cap/
      )
    })

    it("wraps a transport failure the way the normal path does", async () => {
      mockToolRunner.mockImplementation(() => ({
        async runUntilDone() {
          throw new Error("connection reset")
        },
      }))

      await expect(parseEstimate("umroh maret", mockPricing, { enhanced: true })).rejects.toThrow(
        /Anthropic API error: connection reset/
      )
    })

    it("still reports a non-JSON answer as a ParseError", async () => {
      installRunner([{ stop_reason: "end_turn", content: [{ type: "text", text: "maaf, tidak bisa" }] }])

      await expect(parseEstimate("umroh maret", mockPricing, { enhanced: true })).rejects.toThrow(
        /non-JSON response/
      )
    })
  })

  describe("the enhanced prompt (KTD2)", () => {
    const prompt = buildEnhancedSystemPrompt(mockPricing)
      .map((block) => block.text)
      .join("\n")

    it("contains no hotel list at all", () => {
      const hotels = [...(mockPricing.hotelOptions?.MADINAH ?? []), ...(mockPricing.hotelOptions?.MAKKAH ?? [])]
      expect(hotels.length).toBeGreaterThan(0)
      for (const hotel of hotels) {
        expect(prompt).not.toContain(hotel.id)
        expect(prompt).not.toContain(hotel.label)
      }
      // And no trace of the boolean flag the inline catalogue used to carry — the defect this path fixes.
      expect(prompt).not.toContain("real=catalog")
    })

    it("tells the model to reach for the tools and how to handle an empty result", () => {
      expect(prompt).toContain("cari_hotel")
      expect(prompt).toContain("harga_hotel")
      expect(prompt).toContain("total_matches: 0")
    })

    it("still carries the tier fallback rates and the shared extraction rules", () => {
      expect(prompt).toContain("1300 SAR")
      expect(prompt).toContain("TRANSPORT_MAKKAH_MADINAH")
      expect(prompt).toContain("travelMonth")
    })
  })

  // R5. The provenance the operator reads. Derived from the corrected params rather than transcribed
  // from the model's own prose, so these assertions are about a computation, not about a prompt.
  describe("provenance notes (R5, KTD4)", () => {
    const base: EstimateParams = {
      nightsMadinah: 4,
      nightsMakkah: 9,
      pax: 1,
      hotelTier: "STANDARD",
      roomType: "DOUBLE",
      airline: "STANDARD",
      services: [],
      fullboard: true,
      travelMonth: 3,
    }

    it("names the rate, the room type and the source_label on an exact catalogue hit", () => {
      const [note] = buildProvenanceNotes(mockPricing, { ...base, makkahHotelId: "olayan-ajyad" })

      expect(note).toContain("Makkah Olayan Ajyad")
      // 1400, the March DOUBLE catalogue rate — not the 950 base and not the 880 QUAD rate.
      expect(note).toContain("1400 SAR/malam")
      expect(note).toContain("tarif katalog DOUBLE bulan Maret")
      expect(note).toContain("Sumber: Katalog Emaar 2027")
      expect(note).not.toContain("pengganti")
    })

    it("spells a QUAD fallback out as a substitution rather than as the asked type's rate", () => {
      // Kayan has a March QUAD rate and no DOUBLE. An operator who read "620 SAR/malam — tarif
      // katalog DOUBLE" here would quote a number the catalogue never printed for a double.
      const [note] = buildProvenanceNotes(mockPricing, { ...base, madinahHotelId: "kayan-hotel" })

      expect(note).toContain("620 SAR/malam")
      expect(note).toContain("katalog tidak punya tarif DOUBLE bulan Maret")
      expect(note).toContain("tarif QUAD dipakai sebagai pengganti")
      expect(note).toContain("bukan tarif DOUBLE asli dari katalog")
      expect(note).toContain("Sumber: Katalog 1448H")
      expect(note).not.toContain("tarif katalog DOUBLE bulan")
    })

    it("says an estimate rate is an estimate, with no source attributed to it", () => {
      const [note] = buildProvenanceNotes(mockPricing, { ...base, madinahHotelId: "taiba-front" })

      expect(note).toContain("900 SAR/malam")
      expect(note).toContain("tarif estimasi")
      expect(note).toContain("belum ada tarif katalog untuk bulan Maret")
      expect(note).not.toContain("Sumber:")
    })

    it("writes one note per selected city and none for a city left to tier pricing", () => {
      const both = buildProvenanceNotes(mockPricing, {
        ...base,
        madinahHotelId: "kayan-hotel",
        makkahHotelId: "olayan-ajyad",
      })
      expect(both).toHaveLength(2)

      expect(buildProvenanceNotes(mockPricing, base)).toEqual([])
      // An id with no catalogue row behind it has no rate to attribute; the empty-search note (D3)
      // is what explains that case.
      expect(buildProvenanceNotes(mockPricing, { ...base, makkahHotelId: "tidak-ada" })).toEqual([])
    })

    it("falls back to the base rate and omits the month when none was given", () => {
      const [note] = buildProvenanceNotes(mockPricing, {
        ...base,
        travelMonth: undefined,
        makkahHotelId: "olayan-ajyad",
      })

      expect(note).toContain("950 SAR/malam")
      expect(note).toContain("tarif estimasi")
      expect(note).not.toContain("bulan")
    })

    it("reaches the caller's notes on the enhanced path", async () => {
      installRunner([
        toolCallMessage("harga_hotel", { hotel: "Olayan", months: [3], room_types: ["DOUBLE"] }),
        textMessage({
          ...defaultParams,
          travelMonth: 3,
          roomType: "DOUBLE",
          makkahHotelId: "olayan-ajyad",
          notes: "Bulan Maret dipakai sesuai permintaan.",
        }),
      ])

      const result = await parseEstimate("umroh maret double di olayan", mockPricing, { enhanced: true })

      // Appended to the model's own note, not instead of it — one notes string, one UI surface.
      expect(result.notes).toContain("Bulan Maret dipakai sesuai permintaan.")
      expect(result.notes).toContain("1400 SAR/malam")
      expect(result.notes).toContain("Katalog Emaar 2027")
    })

    it("describes the hotel the corrections settled on, not the one the model proposed", async () => {
      installRunner([
        textMessage({
          ...defaultParams,
          travelMonth: 3,
          roomType: "DOUBLE",
          makkahHotelId: "hotel-yang-tidak-ada",
        }),
      ])

      const result = await parseEstimate("umroh maret double", mockPricing, { enhanced: true })

      // validateParams substituted a comparable option; the provenance has to follow it, or the note
      // would attribute a rate to a hotel that is not in the quote.
      expect(result.params.makkahHotelId).toBe("olayan-ajyad")
      expect(result.notes).toContain("Makkah Olayan Ajyad")
      expect(result.notes).toContain("1400 SAR/malam")
    })

    it("adds nothing on the normal path, which never saw a catalogue rate", async () => {
      mockCreate.mockResolvedValue(
        claudeResponse({ ...defaultParams, travelMonth: 3, roomType: "DOUBLE", makkahHotelId: "olayan-ajyad" })
      )

      const result = await parseEstimate("umroh maret double di olayan", mockPricing)

      expect(result.params.makkahHotelId).toBe("olayan-ajyad")
      expect(result.notes).not.toContain("SAR/malam")
      expect(result.notes).not.toContain("Katalog Emaar 2027")
    })
  })
})
