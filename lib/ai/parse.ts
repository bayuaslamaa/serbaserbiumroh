import Anthropic from "@anthropic-ai/sdk"
import type { City, EstimateParams, HotelOptionConfig, HotelTier, PricingConfig } from "@/types"
import { buildSystemPrompt } from "./prompt"

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const ROOM_TYPES = ["QUAD", "TRIPLE", "DOUBLE", "SINGLE"] as const
const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const
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

function findComparableHotel(
  pricing: PricingConfig,
  city: City,
  tier: HotelTier,
  requestedLabel?: string
): HotelOptionConfig | undefined {
  const options = pricing.hotelOptions?.[city] ?? []
  if (requestedLabel) {
    const exact = options.find((hotel) => hotelMatchesRequest(hotel, requestedLabel))
    if (exact) return exact
  }

  const sameTier = options.filter((hotel) => hotel.tier === tier)
  if (sameTier.length > 0) return sameTier[0]

  const fallback = pricing.hotels[city][tier]
  return options
    .slice()
    .sort((a, b) => Math.abs(a.sarPerNight - fallback.sarPerNight) - Math.abs(b.sarPerNight - fallback.sarPerNight))[0]
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
  tier: HotelTier
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
    const comparable = findComparableHotel(pricing, city, tier, requestedLabel)
    if (!comparable) return {}

    if (requestedLabel && hotelMatchesRequest(comparable, requestedLabel)) {
      return { id: comparable.id }
    }

    const cityLabel = city === "MAKKAH" ? "Makkah" : "Madinah"
    const requested = requestedLabel ?? String(requestedId)
    return {
      id: comparable.id,
      note: `Hotel ${requested} ${cityLabel} tidak ada di daftar harga; memakai opsi setara ${comparable.tier}: ${comparable.label}.`,
    }
  }

  return {}
}

function validateParams(raw: Record<string, unknown>, pricing: PricingConfig): { params: EstimateParams; extraNotes: string[] } {
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
  const madinahHotel = resolveHotelId(raw, pricing, "MADINAH", hotelTier)
  const makkahHotel = resolveHotelId(raw, pricing, "MAKKAH", hotelTier)
  if (madinahHotel.id) params.madinahHotelId = madinahHotel.id
  if (makkahHotel.id) params.makkahHotelId = makkahHotel.id
  if (madinahHotel.note) extraNotes.push(madinahHotel.note)
  if (makkahHotel.note) extraNotes.push(makkahHotel.note)

  return { params, extraNotes }
}

export async function parseEstimate(
  input: string,
  pricing: PricingConfig
): Promise<{ params: EstimateParams; notes: string }> {
  const client = new Anthropic()

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(pricing),
      messages: [{ role: "user", content: input }],
    })
  } catch (err) {
    throw new Error(`Anthropic API error: ${err instanceof Error ? err.message : String(err)}`)
  }

  const raw = response.content[0]?.type === "text" ? response.content[0].text : ""

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ParseError(`Claude returned non-JSON response: ${raw.slice(0, 200)}`)
  }

  const { params, extraNotes } = validateParams(parsed, pricing)
  const notes = [typeof parsed.notes === "string" ? parsed.notes : "", ...extraNotes]
    .filter((note) => note.trim().length > 0)
    .join(" ")

  return { params, notes }
}
