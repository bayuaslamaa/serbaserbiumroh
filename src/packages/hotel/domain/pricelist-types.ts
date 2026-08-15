import type { City, HotelTier, RoomType } from '@/shared/types';

export const SOURCE_LABEL_NOT_RECORDED = 'Sumber tidak tercatat';

export interface PricelistRate {
  sarPerNight: number;
  sourceLabel: string;
}

export interface PricelistRow {
  hotelPriceId: string;
  city: City;
  tier: HotelTier;
  label: string;
  sublabel: string;
  distance: string | null;
  slug: string | null;
  month: number;
  roomType: string;
  sarPerNight: number;
  sourceLabel: string;
  updatedAt: Date;
}

export interface PricelistHotel {
  hotelPriceId: string;
  city: City;
  tier: HotelTier;
  label: string;
  sublabel: string;
  distance: string | null;
  slug: string | null;
  rates: Record<number, Partial<Record<RoomType, PricelistRate>>>;
  sourceLabels: string[];
  updatedAt: Date;
}

export const TIER_ORDER: HotelTier[] = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'];

export const CITY_ORDER: City[] = ['MAKKAH', 'MADINAH'];
