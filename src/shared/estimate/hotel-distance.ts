import type { HotelOptionConfig } from "@/shared/types"

// Distance to the Haram/Nabawi is free text in the catalogue ("900m", "1.2 km shuttle", "5 menit
// jalan kaki", "pelataran"), so every consumer that wants to rank or filter by closeness has to
// parse it. This lives in one module because two parsers would drift: the AI selection path in
// lib/ai/parse.ts and the cari_hotel tool must agree about which hotel is nearer, or the tool
// would shortlist by one notion of distance and the fallback picker rank by another.

// Free-text → metres. Returns undefined when the string carries no readable figure, which is the
// caller's cue to fall back rather than treat "unknown" as "zero".
export function extractDistanceMeters(value: string): number | undefined {
  const normalized = value.toLowerCase().replace(/,/g, ".")
  const km = normalized.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer)\b/)
  if (km) return Math.round(Number(km[1]) * 1000)

  const meter = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|metre)\b/)
  if (meter) return Math.round(Number(meter[1]))

  const minuteWalk = normalized.match(/(\d+(?:\.\d+)?)\s*(?:min|menit)/)
  if (minuteWalk) return Math.round(Number(minuteWalk[1]) * 80)
}

// A comparable "how far is it" figure in metres, lower is nearer. Keyword floors and ceilings on
// top of the parsed figure: catalogue rows say "pelataran" or "shuttle" far more consistently than
// they print a number, and a hotel with no readable distance defaults to a middling 3 km rather
// than sorting to the front.
export function distanceScore(hotel: Pick<HotelOptionConfig, "distance" | "sublabel" | "label">): number {
  const text = `${hotel.distance ?? ""} ${hotel.sublabel} ${hotel.label}`.toLowerCase()
  const meters = extractDistanceMeters(text)
  let score = meters ?? 3_000

  if (/\b(pelataran|ring 1|pinggir)\b/.test(text)) score = Math.min(score, 80)
  if (/\b(jalan kaki|walking|walk|dekat|near)\b/.test(text)) score = Math.min(score, 500)
  if (/\b(shuttle|bus|bis|thakher|aziziyah)\b/.test(text)) score = Math.max(score, 2_500)

  return score
}
