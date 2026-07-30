import Anthropic from "@anthropic-ai/sdk"
import { SERVICE_KEYS } from "@/types"
import type { City, EstimateParams, HotelOptionConfig, HotelPriceConfig, HotelTier, PricingConfig, ServiceKey } from "@/types"
import { buildSystemPrompt } from "./prompt"
import { buildEnhancedSystemPrompt } from "./enhanced-prompt"
import { CARI_HOTEL_TOOL_NAME, cariHotel, type CariHotelInput } from "@/lib/ai/tools/hotel-search"
import { HARGA_HOTEL_TOOL_NAME, hargaHotel, resolveToolRate, type HargaHotelInput } from "@/lib/ai/tools/hotel-price"
import { distanceScore } from "@/lib/estimate/hotel-distance"
import { MONTH_NAMES_FULL } from "@/lib/hotels/pricing"
import { MIN_TRIP_DAYS, MAX_TRIP_DAYS, totalTripDaysToNights } from "@/lib/estimate/nights"
import { ARRIVAL_LEG_KEYS, DEPARTURE_LEG_KEYS, expandRetiredServices } from "@/lib/estimate/services"

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const ROOM_TYPES = ["QUINT", "QUAD", "TRIPLE", "DOUBLE"] as const
const AIRLINE_TIERS = ["NONE", "BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const

const CITY_HOTEL_FIELDS: Record<City, { id: "madinahHotelId" | "makkahHotelId"; label: string[] }> = {
  MADINAH: { id: "madinahHotelId", label: ["madinahHotel", "madinahHotelLabel", "hotelMadinah"] },
  MAKKAH: { id: "makkahHotelId", label: ["makkahHotel", "makkahHotelLabel", "hotelMakkah"] },
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ParseError"
  }
}

function normalizeHotelLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function hotelMatchesRequest(hotel: HotelOptionConfig, requested: string): boolean {
  const haystack = normalizeHotelLabel(`${hotel.label} ${hotel.sublabel}`)
  const needle = normalizeHotelLabel(requested)
  return haystack.includes(needle) || needle.includes(normalizeHotelLabel(hotel.label))
}

function hasProximityIntent(input: string, city: City): boolean {
  const normalized = normalizeHotelLabel(input)
  const general = /\b(pelataran|ring 1|jalan kaki|dekat|pinggir masjid|walking distance|walking|walk)\b/i.test(input)
  const makkah = /\b(haram|masjidil haram|near haram)\b/i.test(input)
  const madinah = /\b(nabawi|masjid nabawi|near nabawi)\b/i.test(input)

  if (makkah || madinah) return city === "MAKKAH" ? makkah : madinah
  return general || normalized.includes("ring 1")
}

function rankComparableHotels(
  options: HotelOptionConfig[],
  fallback: HotelPriceConfig,
  useDistance: boolean
): HotelOptionConfig[] {
  return options.slice().sort((a, b) => {
    if (useDistance) {
      const distanceDelta = distanceScore(a) - distanceScore(b)
      if (distanceDelta !== 0) return distanceDelta
    }

    const priceDelta = Math.abs(a.sarPerNight - fallback.sarPerNight) - Math.abs(b.sarPerNight - fallback.sarPerNight)
    if (priceDelta !== 0) return priceDelta

    return 0
  })
}

function hasRealPrice(hotel: HotelOptionConfig, travelMonth?: number): boolean {
  return travelMonth != null && hotel.realMonthlyPrices?.[travelMonth] != null
}

// Among candidates already ordered by tag/distance/price comparability, prefer the first that has
// an authoritative real (catalog) price for the requested month. Falls back to the top-ranked
// option when none is real-priced — real prices are a preference, never an exclusion (U5).
function pickPreferringReal(
  ordered: HotelOptionConfig[],
  travelMonth?: number
): HotelOptionConfig | undefined {
  if (ordered.length === 0) return undefined
  if (travelMonth != null) {
    const real = ordered.find((hotel) => hasRealPrice(hotel, travelMonth))
    if (real) return real
  }
  return ordered[0]
}

