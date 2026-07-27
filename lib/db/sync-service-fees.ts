import { db } from "./index"
import { serviceFees } from "./schema"
import { SERVICE_FEE_ROWS } from "./service-fees"

export interface ServiceFeeSyncResult {
  upserted: number
  rows: { key: string; currency: string; amount: number; label: string; enabled: boolean; divideByPax: boolean }[]
}

// Bring service_fees in line with SERVICE_FEE_ROWS, and report what the table holds afterwards so
// a caller can prove the change landed.
//
// This upserts rather than ignoring conflicts. A deployed database already has rows for the older
// keys, so `onConflictDoNothing` would report success while leaving them as they were — that is
// how the stale room multipliers survived a release that was supposed to have replaced them.
//
// What it corrects is deliberately narrow. `label`, `currency` and `divideByPax` are catalogue
// facts owned by this code, so they are rewritten every run; a deployed row must not keep saying
// something the estimator no longer means. `amount` and `enabled` are written only when the row is
// created: both are admin-editable, and MUTHOWIF exists precisely so the admin can price it — a
// blanket upsert would reset the operator's own number the next time this ran. The read-back is
// how a wrong price is caught instead, by showing what the table actually holds.
export async function syncServiceFees(): Promise<ServiceFeeSyncResult> {
  const now = new Date()

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
      })
  }

  const rows = await db
    .select({
      key: serviceFees.key,
      currency: serviceFees.currency,
      amount: serviceFees.amount,
      label: serviceFees.label,
      enabled: serviceFees.enabled,
      divideByPax: serviceFees.divideByPax,
    })
    .from(serviceFees)

  return { upserted: SERVICE_FEE_ROWS.length, rows }
}
