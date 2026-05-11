import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { faqGroups, faqItems } from "@/lib/db/schema"
import {
  FAQ_IMPORT_MAX_BYTES,
  FAQ_IMPORT_MAX_ROWS,
  parseFaqCsv,
} from "@/lib/admin/faq-import"

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
  if (Buffer.byteLength(body.csv, "utf8") > FAQ_IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: `csv must be ${FAQ_IMPORT_MAX_BYTES} bytes or less` }, { status: 413 })
  }

  const [existingGroups, existingFaqs] = await Promise.all([
    db.select().from(faqGroups),
    db.select().from(faqItems),
  ])
  const preview = parseFaqCsv(body.csv, { existingGroups, existingFaqs })
  if (preview.rows.length > FAQ_IMPORT_MAX_ROWS) {
    return NextResponse.json({ error: `csv must contain ${FAQ_IMPORT_MAX_ROWS} rows or fewer` }, { status: 413 })
  }

  return NextResponse.json({ preview })
}