function findComparableHotel(
  pricing: PricingConfig,
  city: City,
  tier: HotelTier,
  requestedLabel?: string,
  sourceInput = "",
  travelMonth?: number
): HotelOptionConfig | undefined {
  const options = pricing.hotelOptions?.[city] ?? []
  if (requestedLabel) {
    const exact = options.find((hotel) => hotelMatchesRequest(hotel, requestedLabel))
    if (exact) return exact
  }

  const useDistance = hasProximityIntent(`${sourceInput} ${requestedLabel ?? ""}`, city)
  const fallback = pricing.hotels[city][tier]
  const sameTier = options.filter((hotel) => hotel.tier === tier)
  // Preserve the established ordering per branch (same-tier insertion order when no proximity intent,
  // distance/price ranking otherwise), then let a real catalog price break the pick within it.
  if (sameTier.length > 0 && !useDistance) return pickPreferringReal(sameTier, travelMonth)
  if (sameTier.length > 0) return pickPreferringReal(rankComparableHotels(sameTier, fallback, useDistance), travelMonth)

  return pickPreferringReal(rankComparableHotels(options, fallback, useDistance), travelMonth)
}

function getRequestedHotelLabel(raw: Record<string, unknown>, city: City): string | undefined {
  for (const field of CITY_HOTEL_FIELDS[city].label) {
    const value = raw[field]
    if (typeof value === "string" && value.trim().length > 0) return value
  }
}

function resolveHotelId(
  raw: Record<string, unknown>,
  pricing: PricingConfig,
  city: City,
  tier: HotelTier,
  sourceInput: string,
  travelMonth?: number
): { id?: string; note?: string } {
  const idField = CITY_HOTEL_FIELDS[city].id
  const requestedId = raw[idField]
  const requestedLabel = getRequestedHotelLabel(raw, city)
  const options = pricing.hotelOptions?.[city] ?? []

  if (typeof requestedId === "string" && requestedId.trim().length > 0) {
    const selected = options.find((hotel) => hotel.id === requestedId)
    if (selected) return { id: selected.id }
  }

  if (requestedLabel || (typeof requestedId === "string" && requestedId.trim().length > 0)) {
    const comparable = findComparableHotel(pricing, city, tier, requestedLabel, sourceInput, travelMonth)
    if (!comparable) return {}

    if (requestedLabel && hotelMatchesRequest(comparable, requestedLabel)) {
      return { id: comparable.id }
    }

    const cityLabel = city === "MAKKAH" ? "Makkah" : "Madinah"
    const requested = requestedLabel ?? String(requestedId)
    return {
      id: comparable.id,
      note: `Hotel ${requested} ${cityLabel} tidak ada di daftar harga; memakai opsi setara ${comparable.tier}: ${comparable.label}${comparable.distance ? ` (${comparable.distance})` : ""}.`,
    }
  }

  if (hasProximityIntent(sourceInput, city)) {
    const comparable = findComparableHotel(pricing, city, tier, undefined, sourceInput, travelMonth)
    if (comparable) return { id: comparable.id }
  }

  return {}
}

