import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { PILGRIM_STORY_IMPORT_TEMPLATE } from "@/lib/admin/pilgrim-story-import"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return new NextResponse(PILGRIM_STORY_IMPORT_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pilgrim-story-import-template.csv"',
    },
  })
}
