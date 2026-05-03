import Anthropic from "@anthropic-ai/sdk"
import type { EstimateParams, PricingConfig } from "@/types"
import { buildSystemPrompt } from "./prompt"

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const ROOM_TYPES = ["QUAD", "TRIPLE", "DOUBLE", "SINGLE"] as const
const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const
const SERVICE_KEYS = ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"] as const

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ParseError"
  }
}

function validateParams(raw: Record<string, unknown>): EstimateParams {
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

  return {
    nightsMadinah: raw.nightsMadinah as number,
    nightsMakkah: raw.nightsMakkah as number,
    pax: raw.pax as number,
    hotelTier: raw.hotelTier as EstimateParams["hotelTier"],
    roomType: raw.roomType as EstimateParams["roomType"],
    airline: raw.airline as EstimateParams["airline"],
    services,
    fullboard: raw.fullboard as boolean,
  }
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

  const params = validateParams(parsed)
  const notes = typeof parsed.notes === "string" ? parsed.notes : ""

  return { params, notes }
}
