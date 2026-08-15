import { notInArray } from 'drizzle-orm';
import { SERVICE_KEYS } from '@/shared/types';
import { db } from './index';
import { serviceFees } from './schema';
import { SERVICE_FEE_ROWS } from './service-fees';

export interface ServiceFeeSyncResult {
  upserted: number;
  removed: string[];
  rows: {
    key: string;
    currency: string;
    amount: number;
    label: string;
    enabled: boolean;
    divideByPax: boolean;
  }[];
}

export const syncServiceFees = async (): Promise<ServiceFeeSyncResult> => {
  const now = new Date();

  for (const row of SERVICE_FEE_ROWS) {
    await db
      .insert(serviceFees)
      .values(row)
      .onConflictDoUpdate({
        target: serviceFees.key,
        set: {
          currency: row.currency,
          label: row.label,
          divideByPax: row.divideByPax,
          updatedAt: now,
        },
      });
  }

  const stale = await db
    .delete(serviceFees)
    .where(notInArray(serviceFees.key, [...SERVICE_KEYS]))
    .returning({ key: serviceFees.key });

  const rows = await db
    .select({
      key: serviceFees.key,
      currency: serviceFees.currency,
      amount: serviceFees.amount,
      label: serviceFees.label,
      enabled: serviceFees.enabled,
      divideByPax: serviceFees.divideByPax,
    })
    .from(serviceFees);

  return { upserted: SERVICE_FEE_ROWS.length, removed: stale.map((r) => r.key), rows };
};
