import type { PricingConfig, RoomMultiplierConfig, RoomType } from "@/types"

// Room types the app offers, widest occupancy first.
export const ROOM_TYPES: RoomType[] = ["QUINT", "QUAD", "TRIPLE", "DOUBLE"]

// Every deployment has a QUAD row — it is the basis `sarPerNight` is quoted in.
export const FALLBACK_ROOM_TYPE: RoomType = "QUAD"

// `pricing.roomMultipliers` is built from database rows, so a direct index is unsafe from two
// directions:
//   - the code may know a type the database has not been given yet (QUINT before its row ships),
//     so a hardcoded lookup dereferences undefined and takes down the whole render;
//   - a saved estimate carries whatever roomType was valid when it was written (e.g. SINGLE),
//     and that value is cast straight out of JSONB without re-validation on load.
// Both resolve to QUAD rather than throwing.
export function resolveRoomMultiplier(
  pricing: PricingConfig,
  roomType: string | undefined
): { roomType: RoomType; config: RoomMultiplierConfig; fellBack: boolean } {
  const direct = roomType ? pricing.roomMultipliers[roomType as RoomType] : undefined
  if (direct) return { roomType: roomType as RoomType, config: direct, fellBack: false }

  const fallback = pricing.roomMultipliers[FALLBACK_ROOM_TYPE]
  if (fallback) return { roomType: FALLBACK_ROOM_TYPE, config: fallback, fellBack: true }

  // No usable row at all. Return a neutral one-quad-room shape so the caller still renders: a
  // visibly plain quote beats a blank page, and the missing data is an operational problem the
  // estimator cannot fix at request time.
  return {
    roomType: FALLBACK_ROOM_TYPE,
    config: { paxPerRoom: 4, multiplier: 1 },
    fellBack: true,
  }
}

// Room types that this deployment can actually price. Pickers must offer only these — offering a
// type with no pricing row lets a user select something that cannot be costed.
export function availableRoomTypes(pricing: PricingConfig): RoomType[] {
  const present = ROOM_TYPES.filter((rt) => pricing.roomMultipliers[rt])
  return present.length > 0 ? present : [FALLBACK_ROOM_TYPE]
}