function validateParams(raw: Record<string, unknown>, pricing: PricingConfig, sourceInput: string): { params: EstimateParams; extraNotes: string[] } {
  const missing: string[] = []

  if (typeof raw.nightsMadinah !== "number") missing.push("nightsMadinah")
  if (typeof raw.nightsMakkah !== "number") missing.push("nightsMakkah")
  if (typeof raw.pax !== "number") missing.push("pax")
  if (!HOTEL_TIERS.includes(raw.hotelTier as never)) missing.push("hotelTier")
  if (!ROOM_TYPES.includes(raw.roomType as never)) missing.push("roomType")
  if (!AIRLINE_TIERS.includes(raw.airline as never)) missing.push("airline")
  if (!Array.isArray(raw.services)) missing.push("services")
  if (typeof raw.fullboard !== "boolean") missing.push("fullboard")

  if (missing.length > 0) {
    throw new ParseError(`Missing or invalid fields: ${missing.join(", ")}`)
  }

  // Claude can still answer with the retired all-or-nothing TRANSPORT key out of habit, and the
  // filter below would drop it without a word — a quote with no transport line at all. Expanding
  // it to the legs it stood for keeps that money in the estimate.
  const services = expandRetiredServices(raw.services as unknown[]).filter((s) =>
    SERVICE_KEYS.includes(s as never)
  ) as EstimateParams["services"]

  const hotelTier = raw.hotelTier as EstimateParams["hotelTier"]
  const params: EstimateParams = {
    nightsMadinah: raw.nightsMadinah as number,
    nightsMakkah: raw.nightsMakkah as number,
    pax: raw.pax as number,
    hotelTier,
    roomType: raw.roomType as EstimateParams["roomType"],
    airline: raw.airline as EstimateParams["airline"],
    services,
    fullboard: raw.fullboard as boolean,
  }

  if (
    typeof raw.travelMonth === "number" &&
    Number.isInteger(raw.travelMonth) &&
    raw.travelMonth >= 1 &&
    raw.travelMonth <= 12
  ) {
    params.travelMonth = raw.travelMonth
  }

  const extraNotes: string[] = []
  const madinahHotel = resolveHotelId(raw, pricing, "MADINAH", hotelTier, sourceInput, params.travelMonth)
  const makkahHotel = resolveHotelId(raw, pricing, "MAKKAH", hotelTier, sourceInput, params.travelMonth)
  if (madinahHotel.id) params.madinahHotelId = madinahHotel.id
  if (makkahHotel.id) params.makkahHotelId = makkahHotel.id
  if (madinahHotel.note) extraNotes.push(madinahHotel.note)
  if (makkahHotel.note) extraNotes.push(makkahHotel.note)

  return { params, extraNotes }
}

const NO_FLIGHT_PATTERNS = [
  /tanpa\s+(?:tiket\s+)?(?:pesawat|penerbangan)/i,
  /tiket\s+(?:diurus\s+)?sendiri/i,
  /(?:no|without)\s+flight/i,
]

function explicitlyRequestsNoFlight(input: string): boolean {
  return NO_FLIGHT_PATTERNS.some((pattern) => pattern.test(input))
}

function extractTotalTripDays(input: string): number | undefined {
  if (/\bmalam\b/i.test(input)) return undefined

  const match = input.match(/\b(\d{1,2})\s*(?:hari|days?|d)\b/i)
  if (!match) return undefined

  const days = Number(match[1])
  return Number.isInteger(days) && days >= MIN_TRIP_DAYS && days <= MAX_TRIP_DAYS ? days : undefined
}

// A group flies into Jeddah once and leaves once, so an itinerary carries at most one arrival leg
// and at most one departure leg. The prompt says so, but a language model asked for "full rute"
// can still answer with every leg it knows — and billing two airport arrivals charges the customer
// for a journey that cannot happen. Keep one leg of each pair — the arrival Claude named first,
// then the return that matches it — and say so in the notes rather than editing money silently.
const ARRIVALS: readonly ServiceKey[] = ARRIVAL_LEG_KEYS
const DEPARTURES: readonly ServiceKey[] = DEPARTURE_LEG_KEYS

// The arrival leg fixes the direction of travel, so it also fixes which city the group flies home
// from: land at Makkah and the return is from Madinah, and vice versa.
const RETURN_LEG_FOR_ARRIVAL: Record<string, ServiceKey> = {
  TRANSPORT_JED_MAKKAH: "TRANSPORT_MADINAH_JED",
  TRANSPORT_JED_MADINAH: "TRANSPORT_MAKKAH_JED",
}

