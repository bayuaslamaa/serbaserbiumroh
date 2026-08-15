import { asc, eq } from 'drizzle-orm';
import { db } from '@/shared/db';
import { faqGroups, faqItems } from '@/shared/db/schema';

export type PublishedFaqItem = {
  id: string;
  groupId: string;
  groupName: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type PublishedFaqGroup = {
  id: string;
  name: string;
  sortOrder: number;
  items: PublishedFaqItem[];
};

const groupPublishedFaqs = (
  groups: Array<{ id: string; name: string; sortOrder: number }>,
  items: PublishedFaqItem[],
): PublishedFaqGroup[] => {
  const byGroup = new Map(
    groups.map((group) => [
      group.id,
      {
        ...group,
        items: [] as PublishedFaqItem[],
      },
    ]),
  );

  for (const item of items) {
    byGroup.get(item.groupId)?.items.push(item);
  }

  return Array.from(byGroup.values()).filter((group) => group.items.length > 0);
};

export const getPublishedFaqGroups = async (): Promise<PublishedFaqGroup[]> => {
  const [groups, items] = await Promise.all([
    db.select().from(faqGroups).orderBy(asc(faqGroups.sortOrder), asc(faqGroups.name)),
    db
      .select({
        id: faqItems.id,
        groupId: faqItems.groupId,
        groupName: faqGroups.name,
        question: faqItems.question,
        answer: faqItems.answer,
        sortOrder: faqItems.sortOrder,
      })
      .from(faqItems)
      .innerJoin(faqGroups, eq(faqItems.groupId, faqGroups.id))
      .where(eq(faqItems.isPublished, true))
      .orderBy(
        asc(faqGroups.sortOrder),
        asc(faqGroups.name),
        asc(faqItems.sortOrder),
        asc(faqItems.question),
      ),
  ]);

  return groupPublishedFaqs(groups, items);
};

export const getPublishedFaqPreview = async (limit = 7): Promise<PublishedFaqItem[]> => {
  return db
    .select({
      id: faqItems.id,
      groupId: faqItems.groupId,
      groupName: faqGroups.name,
      question: faqItems.question,
      answer: faqItems.answer,
      sortOrder: faqItems.sortOrder,
    })
    .from(faqItems)
    .innerJoin(faqGroups, eq(faqItems.groupId, faqGroups.id))
    .where(eq(faqItems.isPublished, true))
    .orderBy(
      asc(faqGroups.sortOrder),
      asc(faqGroups.name),
      asc(faqItems.sortOrder),
      asc(faqItems.question),
    )
    .limit(limit);
};
