import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { pilgrimStories } from '@/shared/db/schema';
import {
  PILGRIM_STORY_IMPORT_MAX_BYTES,
  PILGRIM_STORY_IMPORT_MAX_ROWS,
  parsePilgrimStoryCsv,
} from '@/packages/admin/domain/pilgrim-story-import';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session };
};

export const POST = async (req: NextRequest) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: { csv?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.csv !== 'string' || body.csv.trim().length === 0) {
    return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  }
  if (Buffer.byteLength(body.csv, 'utf8') > PILGRIM_STORY_IMPORT_MAX_BYTES) {
    return NextResponse.json(
      { error: `csv must be ${PILGRIM_STORY_IMPORT_MAX_BYTES} bytes or less` },
      { status: 413 },
    );
  }

  const existingStories = await db
    .select({ id: pilgrimStories.id, slug: pilgrimStories.slug })
    .from(pilgrimStories);
  const preview = parsePilgrimStoryCsv(body.csv, { existingStories });
  if (preview.rows.length > PILGRIM_STORY_IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `csv must contain ${PILGRIM_STORY_IMPORT_MAX_ROWS} rows or fewer` },
      { status: 413 },
    );
  }

  return NextResponse.json({ preview });
};
