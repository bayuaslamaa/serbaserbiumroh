/**
 * Bulk-import real hotel prices from a CSV into `real_hotel_prices`.
 *
 * Reuses the exact parse + apply logic as the admin endpoint
 * (lib/admin/real-hotel-pricing-import.ts), so behaviour matches the HTTP path —
 * but runs locally against DATABASE_URL, so no admin session/cookie is needed.
 *
 * Usage (via package.json, which loads .env.local):
 *   pnpm import:real-prices                          # dry-run on the default CSV
 *   pnpm import:real-prices <path.csv>               # dry-run on a specific CSV
 *   pnpm import:real-prices --source "Katalog X" --apply   # actually write
 *
 * Dry-run (default) prints matched hotels, unmatched rows, and per-row errors
 * WITHOUT touching the database. Add --apply (with --source) to persist.
 * Re-running is safe: writes upsert per (hotel, month).
 */
import { readFileSync } from "node:fs"
import { db } from "../src/shared/db"
import { hotelPrices } from "../src/shared/db/schema"
import { parseRealHotelPricingCsv, applyRealHotelPricing } from "../src/shared/admin/real-hotel-pricing-import"

const DEFAULT_CSV = "docs/data/real-hotel-prices-2027.csv"

function parseArgs(argv: string[]) {
  let csvPath = DEFAULT_CSV
  let source = ""
  let apply = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--apply") apply = true
    else if (a === "--source") source = argv[++i] ?? ""
    else if (a.startsWith("--source=")) source = a.slice("--source=".length)
    else if (!a.startsWith("--")) csvPath = a
  }
  return { csvPath, source: source.trim(), apply }
}

async function main() {
  const { csvPath, source, apply } = parseArgs(process.argv.slice(2))

  let csv: string
  try {
    csv = readFileSync(csvPath, "utf8")
  } catch {
    console.error(`✗ Cannot read CSV: ${csvPath}`)
    process.exit(1)
  }

  const existing = await db
    .select({
      id: hotelPrices.id,
      city: hotelPrices.city,
      tier: hotelPrices.tier,
      label: hotelPrices.label,
      importKey: hotelPrices.importKey,
    })
    .from(hotelPrices)

  const plan = parseRealHotelPricingCsv(csv, existing, source)

  console.log(`\nCSV: ${csvPath}`)
  console.log(`Hotels in DB: ${existing.length}`)

  if (plan.fileErrors.length > 0) {
    console.error(`\n✗ File errors (nothing importable):`)
    for (const e of plan.fileErrors) console.error(`  - ${e}`)
    process.exit(1)
  }

  console.log(
    `\nParsed ${plan.rowsParsed} rows -> ${plan.hotelsMatched} hotels matched, ` +
      `${plan.upserts.length} month-prices to write, ` +
      `${plan.unmatched.length} unmatched, ${plan.rowErrors.length} rows with errors.`
  )

  if (plan.unmatched.length > 0) {
    console.log(`\nUNMATCHED (label not found in DB — fix the CSV label to match, then re-run):`)
    for (const u of plan.unmatched) console.log(`  row ${u.rowNumber}: "${u.label}"`)
  }

  if (plan.rowErrors.length > 0) {
    console.log(`\nROW ERRORS (bad cells — that row's bad months are skipped):`)
    for (const r of plan.rowErrors) console.log(`  row ${r.rowNumber}: ${r.errors.join("; ")}`)
  }

  if (!apply) {
    console.log(`\nDRY RUN — nothing written. Re-run with --source "<catalog>" --apply to import.\n`)
    process.exit(0)
  }

  if (!source) {
    console.error(`\n✗ --apply requires --source "<catalog name>" (provenance for real_hotel_prices).\n`)
    process.exit(1)
  }

  const imported = await db.transaction((tx) => applyRealHotelPricing(tx, plan))
  console.log(`\n✓ Imported ${imported} month-prices for ${plan.hotelsMatched} hotels (source: "${source}").`)
  if (plan.unmatched.length > 0) {
    console.log(`  Note: ${plan.unmatched.length} unmatched rows were NOT imported (see above).`)
  }
  console.log()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
