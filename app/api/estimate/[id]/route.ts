import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { fetchPricingConfig, calculateBudget } from "@/lib/budget/calculate"
import { eq } from "drizzle-orm"
import type { EstimateParams } from "@/types"

const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const ROOM_TYPES = ["QUAD", "TRIPLE", "DOUBLE", "SINGLE"]
const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"]
const SERVICE_KEYS = ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"]

function validateParams(p: unknown): p is EstimateParams {
  if (!p || typeof p !== "object") return false
  const o = p as Record<string, unknown>
  return (
    typeof o.nightsMadinah === "number" &&
    typeof o.nightsMakkah === "number" &&
    typeof o.pax === "number" &&
    HOTEL_TIERS.includes(o.hotelTier as string) &&
    ROOM_TYPES.includes(o.roomType as string) &&
    AIRLINE_TIERS.includes(o.airline as string) &&
    Array.isArray(o.services) &&
    (o.services as string[]).every((s) => SERVICE_KEYS.includes(s)) &&
    typeof o.fullboard === "boolean"
  )
}

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
    if (!validateParams(body.params)) {
      return NextResponse.json({ error: "params is invalid" }, { status: 400 })
    }
    const newParams = body.params as EstimateParams
    const pricing = await fetchPricingConfig(db)
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
