import { unstable_cache } from 'next/cache';
import { countDistinct } from 'drizzle-orm';
import { db } from '@/shared/db';
import { visitorLogs } from '@/shared/db/schema';

const VISITOR_COUNT_TTL_SECONDS = 60;

const readVisitorCount = unstable_cache(
  async (): Promise<number> => {
    const [stats] = await db
      .select({ uniqueVisitors: countDistinct(visitorLogs.ipHash) })
      .from(visitorLogs);

    return stats?.uniqueVisitors ?? 0;
  },
  ['public-visitor-count'],
  { revalidate: VISITOR_COUNT_TTL_SECONDS },
);

export const getPublicVisitorCount = async (): Promise<number | null> => {
  try {
    return await readVisitorCount();
  } catch (err) {
    console.error('Error reading visitor count:', err);
    return null;
  }
};
