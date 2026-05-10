import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { fetchPricingConfig, calculateBudget } from "@/lib/budget/calculate"
import { validateEstimateHotelIds, validateEstimateParamsShape } from "@/lib/estimate/params"
import { eq } from "drizzle-orm"
import type { EstimateParams } from "@/types"

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
      return NextResponse.json({ error: "params is invalid" }, { status: 400 })
    }
    const newParams = body.params as EstimateParams
    const pricing = await fetchPricingConfig(db)
    if (!validateEstimateHotelIds(newParams, pricing)) {
      return NextResponse.json({ error: "hotel selection is invalid" }, { status: 400 })
    }
    const breakdown = calculateBudget(newParams, pricing)
    updates.params = newParams
    updates.totalIdrPax = breakdown.totalIdrPax
    updates.totalIdrGrp = breakdown.totalIdrGrp
  }

  const [updated] = await db
    .update(estimates)
    .set(updates)
    .where(eq(estimates.id, id))
    .returning()

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
