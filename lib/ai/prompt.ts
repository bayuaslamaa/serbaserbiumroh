import type { PricingConfig } from "@/types"

const STATIC_PROMPT = `You are an Umroh trip cost extraction assistant. Parse the user's request (Indonesian/English) and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

JSON schema:
{
  "nightsMadinah": integer,
  "nightsMakkah": integer,
  "pax": integer,
  "hotelTier": "ECONOMY"|"STANDARD"|"PELATARAN"|"PREMIUM",
  "madinahHotelId": string | null,
  "makkahHotelId": string | null,
  "roomType": "QUAD"|"TRIPLE"|"DOUBLE"|"SINGLE",
  "airline": "NONE"|"BUDGET"|"STANDARD"|"GARUDA"|"BUSINESS",
  "travelMonth": integer | null,
  "services": ["VISA","SISKOPATUH","TASREH","TRANSPORT","TOUR_MAKKAH","TOUR_MADINAH"],
  "fullboard": boolean,
  "notes": string
}

Extraction rules:
- "pelataran"/"dekat masjid"/"pinggir masjid" → hotelTier: "PELATARAN"
- If the user requests a specific Makkah hotel and it appears in Current pricing reference, set makkahHotelId to that option id.
- If the user requests a specific Madinah hotel and it appears in Current pricing reference, set madinahHotelId to that option id.
- If a requested hotel is not listed, choose a same-city comparable hotel by same tier/level from Current pricing reference and explain the substitution in notes.
- "Garuda"/"direct"/"langsung" → airline: "GARUDA"
- "lion air"/"air asia"/"budget" → airline: "BUDGET"
- "tanpa penerbangan"/"tanpa tiket"/"no flight"/"tiket sendiri" → airline: "NONE"
- If month is mentioned, set travelMonth to 1-12. Examples: "januari"/"jan"=1, "februari"/"feb"=2, "maret"/"mar"=3, "april"/"apr"=4, "mei"=5, "juni"/"jun"=6, "juli"/"jul"=7, "agustus"/"agu"=8, "september"/"sep"=9, "oktober"/"okt"=10, "november"/"nov"=11, "desember"/"des"=12
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
travelMonth=null unless a month is mentioned
madinahHotelId=null and makkahHotelId=null unless a specific or comparable hotel can be selected from Current pricing reference

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
  if (pricing.hotelOptions) {
    lines.push("Madinah hotel options:")
    for (const h of pricing.hotelOptions.MADINAH ?? []) {
      lines.push(`  id=${h.id}, label=${h.label}, tier=${h.tier}, SAR=${h.sarPerNight}, note=${h.sublabel}`)
    }
    lines.push("Makkah hotel options:")
    for (const h of pricing.hotelOptions.MAKKAH ?? []) {
      lines.push(`  id=${h.id}, label=${h.label}, tier=${h.tier}, SAR=${h.sarPerNight}, note=${h.sublabel}`)
    }
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
