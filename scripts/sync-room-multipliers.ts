import { db } from "../src/shared/db"
import { roomMultipliers } from "../src/shared/db/schema"
import { syncRoomMultipliers } from "../src/shared/db/sync-room-multipliers"
import { ROOM_MULTIPLIER_ROWS } from "../src/packages/estimate/domain/room-types"

const main = async () => {
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
