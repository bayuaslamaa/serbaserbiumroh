import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { pilgrimStories } from '@/shared/db/schema';
import {
  PILGRIM_STORY_IMPORT_MAX_BYTES,
  PILGRIM_STORY_IMPORT_MAX_ROWS,
  parsePilgrimStoryCsv,
  type PilgrimStoryImportRowResult,
} from '@/packages/admin/domain/pilgrim-story-import';
import { eq } from 'drizzle-orm';

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

  const writableRows = preview.rows.filter(
    (row) => row.status === 'create' || row.status === 'update',
  );
  const appliedRows: Array<{
    rowNumber: number;
    slug: string;
    status: 'create' | 'update';
    storyId: string;
  }> = [];

  if (writableRows.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of writableRows) {
        appliedRows.push(await applyImportRow(tx, row));
      }
    });
  }

  return NextResponse.json({ preview, applied: writableRows.length, appliedRows });
};

const applyImportRow = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  row: PilgrimStoryImportRowResult,
) => {
  if (!row.data) throw new Error('Cannot apply import row without parsed data');

  const now = new Date();
  const storyData = {
    slug: row.data.slug,
    authorName: row.data.authorName,
    departureCity: row.data.departureCity,
    travelMonth: row.data.travelMonth,
    travelYear: row.data.travelYear,
    pax: row.data.pax,
    hotelTier: row.data.hotelTier,
    airlineTier: row.data.airlineTier,
    makkahNights: row.data.makkahNights,
    madinahNights: row.data.madinahNights,
    totalBudgetIdr: row.data.totalBudgetIdr,
    narrative: row.data.narrative,
    isPublished: row.data.isPublished,
    isFeatured: row.data.isFeatured,
    updatedAt: now,
  };

  if (row.status === 'update' && row.existingStoryId) {
    await tx
      .update(pilgrimStories)
      .set(storyData)
      .where(eq(pilgrimStories.id, row.existingStoryId));

    return {
      rowNumber: row.rowNumber,
      slug: row.data.slug,
      status: 'update' as const,
      storyId: row.existingStoryId,
    };
  }

  const [created] = await tx.insert(pilgrimStories).values(storyData).returning();

  return {
    rowNumber: row.rowNumber,
    slug: row.data.slug,
    status: 'create' as const,
    storyId: created.id,
  };
};
