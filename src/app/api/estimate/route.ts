import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { estimates } from "@/shared/db/schema"
import { fetchPricingConfig } from "@/shared/budget/calculate"
import { calculateBudget } from "@/shared/budget/calculate"
import { applyOverrides, isEmptyOverrides } from "@/shared/budget/overrides"
import { estimateTitle, normaliseAndValidateEstimateParams, validateEstimateHotelIds } from "@/shared/estimate/params"
import { arePersistableEstimateTotals, normaliseAndValidateManualOverrides } from "@/shared/estimate/overrides"
import { eq, desc, count } from "drizzle-orm"
import type { ManualOverrides } from "@/shared/types"
import { errorMessage, logActivity } from "@/shared/logging/activity-log"

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

  let body: {
    rawInput?: unknown
    params?: unknown
    aiNotes?: unknown
    title?: unknown
    manualOverrides?: unknown
    sourceEstimateId?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  let overridesFromStoredSource = false
  if (typeof body.sourceEstimateId === "string") {
    const [source] = await db.select().from(estimates).where(eq(estimates.id, body.sourceEstimateId))
    if (!source) return NextResponse.json({ error: "Source estimate not found" }, { status: 404 })
    if (source.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let storedOverrides: ManualOverrides | null = null
    if (source.manualOverrides != null) {
      const raw = source.manualOverrides as ManualOverrides
      const normalized = {
        overrides: raw.overrides,
        customRows: raw.customRows?.map(({ id, label, idr }) => ({ id, label, idr })),
      }
      // The source row was written against an older catalogue, so its override keys are
      // normalised (not merely validated) before they are carried onto the duplicate.
      storedOverrides = normaliseAndValidateManualOverrides(normalized)
      if (!storedOverrides) {
        return NextResponse.json({ error: "Source estimate overrides are invalid" }, { status: 409 })
      }
    }

    body = {
      rawInput: source.rawInput,
      params: source.params,
      aiNotes: source.aiNotes,
      title: `Duplikat — ${source.title ?? "Estimasi"}`,
      manualOverrides: storedOverrides,
    }
    overridesFromStoredSource = true
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
  // Normalise before validating: a duplicate carries the source row's stored params verbatim, and
  // the estimator posts back whatever it was seeded with, so retired keys reach this boundary.
  const normalisedParams = normaliseAndValidateEstimateParams(body.params)
  if (!normalisedParams) {
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

  const params = normalisedParams
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

  // Manual overrides are optional. Validate shape and enforce admin-only editing
  // (the page-level gate is not an API trust boundary).
  let overrides: ManualOverrides | null = null
  if (body.manualOverrides != null) {
    const normalisedOverrides = normaliseAndValidateManualOverrides(body.manualOverrides)
    if (!normalisedOverrides) {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_save",
        status: "ERROR",
        input: { rawInput: body.rawInput, params, aiNotes: body.aiNotes, title: body.title },
        error: "manual overrides invalid",
        metadata: { stage: "validation" },
      })
      return NextResponse.json({ error: "manual overrides invalid" }, { status: 400 })
    }
    if (!overridesFromStoredSource && !isEmptyOverrides(normalisedOverrides) && session.user.role !== "ADMIN") {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_save",
        status: "ERROR",
        input: { rawInput: body.rawInput, params, title: body.title },
        error: "manual overrides require admin",
        metadata: { stage: "authorization" },
      })
      return NextResponse.json({ error: "manual overrides require admin" }, { status: 403 })
    }
    overrides = isEmptyOverrides(normalisedOverrides) ? null : normalisedOverrides
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : estimateTitle(params)

  const breakdown = calculateBudget(params, pricing)
  const display = applyOverrides(breakdown, overrides, params.pax)
  if (!arePersistableEstimateTotals(display.totalIdrPax, display.totalIdrGrp)) {
    return NextResponse.json({ error: "estimate total exceeds supported range" }, { status: 400 })
  }

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
        manualOverrides: overrides,
        totalIdrPax: display.totalIdrPax,
        totalIdrGrp: display.totalIdrGrp,
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
      totalIdrPax: display.totalIdrPax,
      totalIdrGrp: display.totalIdrGrp,
    },
    metadata: { source: "estimate_form" },
  })

  return NextResponse.json({ estimate }, { status: 201 })
}
