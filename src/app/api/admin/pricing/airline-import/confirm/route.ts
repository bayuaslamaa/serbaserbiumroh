import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { airlineMonthlyPrices, airlinePrices } from "@/shared/db/schema"
import {
  AIRLINE_PRICING_IMPORT_MAX_BYTES,
  AIRLINE_PRICING_IMPORT_MAX_ROWS,
  parseAirlinePricingCsv,
  type AirlinePricingImportRowResult,
} from "@/shared/admin/airline-pricing-import"
import { eq } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: { csv?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.csv !== "string" || body.csv.trim().length === 0) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 })
  }
  if (Buffer.byteLength(body.csv, "utf8") > AIRLINE_PRICING_IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: `csv must be ${AIRLINE_PRICING_IMPORT_MAX_BYTES} bytes or less` }, { status: 413 })
  }

  const existingAirlines = await db.select().from(airlinePrices)
  const preview = parseAirlinePricingCsv(body.csv, { existingAirlines })
  if (preview.rows.length > AIRLINE_PRICING_IMPORT_MAX_ROWS) {
    return NextResponse.json({ error: `csv must contain ${AIRLINE_PRICING_IMPORT_MAX_ROWS} rows or fewer` }, { status: 413 })
  }

  const writableRows = preview.rows.filter((row) => row.status === "create" || row.status === "update")
  const appliedRows: Array<{
    rowNumber: number
    importKey: string
    status: "create" | "update"
    airlineId: string
    monthlyRowCount: number
    isDefault: boolean
  }> = []

  if (writableRows.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of writableRows) {
        appliedRows.push(await applyImportRow(tx, row))
      }
    })
  }

  return NextResponse.json({ preview, applied: writableRows.length, appliedRows })
}

async function applyImportRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  row: AirlinePricingImportRowResult
) {
  if (!row.data) throw new Error("Cannot apply import row without parsed data")

  const now = new Date()
  let airlineId = row.existingAirlineId
  const monthlyRows = Object.entries(row.data.monthlyPrices).map(([month, idr]) => ({
    airlinePriceId: "",
    month: Number(month),
    idr,
    updatedAt: now,
  }))

  if (row.data.isDefault) {
    await tx
      .update(airlinePrices)
      .set({ isDefault: false, updatedAt: now })
      .where(eq(airlinePrices.tier, row.data.tier))
  }

  if (row.status === "update" && airlineId) {
    await tx
      .update(airlinePrices)
      .set({
        tier: row.data.tier,
        label: row.data.label,
        sublabel: row.data.sublabel,
        idr: row.data.idr,
        importKey: row.data.matchKey,
        isDefault: row.data.isDefault,
        updatedAt: now,
      })
      .where(eq(airlinePrices.id, airlineId))
  } else {
    const [created] = await tx
      .insert(airlinePrices)
      .values({
        tier: row.data.tier,
        label: row.data.label,
        sublabel: row.data.sublabel,
        idr: row.data.idr,
        importKey: row.data.matchKey,
        isDefault: row.data.isDefault,
        updatedAt: now,
      })
      .returning()
    airlineId = created.id
  }

  await tx.delete(airlineMonthlyPrices).where(eq(airlineMonthlyPrices.airlinePriceId, airlineId))
  await tx.insert(airlineMonthlyPrices).values(monthlyRows.map((monthlyRow) => ({ ...monthlyRow, airlinePriceId: airlineId! })))

  return {
    rowNumber: row.rowNumber,
    importKey: row.data.matchKey,
    status: row.status as "create" | "update",
    airlineId: airlineId!,
    monthlyRowCount: monthlyRows.length,
    isDefault: row.data.isDefault,
  }
}
