import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import { calculateBudget } from "@/lib/budget/calculate"
import { eq, desc, count } from "drizzle-orm"
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
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 })
  }
  if (!validateParams(body.params)) {
    return NextResponse.json({ error: "params is invalid" }, { status: 400 })
  }

  const params = body.params as EstimateParams
  const hotelTierLabel = params.hotelTier.charAt(0) + params.hotelTier.slice(1).toLowerCase()
  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : `Estimasi ${hotelTierLabel} ${params.nightsMadinah}+${params.nightsMakkah} malam`

  const pricing = await fetchPricingConfig(db)
  const breakdown = calculateBudget(params, pricing)

  const [estimate] = await db
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

  return NextResponse.json({ estimate }, { status: 201 })
}
