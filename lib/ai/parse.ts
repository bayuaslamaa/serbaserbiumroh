import Anthropic from "@anthropic-ai/sdk"
import type { City, EstimateParams, HotelOptionConfig, HotelPriceConfig, HotelTier, PricingConfig } from "@/types"
import { buildSystemPrompt } from "./prompt"
import { MIN_TRIP_DAYS, MAX_TRIP_DAYS, totalTripDaysToNights } from "@/lib/estimate/nights"

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const ROOM_TYPES = ["QUAD", "TRIPLE", "DOUBLE", "SINGLE"] as const
const AIRLINE_TIERS = ["NONE", "BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const
const SERVICE_KEYS = ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"] as const

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

function extractDistanceMeters(value: string): number | undefined {
  const normalized = value.toLowerCase().replace(/,/g, ".")
  const km = normalized.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer)\b/)
  if (km) return Math.round(Number(km[1]) * 1000)

  const meter = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|metre)\b/)
  if (meter) return Math.round(Number(meter[1]))

  const minuteWalk = normalized.match(/(\d+(?:\.\d+)?)\s*(?:min|menit)/)
  if (minuteWalk) return Math.round(Number(minuteWalk[1]) * 80)
}

function distanceScore(hotel: HotelOptionConfig): number {
  const text = `${hotel.distance ?? ""} ${hotel.sublabel} ${hotel.label}`.toLowerCase()
  const meters = extractDistanceMeters(text)
  let score = meters ?? 3_000

  if (/\b(pelataran|ring 1|pinggir)\b/.test(text)) score = Math.min(score, 80)
  if (/\b(jalan kaki|walking|walk|dekat|near)\b/.test(text)) score = Math.min(score, 500)
  if (/\b(shuttle|bus|bis|thakher|aziziyah)\b/.test(text)) score = Math.max(score, 2_500)

  return score
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

  const services = (raw.services as string[]).filter((s) =>
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

function applyDeterministicCorrections(
  input: string,
  params: EstimateParams,
  notes: string[]
): EstimateParams {
  const corrected: EstimateParams = { ...params }

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

export async function parseEstimate(
  input: string,
  pricing: PricingConfig
): Promise<{ params: EstimateParams; notes: string }> {
  const client = new Anthropic()

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: buildSystemPrompt(pricing),
      messages: [{ role: "user", content: input }],
      // Sonnet 5 enables adaptive thinking by default; disable it so this JSON-extraction call
      // stays fast/cheap and the first content block remains the text response (as before).
      // @ts-expect-error `thinking` is absent from the pinned @anthropic-ai/sdk@0.36.3 types but is
      // forwarded verbatim in the request body. Drop this directive if the SDK is upgraded.
      thinking: { type: "disabled" },
    })
  } catch (err) {
    throw new Error(`Anthropic API error: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Scan for the first text block rather than assuming content[0]; keeps parsing correct even if
  // a leading non-text block (e.g. thinking) ever appears before the JSON response.
  const textBlock = response.content.find((b) => b.type === "text")
  const raw = textBlock?.type === "text" ? textBlock.text : ""

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
  const notes = notesList
    .filter((note) => note.trim().length > 0)
    .join(" ")

  return { params: correctedParams, notes }
}
