import { resolveHotelSar } from '@/packages/estimate/domain/hotel-pricing';
import { FALLBACK_ROOM_TYPE, ROOM_TYPES } from '@/packages/estimate/domain/room-types';
import type {
  City,
  HotelOptionConfig,
  HotelPriceConfig,
  HotelTier,
  PricingConfig,
  RoomType,
} from '@/shared/types';

export const HARGA_HOTEL_TOOL_NAME = 'harga_hotel';

export type PriceBasis = 'catalogue_exact' | 'catalogue_quad_fallback' | 'estimate';

export interface ToolRate {
  month?: number;
  room_type: RoomType;
  priced_room_type: RoomType;
  sar_per_night: number;
  basis: PriceBasis;
  source: 'real' | 'estimate';
  room_type_priced: boolean;
  source_label: string;
}

export interface HargaHotelInput {
  hotel: string;
  months: number[];
  room_types?: RoomType[];
  city?: City;
}

export interface HargaHotelResult {
  found: boolean;
  hotel?: {
    id: string;
    city: City;
    tier: HotelTier;
    label: string;
    sublabel: string;
    distance: string;
  };
  rates: ToolRate[];
  not_found_reason?: string;
}

export const resolveToolRate = (
  config: Pick<HotelPriceConfig, 'sarPerNight' | 'monthlyPrices' | 'realMonthlyPrices'>,
  roomType: RoomType,
  month?: number,
): ToolRate => {
  const resolved = resolveHotelSar(config, roomType, month);

  const basis: PriceBasis =
    resolved.source === 'estimate'
      ? 'estimate'
      : resolved.roomTypePriced
        ? 'catalogue_exact'
        : 'catalogue_quad_fallback';

  return {
    ...(month != null ? { month } : {}),
    room_type: roomType,
    priced_room_type: basis === 'catalogue_quad_fallback' ? FALLBACK_ROOM_TYPE : roomType,
    sar_per_night: resolved.sarPerNight,
    basis,
    source: resolved.source,
    room_type_priced: resolved.roomTypePriced,
    source_label: resolved.sourceLabel,
  };
};

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const findHotel = (
  pricing: PricingConfig,
  input: HargaHotelInput,
): HotelOptionConfig | undefined => {
  const cities: City[] = input.city ? [input.city] : ['MADINAH', 'MAKKAH'];
  const candidates = cities.flatMap((city) => pricing.hotelOptions?.[city] ?? []);

  const byId = candidates.find((hotel) => hotel.id === input.hotel);
  if (byId) return byId;

  const needle = normalize(input.hotel);
  if (!needle) return undefined;
  return candidates.find((hotel) => {
    const haystack = normalize(`${hotel.label} ${hotel.sublabel}`);
    return haystack.includes(needle) || needle.includes(normalize(hotel.label));
  });
};

export const isValidMonth = (month: number | undefined): month is number => {
  return month != null && Number.isInteger(month) && month >= 1 && month <= 12;
};

const validMonths = (months: number[] | undefined): number[] => {
  const seen = new Set<number>();
  for (const month of months ?? []) {
    if (isValidMonth(month)) seen.add(month);
  }
  return [...seen].sort((a, b) => a - b);
};

const validRoomTypes = (roomTypes: RoomType[] | undefined): RoomType[] => {
  const seen = new Set<RoomType>();
  for (const roomType of roomTypes ?? []) {
    if (ROOM_TYPES.includes(roomType)) seen.add(roomType);
  }
  return seen.size > 0 ? [...seen] : [FALLBACK_ROOM_TYPE];
};

export const hargaHotel = (pricing: PricingConfig, input: HargaHotelInput): HargaHotelResult => {
  const hotel = findHotel(pricing, input);
  if (!hotel) {
    return {
      found: false,
      rates: [],
      not_found_reason: `Hotel "${input.hotel}" tidak ada di katalog${input.city ? ` ${input.city}` : ''}.`,
    };
  }

  const months = validMonths(input.months);
  const roomTypes = validRoomTypes(input.room_types);
  const rates = months.flatMap((month) =>
    roomTypes.map((roomType) => resolveToolRate(hotel, roomType, month)),
  );

  return {
    found: true,
    hotel: {
      id: hotel.id,
      city: hotel.city,
      tier: hotel.tier,
      label: hotel.label,
      sublabel: hotel.sublabel,
      distance: hotel.distance ?? '',
    },
    rates,
  };
};
