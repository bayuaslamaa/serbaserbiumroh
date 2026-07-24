export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { fetchPricingConfig, calculateBudget } from "@/lib/budget/calculate"
import { applyOverrides } from "@/lib/budget/overrides"
import { generateWhatsAppText } from "@/lib/export/whatsapp"
import { generatePDF } from "@/lib/export/pdf"
import { eq } from "drizzle-orm"
import type { EstimateParams, ManualOverrides } from "@/types"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const format = req.nextUrl.searchParams.get("format")

  if (format !== "pdf" && format !== "whatsapp") {
    return NextResponse.json({ error: "format must be 'pdf' or 'whatsapp'" }, { status: 400 })
  }

  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id))
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (estimate.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const pricing = await fetchPricingConfig(db)
  const params = estimate.params as EstimateParams
  const overrides = (estimate.manualOverrides as ManualOverrides | null) ?? null
  const breakdown = calculateBudget(params, pricing)
  const display = applyOverrides(breakdown, overrides, params.pax)

  if (format === "whatsapp") {
    const text = generateWhatsAppText(params, breakdown, display, estimate.title)
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  // PDF
  const pdfBytes = await generatePDF(params, breakdown, display, estimate.title, estimate.id)
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=estimasi-umroh-${id}.pdf`,
    },
  })
}
