import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { submitCommunityJoin } from "@/packages/community/join/presentation/controller"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 })
  }

  const session = await auth()
  const result = await submitCommunityJoin({ input: body, userId: session?.user?.id ?? null })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ request: result.request }, { status: 201 })
}
