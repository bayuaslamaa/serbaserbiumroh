/**
 * Sync room_multipliers to the canonical rows in lib/estimate/room-types.ts.
 *
 * Split from the seed on purpose: `pnpm seed` runs every seed block, which is not something you
 * want to point at a live database just to correct four pricing rows.
 *
 *   pnpm sync:room-multipliers            # show what the table holds now, change nothing
 *   pnpm sync:room-multipliers --apply    # upsert the rows, delete retired types, read back
 */
import { db } from "../lib/db"
import { roomMultipliers } from "../lib/db/schema"
import { syncRoomMultipliers } from "../lib/db/sync-room-multipliers"
import { ROOM_MULTIPLIER_ROWS } from "../lib/estimate/room-types"

async function main() {
  const apply = process.argv.includes("--apply")

  const before = await db.select().from(roomMultipliers)
  console.log("\nSEKARANG di database:")
  for (const r of before as { type: string; paxPerRoom: number; multiplier: string }[]) {
    console.log(`  ${r.type.padEnd(7)} paxPerRoom=${r.paxPerRoom}  multiplier=${r.multiplier}`)
  }

  console.log("\nAKAN menjadi:")
  for (const r of ROOM_MULTIPLIER_ROWS) {
    console.log(`  ${r.type.padEnd(7)} paxPerRoom=${r.paxPerRoom}  multiplier=${r.multiplier}`)
  }

  if (!apply) {
    console.log("\nDRY RUN — tidak ada yang ditulis. Jalankan dengan --apply untuk menerapkan.\n")
    process.exit(0)
  }

  const result = await syncRoomMultipliers()
  console.log(`\n✓ ${result.upserted} baris di-upsert.`)
  if (result.removed.length > 0) console.log(`✓ dihapus: ${result.removed.join(", ")}`)
  console.log("\nHASIL BACA BALIK:")
  for (const r of result.rows) {
    console.log(`  ${r.type.padEnd(7)} paxPerRoom=${r.paxPerRoom}  multiplier=${r.multiplier}`)
  }
  console.log()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
