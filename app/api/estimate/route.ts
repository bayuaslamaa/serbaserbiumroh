import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import { calculateBudget } from "@/lib/budget/calculate"
import { estimateTitle, validateEstimateHotelIds, validateEstimateParamsShape } from "@/lib/estimate/params"
import { eq, desc, count } from "drizzle-orm"
import type { EstimateParams } from "@/types"
import { errorMessage, logActivity } from "@/lib/logging/activity-log"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")))
  const offset = (page - 1) * limit

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(estimates)
      .where(eq(estimates.userId, session.user.id))
      .orderBy(desc(estimates.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(estimates).where(eq(estimates.userId, session.user.id)),
  ])

  return NextResponse.json({ estimates: rows, total: Number(total) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { rawInput?: unknown; params?: unknown; aiNotes?: unknown; title?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.rawInput !== "string" || body.rawInput.trim().length === 0) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_save",
      status: "ERROR",
      input: body,
      error: "rawInput is required",
      metadata: { stage: "validation" },
    })
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 })
  }
  if (!validateEstimateParamsShape(body.params)) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_save",
      status: "ERROR",
      input: {
        rawInput: body.rawInput,
        params: body.params,
        aiNotes: body.aiNotes,
        title: body.title,
      },
      error: "params is invalid",
      metadata: { stage: "validation" },
    })
    return NextResponse.json({ error: "params is invalid" }, { status: 400 })
  }

  const params = body.params as EstimateParams
  let pricing
  try {
    pricing = await fetchPricingConfig(db)
  } catch (err) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_save",
      status: "ERROR",
      input: { rawInput: body.rawInput, params, aiNotes: body.aiNotes, title: body.title },
      error: errorMessage(err),
      metadata: { stage: "pricing_config" },
    })
    return NextResponse.json({ error: "Failed to load pricing config" }, { status: 503 })
  }
  if (!validateEstimateHotelIds(params, pricing)) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_save",
      status: "ERROR",
      input: { rawInput: body.rawInput, params, aiNotes: body.aiNotes, title: body.title },
      error: "hotel selection is invalid",
      metadata: { stage: "validation" },
    })
    return NextResponse.json({ error: "hotel selection is invalid" }, { status: 400 })
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : estimateTitle(params)

  const breakdown = calculateBudget(params, pricing)

  let estimate
  try {
    ;[estimate] = await db
      .insert(estimates)
      .values({
        userId: session.user.id,
        title,
        rawInput: body.rawInput as string,
        aiNotes: typeof body.aiNotes === "string" ? body.aiNotes : null,
        params,
        totalIdrPax: breakdown.totalIdrPax,
        totalIdrGrp: breakdown.totalIdrGrp,
      })
      .returning()
  } catch (err) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_save",
      status: "ERROR",
      input: { rawInput: body.rawInput, params, aiNotes: body.aiNotes, title },
      output: { breakdown },
      error: errorMessage(err),
      metadata: { stage: "database_insert" },
    })
    return NextResponse.json({ error: "Failed to save estimate" }, { status: 500 })
  }

  await logActivity(db, {
    userId: session.user.id,
    flow: "estimate",
    event: "estimate_save",
    status: "SUCCESS",
    entityType: "estimate",
    entityId: estimate.id,
    input: { rawInput: body.rawInput, params, aiNotes: body.aiNotes, title },
    output: {
      estimateId: estimate.id,
      totalIdrPax: breakdown.totalIdrPax,
      totalIdrGrp: breakdown.totalIdrGrp,
    },
    metadata: { source: "estimate_form" },
  })

  return NextResponse.json({ estimate }, { status: 201 })
}