function dropImpossibleTransportLegs(services: ServiceKey[], notes: string[]): ServiceKey[] {
  let kept = services

  function keepOne(candidates: ServiceKey[], preferred: ServiceKey | undefined, what: string) {
    if (candidates.length < 2) return
    // Fall back to whichever leg Claude listed first — its own stated direction — when nothing
    // else in the answer says which one it meant.
    const keep = preferred && candidates.includes(preferred) ? preferred : candidates[0]
    const dropped = candidates.filter((key) => key !== keep)
    kept = kept.filter((key) => !dropped.includes(key))
    notes.push(
      `${dropped.join(", ")} dihapus: satu perjalanan hanya punya satu ${what} (dipakai ${keep}).`
    )
  }

  keepOne(kept.filter((key) => ARRIVALS.includes(key)), undefined, "penjemputan dari Jeddah")

  const arrival = kept.find((key) => ARRIVALS.includes(key))
  keepOne(
    kept.filter((key) => DEPARTURES.includes(key)),
    arrival ? RETURN_LEG_FOR_ARRIVAL[arrival] : undefined,
    "pengantaran ke Jeddah"
  )

  return kept
}

function applyDeterministicCorrections(
  input: string,
  params: EstimateParams,
  notes: string[]
): EstimateParams {
  const corrected: EstimateParams = { ...params }

  corrected.services = dropImpossibleTransportLegs(corrected.services, notes)

  if (corrected.airline === "NONE" && !explicitlyRequestsNoFlight(input)) {
    corrected.airline = "STANDARD"
    notes.push("Penerbangan dikembalikan ke STANDARD karena input tidak menyebut tanpa tiket/penerbangan.")
  }

  const totalDays = extractTotalTripDays(input)
  if (totalDays != null && corrected.nightsMadinah + corrected.nightsMakkah !== totalDays) {
    const { nightsMadinah, nightsMakkah } = totalTripDaysToNights(totalDays)
    corrected.nightsMadinah = nightsMadinah
    corrected.nightsMakkah = nightsMakkah
    notes.push(`Durasi ${totalDays} hari diterapkan sebagai ${corrected.nightsMadinah} malam Madinah + ${corrected.nightsMakkah} malam Makkah.`)
  }

  return corrected
}

// --- The enhanced (tool-grounded) branch ---------------------------------------------------------
//
// Off by default. When on, the model gets no hotel list and two tools instead, so it can compare
// what hotels actually cost in the requested month before it picks one (KTD2). The answer it
// returns is the same JSON the normal path returns, and it goes through the same
// validateParams -> applyDeterministicCorrections pipeline below (KTD1).

/** Same model as the normal path: this is constrained selection over a few tool calls (D1). */
export const ENHANCED_PARSE_MODEL = "claude-sonnet-5"

/**
 * 8000, not the normal path's 1024. `max_tokens` caps thinking *plus* response text, so leaving it
 * at 1024 with adaptive thinking on truncates the answer mid-JSON — and that surfaces as
 * "Claude returned non-JSON response", which sends the next reader hunting for a prompt bug (D1).
 */
export const ENHANCED_PARSE_MAX_TOKENS = 8000

/** `medium` rather than the `high` default: latency is the operator-facing cost here (D1). */
export const ENHANCED_PARSE_EFFORT = "medium" as const

/**
 * Ceiling on API round-trips inside the tool loop (KTD6). Two searches plus a couple of price
 * confirmations plus the final answer fit comfortably; a model that keeps calling tools past this
 * is looping, and the run ends with `stop_reason: "tool_use"` instead of running unbounded.
 */
export const ENHANCED_PARSE_MAX_ITERATIONS = 8

function requireObject(content: unknown, tool: string): Record<string, unknown> {
  if (typeof content !== "object" || content === null || Array.isArray(content)) {
    throw new Error(`${tool} expects an object of arguments.`)
  }
  return content as Record<string, unknown>
}

function requireCity(value: unknown, tool: string): City {
  if (value === "MADINAH" || value === "MAKKAH") return value
  throw new Error(`${tool} needs city to be "MADINAH" or "MAKKAH".`)
}

