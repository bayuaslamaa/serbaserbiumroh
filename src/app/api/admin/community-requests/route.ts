import { NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { communityJoinRequests } from '@/shared/db/schema';
import {
  addDuplicateFlags,
  fetchDuplicateKeys,
} from '@/packages/community/admin-requests/domain/admin-requests';
import { desc } from 'drizzle-orm';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Silakan login terlebih dahulu', status: 401 } as const;
  if (session.user.role !== 'ADMIN')
    return { error: 'Akses hanya untuk admin', status: 403 } as const;
  return { session };
};

export const GET = async () => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [requests, duplicateKeys] = await Promise.all([
    db.select().from(communityJoinRequests).orderBy(desc(communityJoinRequests.createdAt)),
    fetchDuplicateKeys(),
  ]);

  return NextResponse.json({ requests: addDuplicateFlags(requests, duplicateKeys) });
};
