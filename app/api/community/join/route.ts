import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { communityJoinRequests } from "@/lib/db/schema"
import { parseCommunityJoinInput } from "@/lib/community/join-request"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 })
  }

  const parsed = parseCommunityJoinInput(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const session = await auth()

  const [request] = await db
    .insert(communityJoinRequests)
    .values({
      ...parsed.data,
      userId: session?.user?.id ?? null,
    })
    .returning()

  return NextResponse.json({ request }, { status: 201 })
}
