import { notInArray } from 'drizzle-orm';
import { db } from './index';
import { roomMultipliers } from './schema';
import { ROOM_MULTIPLIER_ROWS, ROOM_TYPES } from '@/packages/estimate/domain/room-types';

export interface RoomMultiplierSyncResult {
  upserted: number;
  removed: string[];
  rows: { type: string; paxPerRoom: number; multiplier: string }[];
}

export const syncRoomMultipliers = async (): Promise<RoomMultiplierSyncResult> => {
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
      });
  }

  const stale = await db
    .delete(roomMultipliers)
    .where(notInArray(roomMultipliers.type, ROOM_TYPES))
    .returning({ type: roomMultipliers.type });

  const rows = await db
    .select({
      type: roomMultipliers.type,
      paxPerRoom: roomMultipliers.paxPerRoom,
      multiplier: roomMultipliers.multiplier,
    })
    .from(roomMultipliers);

  return {
    upserted: ROOM_MULTIPLIER_ROWS.length,
    removed: stale.map((r) => r.type),
    rows,
  };
};
