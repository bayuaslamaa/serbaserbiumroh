import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { faqGroups, faqItems } from "@/shared/db/schema"
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

async function groupExists(groupId: string) {
  const [group] = await db
    .select({ id: faqGroups.id })
    .from(faqGroups)
    .where(eq(faqGroups.id, groupId))
    .limit(1)
  return !!group
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const [faq] = await db.select().from(faqItems).where(eq(faqItems.id, params.id)).limit(1)
  if (!faq) return NextResponse.json({ error: "FAQ not found" }, { status: 404 })

  return NextResponse.json({ faq })
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

  const updates: Partial<typeof faqItems.$inferInsert> = {
    updatedAt: new Date(),
  }

  if ("groupId" in body) {
    if (typeof body.groupId !== "string" || !body.groupId.trim()) {
      return NextResponse.json({ error: "groupId required" }, { status: 400 })
    }
    const trimmedGroupId = body.groupId.trim()
    if (!(await groupExists(trimmedGroupId))) {
      return NextResponse.json({ error: "group not found" }, { status: 400 })
    }
    updates.groupId = trimmedGroupId
  }

  if ("question" in body) {
    if (typeof body.question !== "string" || !body.question.trim()) {
      return NextResponse.json({ error: "question required" }, { status: 400 })
    }
    updates.question = body.question.trim()
  }

  if ("answer" in body) {
    if (typeof body.answer !== "string" || !body.answer.trim()) {
      return NextResponse.json({ error: "answer required" }, { status: 400 })
    }
    updates.answer = body.answer.trim()
  }

  if ("sortOrder" in body) {
    updates.sortOrder = readSortOrder(body.sortOrder) ?? 0
  }

  if ("isPublished" in body) {
    updates.isPublished = body.isPublished === true
  }

  const [faq] = await db
    .update(faqItems)
    .set(updates)
    .where(eq(faqItems.id, params.id))
    .returning()

  if (!faq) return NextResponse.json({ error: "FAQ not found" }, { status: 404 })

  return NextResponse.json({ faq })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const [faq] = await db
    .delete(faqItems)
    .where(eq(faqItems.id, params.id))
    .returning()

  if (!faq) return NextResponse.json({ error: "FAQ not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}
