import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { fetchPricingConfig, calculateBudget } from "@/lib/budget/calculate"
import { validateEstimateHotelIds, validateEstimateParamsShape } from "@/lib/estimate/params"
import { eq } from "drizzle-orm"
import type { EstimateParams } from "@/types"
import { errorMessage, logActivity } from "@/lib/logging/activity-log"

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

  let body: { params?: unknown; title?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const updates: Partial<typeof estimates.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  }

  if (typeof body.title === "string") {
    updates.title = body.title.trim() || null
  }

  if (body.params !== undefined) {
    if (!validateEstimateParamsShape(body.params)) {
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
    const newParams = body.params as EstimateParams
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
        input: { params: newParams, title: body.title },
        error: errorMessage(err),
        metadata: { stage: "pricing_config" },
      })
      return NextResponse.json({ error: "Failed to load pricing config" }, { status: 503 })
    }
    if (!validateEstimateHotelIds(newParams, pricing)) {
      await logActivity(db, {
        userId: session.user.id,
        flow: "estimate",
        event: "estimate_update",
        status: "ERROR",
        entityType: "estimate",
        entityId: id,
        input: { params: newParams, title: body.title },
        error: "hotel selection is invalid",
        metadata: { stage: "validation" },
      })
      return NextResponse.json({ error: "hotel selection is invalid" }, { status: 400 })
    }
    const breakdown = calculateBudget(newParams, pricing)
    updates.params = newParams
    updates.totalIdrPax = breakdown.totalIdrPax
    updates.totalIdrGrp = breakdown.totalIdrGrp
  }

  let updated
  try {
    ;[updated] = await db
      .update(estimates)
      .set(updates)
      .where(eq(estimates.id, id))
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
