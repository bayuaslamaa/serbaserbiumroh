import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/shared/db"
import { communityJoinRequests } from "@/shared/db/schema"
import { addDuplicateFlags, fetchDuplicateKeys } from "@/shared/community/admin-requests"
import { desc } from "drizzle-orm"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: "Silakan login terlebih dahulu", status: 401 } as const
  if (session.user.role !== "ADMIN") return { error: "Akses hanya untuk admin", status: 403 } as const
  return { session }
}

export async function GET() {
  const guard = await requireAdmin()
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const [requests, duplicateKeys] = await Promise.all([
    db.select().from(communityJoinRequests).orderBy(desc(communityJoinRequests.createdAt)),
    fetchDuplicateKeys(),
  ])

  return NextResponse.json({ requests: addDuplicateFlags(requests, duplicateKeys) })
}
