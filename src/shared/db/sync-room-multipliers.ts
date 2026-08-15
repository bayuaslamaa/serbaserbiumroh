import { notInArray } from "drizzle-orm"
import { db } from "./index"
import { roomMultipliers } from "./schema"
import { ROOM_MULTIPLIER_ROWS, ROOM_TYPES } from "../estimate/room-types"

export interface RoomMultiplierSyncResult {
  upserted: number
  removed: string[]
  rows: { type: string; paxPerRoom: number; multiplier: string }[]
}

// Bring room_multipliers in line with ROOM_MULTIPLIER_ROWS, and report what the table holds
// afterwards so a caller can prove the change landed.
//
// This upserts instead of ignoring conflicts. A deployed database already has these rows, so
// `onConflictDoNothing` would leave stale multipliers untouched while reporting success — that is
// how the old per-person uplifts survived a release that was supposed to have replaced them.
// Retired types (SINGLE) are deleted for the same reason: leaving the row behind keeps a value in
// the table that no code path can produce but a stale saved estimate could still select.
export async function syncRoomMultipliers(): Promise<RoomMultiplierSyncResult> {
  for (const row of ROOM_MULTIPLIER_ROWS) {
    await db
      .insert(roomMultipliers)
      .values(row)
      .onConflictDoUpdate({
        target: roomMultipliers.type,
        set: {
          paxPerRoom: row.paxPerRoom,
          multiplier: row.multiplier,
          label: row.label,
          sublabel: row.sublabel,
        },
      })
  }

  const stale = await db
    .delete(roomMultipliers)
    .where(notInArray(roomMultipliers.type, ROOM_TYPES))
    .returning({ type: roomMultipliers.type })

  const rows = await db
    .select({
      type: roomMultipliers.type,
      paxPerRoom: roomMultipliers.paxPerRoom,
      multiplier: roomMultipliers.multiplier,
    })
    .from(roomMultipliers)

  return {
    upserted: ROOM_MULTIPLIER_ROWS.length,
    removed: stale.map((r) => r.type),
    rows,
  }
}