/**
 * The runnable tools handed to the tool runner. Both close over an already-built `PricingConfig`,
 * so the whole loop costs zero extra queries — U2's tool functions are pure over that config.
 *
 * `parse` is the runner's input gate. It only rejects what the tool functions cannot defend
 * themselves against: a non-object payload, and an unknown city (which would otherwise read as an
 * empty city and come back as a truthful-looking `total_matches: 0`). Months, room types, tiers and
 * limits are already validated inside `cariHotel`/`hargaHotel`, so they are left to it. A throw here
 * becomes an `is_error` tool result the model can read and correct, not a failed parse.
 */
export function buildEnhancedTools(pricing: PricingConfig) {
  return [
    {
      name: CARI_HOTEL_TOOL_NAME,
      description:
        "Cari hotel dari katalog untuk satu kota, dengan tarif SAR/malam yang sudah dihitung untuk bulan dan tipe kamar yang diminta. Urut termurah lebih dulu. Pakai ini sebelum memilih hotel.",
      input_schema: {
        type: "object" as const,
        properties: {
          city: { type: "string", enum: ["MADINAH", "MAKKAH"], description: "Kota hotel." },
          month: { type: "integer", description: "Bulan perjalanan 1-12. Tanpa ini tarif memakai estimasi dasar, bukan tarif bulan itu." },
          room_type: { type: "string", enum: [...ROOM_TYPES], description: "Default QUAD." },
          tier: { type: "string", enum: [...HOTEL_TIERS], description: "Batasi ke satu level hotel." },
          max_sar_per_night: { type: "number", description: "Batas atas tarif SAR/malam setelah resolusi bulan." },
          max_distance_meters: { type: "number", description: "Jarak maksimum ke masjid dalam meter." },
          require_real_price: { type: "boolean", description: "true = hanya hotel yang punya tarif katalog untuk bulan itu." },
          limit: { type: "integer", description: "Jumlah baris maksimum." },
        },
        required: ["city"],
      },
      parse: (content: unknown): CariHotelInput => {
        const raw = requireObject(content, CARI_HOTEL_TOOL_NAME)
        return { ...raw, city: requireCity(raw.city, CARI_HOTEL_TOOL_NAME) } as CariHotelInput
      },
      run: (input: CariHotelInput) => JSON.stringify(cariHotel(pricing, input)),
    },
    {
      name: HARGA_HOTEL_TOOL_NAME,
      description:
        "Ambil tarif SAR/malam satu hotel tertentu untuk beberapa bulan dan tipe kamar. Pakai ini ketika pengguna menyebut nama hotel, atau untuk memastikan tarif hotel yang sudah dipilih.",
      input_schema: {
        type: "object" as const,
        properties: {
          hotel: { type: "string", description: "Id hotel dari cari_hotel, atau nama hotel apa adanya." },
          months: { type: "array", items: { type: "integer" }, description: "Bulan-bulan 1-12." },
          room_types: { type: "array", items: { type: "string", enum: [...ROOM_TYPES] }, description: "Default QUAD." },
          city: { type: "string", enum: ["MADINAH", "MAKKAH"], description: "Persempit bila nama hotel ada di dua kota." },
        },
        required: ["hotel", "months"],
      },
      parse: (content: unknown): HargaHotelInput => {
        const raw = requireObject(content, HARGA_HOTEL_TOOL_NAME)
        if (typeof raw.hotel !== "string" || raw.hotel.trim().length === 0) {
          throw new Error(`${HARGA_HOTEL_TOOL_NAME} needs a non-empty hotel name or id.`)
        }
        return {
          ...raw,
          hotel: raw.hotel,
          months: Array.isArray(raw.months) ? (raw.months as number[]) : [],
          ...(raw.city !== undefined ? { city: requireCity(raw.city, HARGA_HOTEL_TOOL_NAME) } : {}),
        } as HargaHotelInput
      },
      run: (input: HargaHotelInput) => JSON.stringify(hargaHotel(pricing, input)),
    },
  ]
}

