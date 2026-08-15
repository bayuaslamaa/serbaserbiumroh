import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { fetchPricingConfig } from "@/shared/budget/calculate"
import { parseEstimate, ParseError } from "@/shared/ai/parse"
import { checkEnhancedParseCap, logEnhancedParseBlocked, logEnhancedParseUsage } from "@/shared/ai/parse-usage"
import { errorMessage, logActivity } from "@/shared/logging/activity-log"

// The enhanced path's gate. Status-returning, in the shape of app/api/admin/hotels/route.ts, rather
// than lib/auth.ts's requireAdmin(): that one calls redirect(), which inside a route handler throws
// NEXT_REDIRECT and answers 307 — a caller asking for JSON would get a redirect, not a 403.
//
// It also requires an id, because the daily cap is counted per user: a session that cannot be
// attributed cannot be capped, and the expensive path is exactly where that matters.
function enhancedGuard(user: { id?: string; role?: string }): { error: string; status: number } | { userId: string } {
  if (user.role !== "ADMIN" || !user.id) return { error: "Forbidden", status: 403 }
  return { userId: user.id }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { input?: unknown; enhanced?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { input, enhanced } = body
  if (typeof input !== "string" || input.trim().length === 0) {
    return NextResponse.json({ error: "input is required" }, { status: 400 })
  }
  if (input.length > 5000) {
    return NextResponse.json({ error: "input must be at most 5000 characters" }, { status: 400 })
  }
  if (enhanced !== undefined && typeof enhanced !== "boolean") {
    return NextResponse.json({ error: "enhanced must be a boolean" }, { status: 400 })
  }

  // Only `enhanced: true` requires ADMIN. The normal path stays open to any signed-in user exactly
  // as before — this must not tighten the contract the estimate form already relies on.
  const wantsEnhanced = enhanced === true
  const guard = wantsEnhanced ? enhancedGuard(session.user) : null
  if (guard && "error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  // Before anything is spent: the cap is checked ahead of the pricing read and the API call, so a
  // user over the ceiling costs one COUNT query and nothing else.
  if (guard && "userId" in guard) {
    const cap = await checkEnhancedParseCap(db, guard.userId)
    if (!cap.allowed) {
      await logEnhancedParseBlocked(db, {
        userId: guard.userId,
        rawInput: input,
        used: cap.used,
        limit: cap.limit,
      })
      return NextResponse.json(
        {
          error: `Batas harga katalog harian tercapai (${cap.used}/${cap.limit}). Pakai mode biasa atau coba lagi besok.`,
        },
        { status: 429 }
      )
    }
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
    const { params, notes } = await parseEstimate(input, pricing, { enhanced: wantsEnhanced })
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "ai_parse",
      status: "SUCCESS",
      input: { rawInput: input },
      output: { params, notes },
      metadata: { source: "estimate_form", ...(wantsEnhanced ? { enhanced: true } : {}) },
    })
    // The usage row is what the daily cap counts, so it is written for every attempt that reached
    // the API — this success branch and both error branches below.
    if (wantsEnhanced) {
      await logEnhancedParseUsage(db, {
        userId: session.user.id,
        rawInput: input,
        status: "SUCCESS",
        output: { params, notes },
        metadata: { stage: "parse_success" },
      })
    }
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
        metadata: { stage: "parse_validation", ...(wantsEnhanced ? { enhanced: true } : {}) },
      })
      if (wantsEnhanced) {
        await logEnhancedParseUsage(db, {
          userId: session.user.id,
          rawInput: input,
          status: "ERROR",
          error: err.message,
          metadata: { stage: "parse_validation" },
        })
      }
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
      metadata: { stage: "ai_service", ...(wantsEnhanced ? { enhanced: true } : {}) },
    })
    if (wantsEnhanced) {
      await logEnhancedParseUsage(db, {
        userId: session.user.id,
        rawInput: input,
        status: "ERROR",
        error: errorMessage(err),
        metadata: { stage: "ai_service" },
      })
    }
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
  }
}
