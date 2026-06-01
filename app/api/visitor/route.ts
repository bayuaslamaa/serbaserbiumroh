import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { visitorLogs } from "@/lib/db/schema"
import { count, countDistinct, and, eq, gt } from "drizzle-orm"

// Helper function to hash IP address for privacy
function getIpHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  return createHash("sha256").update(ip).digest("hex")
}

// Check if route matches blacklist or public patterns
function isPublicPath(path: string): boolean {
  // Ignore admin, dashboard, login, api routes, and static assets
  const ignoredPrefixes = ["/admin", "/dashboard", "/login", "/api", "/_next", "/favicon.ico"]
  return !ignoredPrefixes.some((prefix) => path.startsWith(prefix))
}

// POST: Track page view and return stats
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // Body is empty or malformed, default to empty
  }

  const path = typeof body.path === "string" ? body.path : "/"
  const userAgent = req.headers.get("user-agent") || null

  if (isPublicPath(path)) {
    const ipHash = getIpHash(req)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

    try {
      // Prevent spam: Check if this IP has visited this path in the last 15 minutes
      const existing = await db
        .select()
        .from(visitorLogs)
        .where(
          and(
            eq(visitorLogs.ipHash, ipHash),
            eq(visitorLogs.path, path),
            gt(visitorLogs.createdAt, fifteenMinutesAgo)
          )
        )
        .limit(1)

      if (existing.length === 0) {
        await db.insert(visitorLogs).values({
          ipHash,
          userAgent,
          path,
        })
      }
    } catch (err) {
      // Log error but don't fail the request (resilient tracking)
      console.error("Error logging visitor:", err)
    }
  }

  // Fetch updated stats
  try {
    const [stats] = await db
      .select({
        totalViews: count(visitorLogs.id),
        uniqueVisitors: countDistinct(visitorLogs.ipHash),
      })
      .from(visitorLogs)

    return NextResponse.json({
      success: true,
      uniqueVisitors: stats?.uniqueVisitors || 0,
      totalViews: stats?.totalViews || 0,
    })
  } catch (err) {
    console.error("Error fetching stats:", err)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data statistik" },
      { status: 500 }
    )
  }
}

// GET: Retrieve stats without logging a view
export async function GET() {
  try {
    const [stats] = await db
      .select({
        totalViews: count(visitorLogs.id),
        uniqueVisitors: countDistinct(visitorLogs.ipHash),
      })
      .from(visitorLogs)

    return NextResponse.json({
      success: true,
      uniqueVisitors: stats?.uniqueVisitors || 0,
      totalViews: stats?.totalViews || 0,
    })
  } catch (err) {
    console.error("Error fetching stats via GET:", err)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data statistik" },
      { status: 500 }
    )
  }
}
