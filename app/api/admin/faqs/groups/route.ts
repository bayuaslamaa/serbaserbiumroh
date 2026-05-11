import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { faqGroups } from "@/lib/db/schema"
import { asc } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

function readSortOrder(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function GET() {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const groups = await db
    .select()
    .from(faqGroups)
    .orderBy(asc(faqGroups.sortOrder), asc(faqGroups.name))

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 })
  }

  const [group] = await db
    .insert(faqGroups)
    .values({
      name: body.name.trim(),
      sortOrder: readSortOrder(body.sortOrder),
    })
    .returning()

  return NextResponse.json({ group }, { status: 201 })
}
