import { NextResponse } from 'next/server';
import { and, desc, eq, ne, or, type SQL } from 'drizzle-orm';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { communityJoinRequests } from '@/shared/db/schema';
import type { RequestStatus } from '@/packages/community/admin-requests/domain/admin-requests-status';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Silakan login terlebih dahulu', status: 401 } as const;
  if (session.user.role !== 'ADMIN')
    return { error: 'Akses hanya untuk admin', status: 403 } as const;
  return { session };
};

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_PARTNERS = 50;

export type DuplicatePartner = {
  id: string;
  fullName: string;
  phone: string;
  socialUsername: string | null;
  status: RequestStatus;
  adminNote: string;
  createdAt: string;
  matchedByPhone: boolean;
  matchedBySocial: boolean;
};

export const GET = async (_req: Request, ctx: RouteCtx) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  const [request] = await db
    .select()
    .from(communityJoinRequests)
    .where(eq(communityJoinRequests.id, id))
    .limit(1);

  if (!request) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });

  const matchConditions: SQL[] = [
    eq(communityJoinRequests.normalizedPhone, request.normalizedPhone),
  ];

  if (request.normalizedSocialUsername) {
    matchConditions.push(
      eq(communityJoinRequests.normalizedSocialUsername, request.normalizedSocialUsername),
    );
  }

  const rows = await db
    .select()
    .from(communityJoinRequests)
    .where(
      and(
        ne(communityJoinRequests.id, request.id),
        matchConditions.length === 1 ? matchConditions[0] : or(...matchConditions)!,
      ),
    )
    .orderBy(desc(communityJoinRequests.createdAt))
    .limit(MAX_PARTNERS);

  const duplicates = rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    socialUsername: row.socialUsername,
    status: row.status,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    matchedByPhone: row.normalizedPhone === request.normalizedPhone,
    matchedBySocial:
      !!request.normalizedSocialUsername &&
      row.normalizedSocialUsername === request.normalizedSocialUsername,
  }));

  return NextResponse.json({ duplicates });
};
