import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/shared/db';
import { visitorLogs } from '@/shared/db/schema';
import { count, countDistinct, and, eq, gt } from 'drizzle-orm';

const getIpHash = (req: NextRequest): string => {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    '127.0.0.1';
  return createHash('sha256').update(ip).digest('hex');
};

const isPublicPath = (path: string): boolean => {
  const ignoredPrefixes = ['/admin', '/dashboard', '/login', '/api', '/_next', '/favicon.ico'];
  return !ignoredPrefixes.some((prefix) => path.startsWith(prefix));
};

export const POST = async (req: NextRequest) => {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const path = typeof body.path === 'string' ? body.path : '/';
  const userAgent = req.headers.get('user-agent') || null;

  if (isPublicPath(path)) {
    const ipHash = getIpHash(req);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    try {
      const existing = await db
        .select()
        .from(visitorLogs)
        .where(
          and(
            eq(visitorLogs.ipHash, ipHash),
            eq(visitorLogs.path, path),
            gt(visitorLogs.createdAt, fifteenMinutesAgo),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(visitorLogs).values({
          ipHash,
          userAgent,
          path,
        });
      }
    } catch (err) {
      console.error('Error logging visitor:', err);
    }
  }

  try {
    const [stats] = await db
      .select({
        totalViews: count(visitorLogs.id),
        uniqueVisitors: countDistinct(visitorLogs.ipHash),
      })
      .from(visitorLogs);

    return NextResponse.json({
      success: true,
      uniqueVisitors: stats?.uniqueVisitors || 0,
      totalViews: stats?.totalViews || 0,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data statistik' },
      { status: 500 },
    );
  }
};

export const GET = async () => {
  try {
    const [stats] = await db
      .select({
        totalViews: count(visitorLogs.id),
        uniqueVisitors: countDistinct(visitorLogs.ipHash),
      })
      .from(visitorLogs);

    return NextResponse.json({
      success: true,
      uniqueVisitors: stats?.uniqueVisitors || 0,
      totalViews: stats?.totalViews || 0,
    });
  } catch (err) {
    console.error('Error fetching stats via GET:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data statistik' },
      { status: 500 },
    );
  }
};
