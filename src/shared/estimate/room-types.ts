import type { PricingConfig, RoomMultiplierConfig, RoomType } from "@/shared/types"

// Room types the app offers, widest occupancy first.
export const ROOM_TYPES: RoomType[] = ["QUINT", "QUAD", "TRIPLE", "DOUBLE"]

// The canonical room_multipliers rows. Both the seed and the production sync script read this, so
// the two can never drift apart.
//
// `multiplier` is this room type's nightly rate DIVIDED BY a quad room's rate — NOT a per-person
// uplift. The cost formula already multiplies by roomCount (= ceil(pax / paxPerRoom)), which is
// what carries the occupancy math; a per-person uplift here would scale that same axis twice.
//
// Bigger room, higher nightly rate: quint > quad > triple > double. Per person this inverts, which
// is the expected shape — fewer people sharing a room each pay more:
//   4 pax quad   1 room × 1.00 ÷ 4 = 0.250 × rate
//   3 pax triple 1 room × 0.85 ÷ 3 = 0.283 × rate
//   2 pax double 1 room × 0.70 ÷ 2 = 0.350 × rate
//   5 pax quint  1 room × 1.15 ÷ 5 = 0.230 × rate
//
// These ratios are a starting point with the right ordering, NOT supplier-confirmed figures.
// Verify them against a real quote before quoting jamaah from them.
export const ROOM_MULTIPLIER_ROWS = [
  { type: "QUINT", paxPerRoom: 5, multiplier: "1.15", label: "Quint", sublabel: "5 orang/kamar" },
  { type: "QUAD", paxPerRoom: 4, multiplier: "1.0", label: "Quad", sublabel: "4 orang/kamar" },
  { type: "TRIPLE", paxPerRoom: 3, multiplier: "0.85", label: "Triple", sublabel: "3 orang/kamar" },
  { type: "DOUBLE", paxPerRoom: 2, multiplier: "0.7", label: "Double", sublabel: "2 orang/kamar" },
] as const

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
