import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { estimates } from "@/shared/db/schema"
import { fetchPricingConfig, calculateBudget } from "@/shared/budget/calculate"
import { applyOverrides, isEmptyOverrides } from "@/shared/budget/overrides"
import { normaliseAndValidateEstimateParams, validateEstimateHotelIds } from "@/shared/estimate/params"
import { arePersistableEstimateTotals, normaliseAndValidateManualOverrides } from "@/shared/estimate/overrides"
import { normaliseStoredOverrides, normaliseStoredParams } from "@/shared/estimate/services"
import { and, eq, gte, lt } from "drizzle-orm"
import type { EstimateParams, ManualOverrides } from "@/shared/types"
import { errorMessage, logActivity } from "@/shared/logging/activity-log"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id))
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (estimate.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ estimate })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id))
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (estimate.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { params?: unknown; title?: unknown; manualOverrides?: unknown; expectedUpdatedAt?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const updates: Partial<typeof estimates.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(Math.max(Date.now(), estimate.updatedAt.getTime() + 1)),
  }

  if (typeof body.title === "string") {
    updates.title = body.title.trim() || null
  }

  // Validate params when provided. Normalised first: the estimator seeds its state from the stored
  // snapshot and posts it straight back, so a saved estimate naming a retired service key must
  // survive a re-save instead of coming back as a 400.
  const normalisedBodyParams =
    body.params !== undefined ? normaliseAndValidateEstimateParams(body.params) : undefined
  if (body.params !== undefined && !normalisedBodyParams) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_update",
      status: "ERROR",
      entityType: "estimate",
      entityId: id,
      input: { params: body.params, title: body.title },
      error: "params is invalid",
      metadata: { stage: "validation" },
    })
    return NextResponse.json({ error: "params is invalid" }, { status: 400 })
  }

  // Validate + authorize overrides when provided.
  let normalisedBodyOverrides: ManualOverrides | null = null
  if (body.manualOverrides !== undefined) {
    if (session.user.role !== "ADMIN") {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_update",
        status: "ERROR",
        entityType: "estimate",
        entityId: id,
        input: { params: body.params, title: body.title },
        error: "manual overrides require admin",
        metadata: { stage: "authorization" },
      })
      return NextResponse.json({ error: "manual overrides require admin" }, { status: 403 })
    }
    if (body.manualOverrides !== null) normalisedBodyOverrides = normaliseAndValidateManualOverrides(body.manualOverrides)
    if (body.manualOverrides !== null && !normalisedBodyOverrides) {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_update",
        status: "ERROR",
        entityType: "estimate",
        entityId: id,
        input: { params: body.params, title: body.title },
        error: "manual overrides invalid",
        metadata: { stage: "validation" },
      })
      return NextResponse.json({ error: "manual overrides invalid" }, { status: 400 })
    }
  }

  const mutatesEstimate = body.params !== undefined || body.title !== undefined || body.manualOverrides !== undefined
  if (!mutatesEstimate) {
    return NextResponse.json({ error: "No supported fields to update" }, { status: 400 })
  }
  if (mutatesEstimate && typeof body.expectedUpdatedAt !== "string") {
    return NextResponse.json({ error: "expectedUpdatedAt is required" }, { status: 428 })
  }

  let expectedUpdatedAt: Date | null = null
  if (body.expectedUpdatedAt !== undefined) {
    if (typeof body.expectedUpdatedAt !== "string") {
      return NextResponse.json({ error: "expectedUpdatedAt is invalid" }, { status: 400 })
    }
    expectedUpdatedAt = new Date(body.expectedUpdatedAt)
    if (Number.isNaN(expectedUpdatedAt.getTime())) {
      return NextResponse.json({ error: "expectedUpdatedAt is invalid" }, { status: 400 })
    }
    if (estimate.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return NextResponse.json({ error: "Estimate was modified by another session" }, { status: 409 })
    }
  }

  // Recompute persisted totals whenever params or overrides change. An absent key
  // leaves the existing value untouched; a present (even empty) manualOverrides clears/sets it.
  if (body.params !== undefined || body.manualOverrides !== undefined) {
    // Either branch can carry retired service keys — the request body from a stale editor, the
    // stored row because it was written before the catalogue changed — so both are normalised.
    const effectiveParams =
      normalisedBodyParams ?? normaliseStoredParams(estimate.params as EstimateParams)
    const storedOverrides = (estimate.manualOverrides as ManualOverrides | null) ?? null
    const effectiveOverrides: ManualOverrides | null =
      body.manualOverrides !== undefined
        ? normalisedBodyOverrides && !isEmptyOverrides(normalisedBodyOverrides)
          ? normalisedBodyOverrides
          : null
        : storedOverrides && normaliseStoredOverrides(storedOverrides)

    let pricing
    try {
      pricing = await fetchPricingConfig(db)
    } catch (err) {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_update",
        status: "ERROR",
        entityType: "estimate",
        entityId: id,
        input: { params: effectiveParams, title: body.title },
        error: errorMessage(err),
        metadata: { stage: "pricing_config" },
      })
      return NextResponse.json({ error: "Failed to load pricing config" }, { status: 503 })
    }
    if (!validateEstimateHotelIds(effectiveParams, pricing)) {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_update",
        status: "ERROR",
        entityType: "estimate",
        entityId: id,
        input: { params: effectiveParams, title: body.title },
        error: "hotel selection is invalid",
        metadata: { stage: "validation" },
      })
      return NextResponse.json({ error: "hotel selection is invalid" }, { status: 400 })
    }
    const display = applyOverrides(calculateBudget(effectiveParams, pricing), effectiveOverrides, effectiveParams.pax)
    if (!arePersistableEstimateTotals(display.totalIdrPax, display.totalIdrGrp)) {
      return NextResponse.json({ error: "estimate total exceeds supported range" }, { status: 400 })
    }
    if (body.params !== undefined) updates.params = effectiveParams
    if (body.manualOverrides !== undefined) updates.manualOverrides = effectiveOverrides
    updates.totalIdrPax = display.totalIdrPax
    updates.totalIdrGrp = display.totalIdrGrp
  }

  let updated
  try {
    ;[updated] = await db
      .update(estimates)
      .set(updates)
      .where(
        expectedUpdatedAt
          ? and(
              eq(estimates.id, id),
              gte(estimates.updatedAt, expectedUpdatedAt),
              lt(estimates.updatedAt, new Date(expectedUpdatedAt.getTime() + 1)),
            )
          : eq(estimates.id, id),
      )
      .returning()
  } catch (err) {
    await logActivity(db, {
      userId: session.user.id,
      flow: "estimate",
      event: "estimate_update",
      status: "ERROR",
      entityType: "estimate",
      entityId: id,
      input: { params: body.params, title: body.title },
      error: errorMessage(err),
      metadata: { stage: "database_update" },
    })
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 })
  }

  if (!updated) {
    return NextResponse.json({ error: "Estimate was modified by another session" }, { status: 409 })
  }

  await logActivity(db, {
    userId: session.user.id,
    flow: "estimate",
    event: "estimate_update",
    status: "SUCCESS",
    entityType: "estimate",
    entityId: id,
    input: { params: body.params, title: body.title },
    output: {
      estimateId: updated.id,
      totalIdrPax: updated.totalIdrPax,
      totalIdrGrp: updated.totalIdrGrp,
    },
    metadata: { source: "estimate_form" },
  })

  return NextResponse.json({ estimate: updated })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id))
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (estimate.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.delete(estimates).where(eq(estimates.id, id))
  return new NextResponse(null, { status: 204 })
}
