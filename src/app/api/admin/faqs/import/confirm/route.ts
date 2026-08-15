import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { faqGroups, faqItems } from '@/shared/db/schema';
import {
  FAQ_IMPORT_MAX_BYTES,
  FAQ_IMPORT_MAX_ROWS,
  normalizeFaqImportText,
  parseFaqCsv,
  type FaqImportRowResult,
} from '@/packages/admin/domain/faq-import';
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
  if (Buffer.byteLength(body.csv, 'utf8') > FAQ_IMPORT_MAX_BYTES) {
    return NextResponse.json(
      { error: `csv must be ${FAQ_IMPORT_MAX_BYTES} bytes or less` },
      { status: 413 },
    );
  }

  const [existingGroups, existingFaqs] = await Promise.all([
    db.select().from(faqGroups),
    db.select().from(faqItems),
  ]);
  const preview = parseFaqCsv(body.csv, { existingGroups, existingFaqs });
  if (preview.rows.length > FAQ_IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `csv must contain ${FAQ_IMPORT_MAX_ROWS} rows or fewer` },
      { status: 413 },
    );
  }

  const writableRows = preview.rows.filter(
    (row) => row.status === 'create' || row.status === 'update',
  );
  const appliedRows: Array<{
    rowNumber: number;
    status: 'create' | 'update';
    faqId: string;
    groupId: string;
    createdGroup: boolean;
  }> = [];

  if (writableRows.length > 0) {
    await db.transaction(async (tx) => {
      const groupsByKey = new Map(
        existingGroups.map((group) => [normalizeFaqImportText(group.name), group.id]),
      );

      for (const row of writableRows) {
        appliedRows.push(await applyImportRow(tx, row, groupsByKey));
      }
    });
  }

  return NextResponse.json({ preview, applied: writableRows.length, appliedRows });
};

const applyImportRow = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  row: FaqImportRowResult,
  groupsByKey: Map<string, string>,
) => {
  if (!row.data) throw new Error('Cannot apply import row without parsed data');

  const now = new Date();
  let createdGroup = false;
  let groupId = groupsByKey.get(row.data.groupKey);

  if (!groupId) {
    const [createdGroupRow] = await tx
      .insert(faqGroups)
      .values({
        name: row.data.groupName,
        sortOrder: 0,
        updatedAt: now,
      })
      .returning();
    groupId = createdGroupRow.id;
    groupsByKey.set(row.data.groupKey, groupId);
    createdGroup = true;
  }

  if (row.status === 'update' && row.existingFaqId) {
    await tx
      .update(faqItems)
      .set({
        groupId,
        question: row.data.question,
        answer: row.data.answer,
        updatedAt: now,
      })
      .where(eq(faqItems.id, row.existingFaqId));

    return {
      rowNumber: row.rowNumber,
      status: 'update' as const,
      faqId: row.existingFaqId,
      groupId,
      createdGroup,
    };
  }

  const [createdFaq] = await tx
    .insert(faqItems)
    .values({
      groupId,
      question: row.data.question,
      answer: row.data.answer,
      isPublished: false,
      sortOrder: 0,
      updatedAt: now,
    })
    .returning();

  return {
    rowNumber: row.rowNumber,
    status: 'create' as const,
    faqId: createdFaq.id,
    groupId,
    createdGroup,
  };
};