async function requestEnhancedText(
  client: Anthropic,
  input: string,
  pricing: PricingConfig
): Promise<string> {
  const runner = client.beta.messages.toolRunner({
    model: ENHANCED_PARSE_MODEL,
    max_tokens: ENHANCED_PARSE_MAX_TOKENS,
    // Adaptive, NOT the normal path's `disabled`. Sonnet 5 with thinking off is measurably less
    // willing to reach for tools, and tool use is the entire value of this branch — inheriting
    // `disabled` would run the expensive path and return the cheap path's answer (D1).
    thinking: { type: "adaptive" },
    output_config: { effort: ENHANCED_PARSE_EFFORT },
    max_iterations: ENHANCED_PARSE_MAX_ITERATIONS,
    system: buildEnhancedSystemPrompt(pricing),
    messages: [{ role: "user", content: input }],
    tools: buildEnhancedTools(pricing),
  })

  let final: Anthropic.Beta.Messages.BetaMessage
  try {
    final = await runner.runUntilDone()
  } catch (err) {
    throw new Error(`Anthropic API error: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Checked before `content` is read: a refusal comes back as a normal 200 with a stop_details
  // category and no JSON, so reading content first would report it as a malformed answer.
  if (final.stop_reason === "refusal") {
    const category = final.stop_details?.type === "refusal" ? final.stop_details.category : null
    throw new ParseError(`Claude declined this request${category ? ` (${category})` : ""}.`)
  }

  // The runner breaks out of its loop when max_iterations is reached, so the last message can still
  // be asking for another tool call. That is the iteration bound firing, not a bad answer.
  if (final.stop_reason === "tool_use") {
    throw new ParseError(
      `Claude was still calling tools after ${ENHANCED_PARSE_MAX_ITERATIONS} rounds and never returned the estimate JSON.`
    )
  }

  // Named rather than left to fail as "non-JSON response". Adaptive thinking spends the same
  // max_tokens budget as the answer, so a truncation here means the cap is too low for this input —
  // and D1's trap is precisely that the symptom otherwise looks like a prompt or schema bug.
  if (final.stop_reason === "max_tokens") {
    throw new ParseError(
      `Claude hit the ${ENHANCED_PARSE_MAX_TOKENS}-token cap before finishing the estimate JSON.`
    )
  }

  const textBlock = final.content.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.text : ""
}

async function requestNormalText(
  client: Anthropic,
  input: string,
  pricing: PricingConfig
): Promise<string> {
  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: buildSystemPrompt(pricing),
      messages: [{ role: "user", content: input }],
      // Sonnet 5 enables adaptive thinking by default; disable it so this JSON-extraction call
      // stays fast/cheap and the first content block remains the text response (as before).
      // Needs @anthropic-ai/sdk >= 0.37 for the typed `thinking` param — on 0.36.x this line
      // required a @ts-expect-error. Dropping `disabled` here is not cosmetic: adaptive thinking
      // shares the max_tokens budget below, so the JSON answer would truncate.
      thinking: { type: "disabled" },
    })
  } catch (err) {
    throw new Error(`Anthropic API error: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Scan for the first text block rather than assuming content[0]; keeps parsing correct even if
  // a leading non-text block (e.g. thinking) ever appears before the JSON response.
  const textBlock = response.content.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.text : ""
}

const CITY_LABEL: Record<City, string> = { MADINAH: "Madinah", MAKKAH: "Makkah" }

/**
 * R5. The provenance the operator needs to trust an enhanced answer: which SAR/night the hotel the
 * model picked will actually be charged at, which catalogue that number came from, and — the case
 * that is easy to miss — whether a QUAD rate stood in for the room type that was asked for (KTD4).
 *
 * Derived here rather than asked of the prompt. A note the model writes about its own tool results
 * is a claim, and the point of this path is that the number is checkable; a model that picked well
 * and then mis-transcribed the rate would be indistinguishable from one that picked badly.
 * `resolveToolRate` is the same single derivation `lib/budget/calculate.ts` will charge from
 * (via `resolveHotelSar`), so the note cannot drift from the quote it explains.
 *
 * Runs on the CORRECTED params, so it describes the hotel/room/month actually being quoted — not
 * the ones the model proposed before `validateParams` substituted an unknown hotel id.
 */
export function buildProvenanceNotes(pricing: PricingConfig, params: EstimateParams): string[] {
  const notes: string[] = []

  for (const city of ["MADINAH", "MAKKAH"] as const) {
    const hotelId = params[CITY_HOTEL_FIELDS[city].id]
    if (!hotelId) continue
    const hotel = (pricing.hotelOptions?.[city] ?? []).find((option) => option.id === hotelId)
    // No concrete catalogue row means there is no rate to attribute. The tier-fallback path already
    // explains itself through the model's own empty-search note (D3).
    if (!hotel) continue

    const rate = resolveToolRate(hotel, params.roomType, params.travelMonth)
    const where = `${CITY_LABEL[city]} ${hotel.label}`
    const month = params.travelMonth != null ? MONTH_NAMES_FULL[params.travelMonth - 1] : null
    const perNight = `${rate.sar_per_night} SAR/malam`
    // "" on a real rate means the catalogue row predates the source_label column — say nothing
    // rather than printing an empty attribution.
    const source = rate.source_label ? ` Sumber: ${rate.source_label}.` : ""

    if (rate.basis === "catalogue_exact") {
      notes.push(
        `${where}: ${perNight} — tarif katalog ${rate.room_type}${month ? ` bulan ${month}` : ""}.${source}`
      )
    } else if (rate.basis === "catalogue_quad_fallback") {
      // Spelled out as a substitution, not as a rate. An operator reading a bare number here would
      // quote it as the asked room type's catalogue price, which is exactly what it is not.
      notes.push(
        `${where}: ${perNight} — katalog tidak punya tarif ${rate.room_type}` +
          `${month ? ` bulan ${month}` : ""}, jadi tarif ${rate.priced_room_type} dipakai sebagai pengganti ` +
          `lalu disesuaikan ke ${rate.room_type}. Ini bukan tarif ${rate.room_type} asli dari katalog.${source}`
      )
    } else {
      notes.push(
        `${where}: ${perNight} — tarif estimasi, belum ada tarif katalog` +
          `${month ? ` untuk bulan ${month}` : ""}.`
      )
    }
  }

  return notes
}

export interface ParseEstimateOptions {
  /**
   * Opt in to the tool-grounded path. Left false (the default), `parseEstimate` takes exactly the
   * path it took before this option existed — same prompt, same model params, same single-shot call.
   */
  enhanced?: boolean
}

export async function parseEstimate(
  input: string,
  pricing: PricingConfig,
  options: ParseEstimateOptions = {}
): Promise<{ params: EstimateParams; notes: string }> {
  const client = new Anthropic()

  const raw = options.enhanced
    ? await requestEnhancedText(client, input, pricing)
    : await requestNormalText(client, input, pricing)

  // Everything from here down is shared by both branches on purpose (KTD1). The corrections below
  // assume one complete params object from one input string, which is exactly what either branch
  // produces — so the enhanced path inherits the transport-leg pruning, the airline-NONE guard, the
  // total-days reconciliation and the hotel-id validation without restating any of them.

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ParseError(`Claude returned non-JSON response: ${raw.slice(0, 200)}`)
  }

  const { params, extraNotes } = validateParams(parsed, pricing, input)
  const notesList = [typeof parsed.notes === "string" ? parsed.notes : "", ...extraNotes]
  const correctedParams = applyDeterministicCorrections(input, params, notesList)

  // R5 rides the notes channel the estimator already renders — no new surface, so no new place for
  // provenance to be dropped. Enhanced-only: on the normal path the model never saw a catalogue
  // rate, so attributing its hotel pick to one would explain a decision it did not make.
  if (options.enhanced) notesList.push(...buildProvenanceNotes(pricing, correctedParams))

  const notes = notesList
    .filter((note) => note.trim().length > 0)
    .join(" ")

  return { params: correctedParams, notes }
}
