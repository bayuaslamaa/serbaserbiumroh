import { asc, eq } from 'drizzle-orm';

import { db, type DB } from '@/shared/db';
import { hotelPrices, realHotelPrices } from '@/shared/db/schema';
import { ROOM_TYPES } from '@/packages/estimate/domain/room-types';
import {
  CITY_ORDER,
  SOURCE_LABEL_NOT_RECORDED,
  TIER_ORDER,
  type PricelistHotel,
  type PricelistRow,
} from '@/packages/hotel/domain/pricelist-types';
import type { RoomType } from '@/shared/types';

export const composePricelist = (rows: PricelistRow[]): PricelistHotel[] => {
  const byHotel = new Map<string, PricelistHotel>();

  for (const row of rows) {
    const roomType = row.roomType as RoomType;
    if (!ROOM_TYPES.includes(roomType)) continue;

    if (!Number.isInteger(row.month) || row.month < 1 || row.month > 12) continue;

    let hotel = byHotel.get(row.hotelPriceId);
    if (!hotel) {
      hotel = {
        hotelPriceId: row.hotelPriceId,
        city: row.city,
        tier: row.tier,
        label: row.label,
        sublabel: row.sublabel,
        distance: row.distance,
        slug: row.slug,
        rates: {},
        sourceLabels: [],
        updatedAt: row.updatedAt,
      };
      byHotel.set(row.hotelPriceId, hotel);
    }

    const sourceLabel = row.sourceLabel.trim() || SOURCE_LABEL_NOT_RECORDED;

    if (!hotel.rates[row.month]) hotel.rates[row.month] = {};
    hotel.rates[row.month][roomType] = { sarPerNight: row.sarPerNight, sourceLabel };

    if (!hotel.sourceLabels.includes(sourceLabel)) hotel.sourceLabels.push(sourceLabel);
    if (row.updatedAt > hotel.updatedAt) hotel.updatedAt = row.updatedAt;
  }

  const hotels = [...byHotel.values()];
  for (const hotel of hotels) hotel.sourceLabels.sort((a, b) => a.localeCompare(b, 'id-ID'));

  return hotels.sort(
    (a, b) =>
      CITY_ORDER.indexOf(a.city) - CITY_ORDER.indexOf(b.city) ||
      TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
      a.label.localeCompare(b.label, 'id-ID'),
  );
};

export const fetchPricelistRows = async (database: DB = db): Promise<PricelistRow[]> => {
  return database
    .select({
      hotelPriceId: hotelPrices.id,
      city: hotelPrices.city,
      tier: hotelPrices.tier,
      label: hotelPrices.label,
      sublabel: hotelPrices.sublabel,
      distance: hotelPrices.distance,
      slug: hotelPrices.slug,
      month: realHotelPrices.month,
      roomType: realHotelPrices.roomType,
      sarPerNight: realHotelPrices.sarPerNight,
      sourceLabel: realHotelPrices.sourceLabel,
      updatedAt: realHotelPrices.updatedAt,
    })
    .from(realHotelPrices)
    .innerJoin(hotelPrices, eq(realHotelPrices.hotelPriceId, hotelPrices.id))
    .orderBy(asc(hotelPrices.label), asc(realHotelPrices.month));
};
