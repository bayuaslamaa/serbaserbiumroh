import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AIRLINE_PRICING_IMPORT_TEMPLATE } from "@/shared/admin/airline-pricing-import"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return new NextResponse(AIRLINE_PRICING_IMPORT_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="airline-pricing-import-template.csv"',
    },
  })
}
