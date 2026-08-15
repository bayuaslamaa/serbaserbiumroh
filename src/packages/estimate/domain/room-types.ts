import type { PricingConfig, RoomMultiplierConfig, RoomType } from '@/shared/types';

export const ROOM_TYPES: RoomType[] = ['QUINT', 'QUAD', 'TRIPLE', 'DOUBLE'];

export const ROOM_MULTIPLIER_ROWS = [
  { type: 'QUINT', paxPerRoom: 5, multiplier: '1.15', label: 'Quint', sublabel: '5 orang/kamar' },
  { type: 'QUAD', paxPerRoom: 4, multiplier: '1.0', label: 'Quad', sublabel: '4 orang/kamar' },
  { type: 'TRIPLE', paxPerRoom: 3, multiplier: '0.85', label: 'Triple', sublabel: '3 orang/kamar' },
  { type: 'DOUBLE', paxPerRoom: 2, multiplier: '0.7', label: 'Double', sublabel: '2 orang/kamar' },
] as const;

export const FALLBACK_ROOM_TYPE: RoomType = 'QUAD';

export const resolveRoomMultiplier = (
  pricing: PricingConfig,
  roomType: string | undefined,
): { roomType: RoomType; config: RoomMultiplierConfig; fellBack: boolean } => {
  const direct = roomType ? pricing.roomMultipliers[roomType as RoomType] : undefined;
  if (direct) return { roomType: roomType as RoomType, config: direct, fellBack: false };

  const fallback = pricing.roomMultipliers[FALLBACK_ROOM_TYPE];
  if (fallback) return { roomType: FALLBACK_ROOM_TYPE, config: fallback, fellBack: true };

  return {
    roomType: FALLBACK_ROOM_TYPE,
    config: { paxPerRoom: 4, multiplier: 1 },
    fellBack: true,
  };
};

export const availableRoomTypes = (pricing: PricingConfig): RoomType[] => {
  const present = ROOM_TYPES.filter((rt) => pricing.roomMultipliers[rt]);
  return present.length > 0 ? present : [FALLBACK_ROOM_TYPE];
};
