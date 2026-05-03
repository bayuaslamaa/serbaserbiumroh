import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  serviceFees,
  hotelMonthlyPrices,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

const CITIES = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"]
const SERVICE_KEYS = ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"]

type RouteCtx = { params: Promise<{ category: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { category } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const now = new Date()

  if (category === "hotel") {
    const { city, tier, label, sublabel, sarPerNight } = body
    if (!CITIES.includes(city as string)) {
      return NextResponse.json({ error: "invalid city" }, { status: 400 })
    }
    if (!HOTEL_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: "invalid tier" }, { status: 400 })
    }
    if (typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "label required" }, { status: 400 })
    }
    if (typeof sublabel !== "string") {
      return NextResponse.json({ error: "sublabel required" }, { status: 400 })
    }
    if (typeof sarPerNight !== "number" || sarPerNight <= 0) {
      return NextResponse.json({ error: "sarPerNight must be a positive number" }, { status: 400 })
    }

    const [hotel] = await db
      .insert(hotelPrices)
      .values({
        city: city as "MAKKAH" | "MADINAH",
        tier: tier as "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM",
        label: label.trim(),
        sublabel: sublabel.trim(),
        sarPerNight,
        updatedAt: now,
      })
      .returning()

    const monthlyRows = Array.from({ length: 12 }, (_, i) => ({
      hotelPriceId: hotel.id,
      month: i + 1,
      sarPerNight,
      updatedAt: now,
    }))
    const monthlyPrices = await db.insert(hotelMonthlyPrices).values(monthlyRows).returning()

    return NextResponse.json({ hotel, monthlyPrices }, { status: 201 })
  }

  return NextResponse.json({ error: "Unknown category" }, { status: 400 })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { category } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const now = new Date()

  if (category === "rates") {
    const { currency, rateToIdr } = body
    if (typeof currency !== "string") return NextResponse.json({ error: "currency required" }, { status: 400 })
    if (typeof rateToIdr !== "number" || rateToIdr <= 0) {
      return NextResponse.json({ error: "rateToIdr must be a positive number" }, { status: 400 })
    }
    const [updated] = await db
      .update(exchangeRates)
      .set({ rateToIdr, updatedBy: session.user.id, updatedAt: now })
      .where(eq(exchangeRates.currency, currency))
      .returning()
    if (!updated) return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    return NextResponse.json({ rate: updated })
  }

  if (category === "hotel") {
    const { city, tier, sarPerNight } = body
    if (!CITIES.includes(city as string)) {
      return NextResponse.json({ error: "invalid city" }, { status: 400 })
    }
    if (!HOTEL_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: "invalid tier" }, { status: 400 })
    }
    if (typeof sarPerNight !== "number" || sarPerNight <= 0) {
      return NextResponse.json({ error: "sarPerNight must be a positive number" }, { status: 400 })
    }
    const [updated] = await db
      .update(hotelPrices)
      .set({ sarPerNight, updatedAt: now })
      .where(
        and(
          eq(hotelPrices.city, city as "MAKKAH" | "MADINAH"),
          eq(hotelPrices.tier, tier as "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM")
        )
      )
      .returning()
    if (!updated) return NextResponse.json({ error: "Hotel price not found" }, { status: 404 })
    return NextResponse.json({ hotel: updated })
  }

  if (category === "airline") {
    const { tier, idr } = body
    if (!AIRLINE_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: "invalid tier" }, { status: 400 })
    }
    if (typeof idr !== "number" || idr <= 0) {
      return NextResponse.json({ error: "idr must be a positive number" }, { status: 400 })
    }
    const [updated] = await db
      .update(airlinePrices)
      .set({ idr, updatedAt: now })
      .where(eq(airlinePrices.tier, tier as "BUDGET" | "STANDARD" | "GARUDA" | "BUSINESS"))
      .returning()
    if (!updated) return NextResponse.json({ error: "Airline price not found" }, { status: 404 })
    return NextResponse.json({ airline: updated })
  }

  if (category === "service") {
    const { key, amount, enabled, divideByPax } = body
    if (!SERVICE_KEYS.includes(key as string)) {
      return NextResponse.json({ error: "invalid key" }, { status: 400 })
    }
    if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 })
    }
    const updates: Partial<typeof serviceFees.$inferInsert> & { updatedAt: Date } = { updatedAt: now }
    if (typeof amount === "number") updates.amount = amount
    if (typeof enabled === "boolean") updates.enabled = enabled
    if (typeof divideByPax === "boolean") updates.divideByPax = divideByPax

    const [updated] = await db
      .update(serviceFees)
      .set(updates)
      .where(eq(serviceFees.key, key as "VISA" | "SISKOPATUH" | "TASREH" | "TRANSPORT" | "TOUR_MAKKAH" | "TOUR_MADINAH"))
      .returning()
    if (!updated) return NextResponse.json({ error: "Service fee not found" }, { status: 404 })
    return NextResponse.json({ service: updated })
  }

  if (category === "monthly-hotel") {
    const { hotelId, month, sarPerNight } = body
    if (typeof hotelId !== "string" || !hotelId) {
      return NextResponse.json({ error: "hotelId required" }, { status: 400 })
    }
    if (typeof month !== "number" || month < 1 || month > 12) {
      return NextResponse.json({ error: "month must be 1-12" }, { status: 400 })
    }
    if (typeof sarPerNight !== "number" || sarPerNight <= 0) {
      return NextResponse.json({ error: "sarPerNight must be a positive number" }, { status: 400 })
    }
    const [updated] = await db
      .update(hotelMonthlyPrices)
      .set({ sarPerNight, updatedAt: now })
      .where(and(eq(hotelMonthlyPrices.hotelPriceId, hotelId), eq(hotelMonthlyPrices.month, month)))
      .returning()
    if (!updated) return NextResponse.json({ error: "Monthly price not found" }, { status: 404 })
    return NextResponse.json({ monthlyPrice: updated })
  }

  return NextResponse.json({ error: "Unknown category" }, { status: 400 })
}
