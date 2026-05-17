import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import { parseEstimate, ParseError } from "@/lib/ai/parse"
import { errorMessage, logActivity } from "@/lib/logging/activity-log"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { input?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { input } = body
  if (typeof input !== "string" || input.trim().length === 0) {
    return NextResponse.json({ error: "input is required" }, { status: 400 })
  }
  if (input.length > 5000) {
    return NextResponse.json({ error: "input must be at most 5000 characters" }, { status: 400 })
  }

  let pricing
  try {
    pricing = await fetchPricingConfig(db)
  } catch (err) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "ai_parse",
      status: "ERROR",
      input: { rawInput: input },
      error: errorMessage(err),
      metadata: { stage: "pricing_config" },
    })
    return NextResponse.json({ error: "Failed to load pricing config" }, { status: 503 })
  }

  try {
    const { params, notes } = await parseEstimate(input, pricing)
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "ai_parse",
      status: "SUCCESS",
      input: { rawInput: input },
      output: { params, notes },
      metadata: { source: "estimate_form" },
    })
    return NextResponse.json({ params, notes })
  } catch (err) {
    if (err instanceof ParseError) {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "ai_parse",
        status: "ERROR",
        input: { rawInput: input },
        error: err.message,
        metadata: { stage: "parse_validation" },
      })
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    console.error("[parse] Anthropic error:", err instanceof Error ? err.message : err)
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "ai_parse",
      status: "ERROR",
      input: { rawInput: input },
      error: errorMessage(err),
      metadata: { stage: "ai_service" },
    })
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
  }
}
