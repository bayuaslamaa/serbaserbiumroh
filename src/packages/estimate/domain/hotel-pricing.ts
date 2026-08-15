import { FALLBACK_ROOM_TYPE } from '@/packages/estimate/domain/room-types';
import type { HotelPriceConfig, RoomType } from '@/shared/types';

export const resolveHotelSar = (
  config: Pick<HotelPriceConfig, 'sarPerNight' | 'monthlyPrices' | 'realMonthlyPrices'>,
  roomType: RoomType,
  travelMonth?: number,
): {
  sarPerNight: number;
  source: 'real' | 'estimate';
  roomTypePriced: boolean;
  sourceLabel: string;
} => {
  if (travelMonth != null) {
    const realForMonth = config.realMonthlyPrices?.[travelMonth];

    const exact = realForMonth?.[roomType];
    if (exact != null) {
      return {
        sarPerNight: exact.sarPerNight,
        source: 'real',
        roomTypePriced: true,
        sourceLabel: exact.sourceLabel,
      };
    }

    const quad = realForMonth?.[FALLBACK_ROOM_TYPE];
    if (quad != null) {
      return {
        sarPerNight: quad.sarPerNight,
        source: 'real',
        roomTypePriced: false,
        sourceLabel: quad.sourceLabel,
      };
    }

    const monthly = config.monthlyPrices[travelMonth];
    if (monthly != null) {
      return { sarPerNight: monthly, source: 'estimate', roomTypePriced: false, sourceLabel: '' };
    }
  }
  return {
    sarPerNight: config.sarPerNight,
    source: 'estimate',
    roomTypePriced: false,
    sourceLabel: '',
  };
};

export const resolveMonthlyHotelSar = (
  config: Pick<HotelPriceConfig, 'sarPerNight' | 'monthlyPrices' | 'realMonthlyPrices'>,
  month?: number,
  roomType: RoomType = FALLBACK_ROOM_TYPE,
): number => {
  return resolveHotelSar(config, roomType, month).sarPerNight;
};

export const sarLabel = (amount: number): string => {
  return `SAR ${amount}/mlm`;
};
