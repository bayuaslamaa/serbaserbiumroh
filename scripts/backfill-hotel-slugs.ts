/**
 * Backfill the `slug` column on `hotel_prices`.
 *
 * Every hotel needs a stable URL identity before /hotel-nusuk/[slug] can
 * exist. Rows that already have a slug are left alone -- rewriting one would
 * move a URL Google has already indexed.
 *
 * Usage (via package.json, which loads .env.local):
 *   pnpm backfill:hotel-slugs           # dry-run: print what would change
 *   pnpm backfill:hotel-slugs --apply   # actually write
 *
 * Safe to re-run: slug assignment is idempotent and ordered by importKey, so
 * a second run over its own output is a no-op.
 */
import { eq } from "drizzle-orm"

import { db } from "../src/shared/db"
import { hotelPrices } from "../src/shared/db/schema"
import { assignHotelSlugs } from "../src/shared/hotels/slug"

async function main() {
  const apply = process.argv.includes("--apply")

  const rows = await db
    .select({
      id: hotelPrices.id,
      importKey: hotelPrices.importKey,
      label: hotelPrices.label,
      slug: hotelPrices.slug,
    })
    .from(hotelPrices)

  if (rows.length === 0) {
    console.log("No hotel_prices rows found. Nothing to do.")
    return
  }

  const assignments = assignHotelSlugs(rows)
  const byImportKey = new Map(assignments.map((a) => [a.importKey, a.slug]))

  const changes = rows
    .filter((row) => !row.slug)
    .map((row) => ({ id: row.id, label: row.label, slug: byImportKey.get(row.importKey)! }))

  console.log(`${rows.length} hotels, ${rows.length - changes.length} already slugged.`)

  if (changes.length === 0) {
    console.log("Every hotel already has a slug. Nothing to do.")
    return
  }

  for (const change of changes) {
    console.log(`  ${change.label}  ->  ${change.slug}`)
  }

  const unique = new Set(assignments.map((a) => a.slug))
  if (unique.size !== assignments.length) {
    throw new Error(
      `Slug assignment produced duplicates (${assignments.length} rows, ${unique.size} unique). Refusing to write.`,
    )
  }

  if (!apply) {
    console.log(`\nDry run. ${changes.length} rows would be updated. Re-run with --apply to write.`)
    return
  }

  // All-or-nothing: a mid-loop unique violation (a concurrent admin create
  // taking a slug this run planned to use) would otherwise leave the table
  // half-populated, with no record of where it stopped.
  await db.transaction(async (tx) => {
    for (const change of changes) {
      await tx.update(hotelPrices).set({ slug: change.slug }).where(eq(hotelPrices.id, change.id))
    }
  })

  console.log(`\nUpdated ${changes.length} rows.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
