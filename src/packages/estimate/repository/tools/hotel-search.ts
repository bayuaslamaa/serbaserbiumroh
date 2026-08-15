import { distanceScore } from '@/packages/estimate/domain/hotel-distance';
import { FALLBACK_ROOM_TYPE, ROOM_TYPES } from '@/packages/estimate/domain/room-types';
import {
  isValidMonth,
  resolveToolRate,
  type PriceBasis,
} from '@/packages/estimate/repository/tools/hotel-price';
import type { City, HotelTier, PricingConfig, RoomType } from '@/shared/types';

export const CARI_HOTEL_TOOL_NAME = 'cari_hotel';

export const CARI_HOTEL_DEFAULT_LIMIT = 8;
export const CARI_HOTEL_MAX_LIMIT = 25;

export interface CariHotelInput {
  city: City;
  month?: number;
  room_type?: RoomType;
  tier?: HotelTier;
  max_sar_per_night?: number;
  max_distance_meters?: number;
  require_real_price?: boolean;
  limit?: number;
}

export interface CariHotelRow {
  id: string;
  label: string;
  sublabel: string;
  tier: HotelTier;
  distance: string;
  distance_meters: number;
  sar_per_night: number;
  room_type: RoomType;
  priced_room_type: RoomType;
  basis: PriceBasis;
  source: 'real' | 'estimate';
  room_type_priced: boolean;
  source_label: string;
}

export interface CariHotelResult {
  city: City;
  month?: number;
  room_type: RoomType;
  total_matches: number;
  truncated: boolean;
  rows: CariHotelRow[];
}

export const cariHotel = (pricing: PricingConfig, input: CariHotelInput): CariHotelResult => {
  const roomType =
    input.room_type && ROOM_TYPES.includes(input.room_type) ? input.room_type : FALLBACK_ROOM_TYPE;
  const month = isValidMonth(input.month) ? input.month : undefined;
  const limit = Math.min(
    Math.max(Math.trunc(input.limit ?? CARI_HOTEL_DEFAULT_LIMIT), 1),
    CARI_HOTEL_MAX_LIMIT,
  );

  const options = pricing.hotelOptions?.[input.city] ?? [];

  const matches = options
    .filter((hotel) => (input.tier ? hotel.tier === input.tier : true))
    .map((hotel) => {
      const rate = resolveToolRate(hotel, roomType, month);
      const row: CariHotelRow = {
        id: hotel.id,
        label: hotel.label,
        sublabel: hotel.sublabel,
        tier: hotel.tier,
        distance: hotel.distance ?? '',
        distance_meters: distanceScore(hotel),
        sar_per_night: rate.sar_per_night,
        room_type: rate.room_type,
        priced_room_type: rate.priced_room_type,
        basis: rate.basis,
        source: rate.source,
        room_type_priced: rate.room_type_priced,
        source_label: rate.source_label,
      };
      return row;
    })
    .filter((row) =>
      input.max_sar_per_night != null ? row.sar_per_night <= input.max_sar_per_night : true,
    )
    .filter((row) =>
      input.max_distance_meters != null ? row.distance_meters <= input.max_distance_meters : true,
    )
    .filter((row) => (input.require_real_price ? row.basis !== 'estimate' : true))
    .sort((a, b) => {
      if (a.sar_per_night !== b.sar_per_night) return a.sar_per_night - b.sar_per_night;
      if (a.distance_meters !== b.distance_meters) return a.distance_meters - b.distance_meters;
      return a.id.localeCompare(b.id);
    });

  return {
    city: input.city,
    ...(month != null ? { month } : {}),
    room_type: roomType,
    total_matches: matches.length,
    truncated: matches.length > limit,
    rows: matches.slice(0, limit),
  };
};
