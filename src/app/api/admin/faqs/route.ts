import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { faqGroups, faqItems } from '@/shared/db/schema';
import { asc, eq } from 'drizzle-orm';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session };
};

const readSortOrder = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const groupExists = async (groupId: string) => {
  const [group] = await db
    .select({ id: faqGroups.id })
    .from(faqGroups)
    .where(eq(faqGroups.id, groupId))
    .limit(1);
  return !!group;
};

export const GET = async () => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const faqs = await db
    .select({
      id: faqItems.id,
      groupId: faqItems.groupId,
      groupName: faqGroups.name,
      question: faqItems.question,
      answer: faqItems.answer,
      sortOrder: faqItems.sortOrder,
      isPublished: faqItems.isPublished,
      createdAt: faqItems.createdAt,
      updatedAt: faqItems.updatedAt,
    })
    .from(faqItems)
    .innerJoin(faqGroups, eq(faqItems.groupId, faqGroups.id))
    .orderBy(asc(faqGroups.sortOrder), asc(faqItems.sortOrder), asc(faqItems.question));

  return NextResponse.json({ faqs });
};

export const POST = async (req: NextRequest) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { groupId, question, answer, sortOrder, isPublished } = body;

  if (typeof groupId !== 'string' || !groupId.trim()) {
    return NextResponse.json({ error: 'groupId required' }, { status: 400 });
  }
  const trimmedGroupId = groupId.trim();
  if (!(await groupExists(trimmedGroupId))) {
    return NextResponse.json({ error: 'group not found' }, { status: 400 });
  }
  if (typeof question !== 'string' || !question.trim()) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }
  if (typeof answer !== 'string' || !answer.trim()) {
    return NextResponse.json({ error: 'answer required' }, { status: 400 });
  }

  const [faq] = await db
    .insert(faqItems)
    .values({
      groupId: trimmedGroupId,
      question: question.trim(),
      answer: answer.trim(),
      sortOrder: readSortOrder(sortOrder),
      isPublished: isPublished === true,
    })
    .returning();

  return NextResponse.json({ faq }, { status: 201 });
};
