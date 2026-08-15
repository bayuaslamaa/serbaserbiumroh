import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { pilgrimStories } from "@/shared/db/schema"
import { eq } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 } as const
  return { session }
}

type RouteCtx = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await ctx.params

  const [current] = await db
    .select({ isPublished: pilgrimStories.isPublished })
    .from(pilgrimStories)
    .where(eq(pilgrimStories.id, id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Story not found" }, { status: 404 })

  const [updated] = await db
    .update(pilgrimStories)
    .set({ isPublished: !current.isPublished, updatedAt: new Date() })
    .where(eq(pilgrimStories.id, id))
    .returning()

  return NextResponse.json({ story: updated })
}
