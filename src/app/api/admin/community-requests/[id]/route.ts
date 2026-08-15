import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { communityJoinRequests } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const STATUSES = ['NEW', 'MATCHED', 'REJECTED'] as const;

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Silakan login terlebih dahulu', status: 401 } as const;
  if (session.user.role !== 'ADMIN')
    return { error: 'Akses hanya untuk admin', status: 403 } as const;
  return { session };
};

type RouteCtx = { params: Promise<{ id: string }> };

export const PATCH = async (req: NextRequest, ctx: RouteCtx) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
  }

  const updateData: Partial<typeof communityJoinRequests.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !STATUSES.includes(body.status as (typeof STATUSES)[number])
    ) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }
    updateData.status = body.status as (typeof STATUSES)[number];
  }

  if (body.adminNote !== undefined) {
    if (typeof body.adminNote !== 'string') {
      return NextResponse.json({ error: 'Catatan admin harus berupa teks' }, { status: 400 });
    }
    updateData.adminNote = body.adminNote.trim();
  }

  const [request] = await db
    .update(communityJoinRequests)
    .set(updateData)
    .where(eq(communityJoinRequests.id, id))
    .returning();

  if (!request) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });

  return NextResponse.json({ request });
};
