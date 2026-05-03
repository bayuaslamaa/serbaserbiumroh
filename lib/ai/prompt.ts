import type { PricingConfig } from "@/types"

const STATIC_PROMPT = `You are an Umroh trip cost extraction assistant. Parse the user's request (Indonesian/English) and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

JSON schema:
{
  "nightsMadinah": integer,
  "nightsMakkah": integer,
  "pax": integer,
  "hotelTier": "ECONOMY"|"STANDARD"|"PELATARAN"|"PREMIUM",
  "roomType": "QUAD"|"TRIPLE"|"DOUBLE"|"SINGLE",
  "airline": "BUDGET"|"STANDARD"|"GARUDA"|"BUSINESS",
  "services": ["VISA","SISKOPATUH","TASREH","TRANSPORT","TOUR_MAKKAH","TOUR_MADINAH"],
  "fullboard": boolean,
  "notes": string
}

Extraction rules:
- "pelataran"/"dekat masjid"/"pinggir masjid" → hotelTier: "PELATARAN"
- "Garuda"/"direct"/"langsung" → airline: "GARUDA"
- "lion air"/"air asia"/"budget" → airline: "BUDGET"
- If date range given (e.g. "15-25 Sept"), compute nights = end - start per city
- If total days only, split evenly unless ratio stated
- Default services always included: ["VISA","SISKOPATUH","TRANSPORT"]
- "tour" / "tour makkah & madinah" → add TOUR_MAKKAH + TOUR_MADINAH
- "tasreh" / "raudhah" → add TASREH
- "siskopatuh" → ensure SISKOPATUH in services
- "fullboard"/"FB"/"full board"/"3x makan" → fullboard: true
- pax default 1 if unspecified

Defaults:
nightsMadinah=4, nightsMakkah=9, pax=1,
hotelTier="STANDARD", roomType="QUAD", airline="STANDARD", fullboard=true

In "notes", flag any assumptions made or ambiguities found. Return empty string if none.`

function buildDynamicPricingBlock(pricing: PricingConfig): string {
  const { rates, hotels, airlines, services } = pricing
  const lines: string[] = ["Current pricing reference:"]
  lines.push(`Exchange rates: SAR=${rates.SAR} IDR, USD=${rates.USD} IDR`)
  lines.push("Hotel SAR/night by tier:")
  for (const tier of ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const) {
    const m = hotels.MADINAH[tier]
    const k = hotels.MAKKAH[tier]
    lines.push(`  ${tier}: Madinah ${m.sarPerNight} SAR, Makkah ${k.sarPerNight} SAR`)
  }
  lines.push("Airlines (IDR/pax):")
  for (const [key, a] of Object.entries(airlines)) {
    lines.push(`  ${key}: ${a.idr.toLocaleString("id-ID")} IDR (${a.label})`)
  }
  lines.push("Services:")
  for (const [key, s] of Object.entries(services)) {
    if (s.enabled) {
      lines.push(`  ${key}: ${s.amount} ${s.currency} (${s.label})`)
    }
  }
  return lines.join("\n")
}

export function buildSystemPrompt(
  pricing: PricingConfig
): { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] {
  return [
    {
      type: "text",
      text: STATIC_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: buildDynamicPricingBlock(pricing),
    },
  ]
}
