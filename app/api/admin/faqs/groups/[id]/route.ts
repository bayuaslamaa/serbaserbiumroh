import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { faqGroups, faqItems } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

function readSortOrder(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    .update(faqGroups)
    .set({
      name: body.name.trim(),
      sortOrder: readSortOrder(body.sortOrder) ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(faqGroups.id, params.id))
    .returning()

  if (!group) return NextResponse.json({ error: "group not found" }, { status: 404 })

  return NextResponse.json({ group })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const [existingItem] = await db
    .select({ id: faqItems.id })
    .from(faqItems)
    .where(eq(faqItems.groupId, params.id))
    .limit(1)

  if (existingItem) {
    return NextResponse.json({ error: "group has FAQ items" }, { status: 400 })
  }

  const [group] = await db
    .delete(faqGroups)
    .where(eq(faqGroups.id, params.id))
    .returning()

  if (!group) return NextResponse.json({ error: "group not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}
