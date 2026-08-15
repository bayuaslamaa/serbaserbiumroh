import { parse } from 'csv-parse/sync';
import type { DB } from '@/shared/db';
import { realHotelPrices } from '@/shared/db/schema';
import { ROOM_TYPES } from '@/packages/estimate/domain/room-types';
import type { City, HotelTier, RoomType } from '@/shared/types';
import {
  MONTH_COLUMNS,
  normalizeHotelPricingImportKey,
  parsePositiveInteger,
} from './hotel-pricing-import';

const CITIES: City[] = ['MAKKAH', 'MADINAH'];
const TIERS: HotelTier[] = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'];
const REQUIRED_HEADERS = ['city', 'tier', 'label'] as const;

const DEFAULT_ROOM_TYPE: RoomType = 'QUAD';

export interface ExistingHotelRef {
  id: string;
  city: City;
  tier: HotelTier;
  label: string;
  importKey?: string | null;
}

export interface RealPriceUpsert {
  hotelPriceId: string;
  month: number;
  roomType: RoomType;
  sarPerNight: number;
  sourceLabel: string;
}

export interface RealPricingImportPlan {
  rowsParsed: number;
  upserts: RealPriceUpsert[];
  hotelsMatched: number;
  unmatched: Array<{ rowNumber: number; label: string }>;
  rowErrors: Array<{ rowNumber: number; errors: string[] }>;
  fileErrors: string[];
}

const EMPTY_PLAN = (fileErrors: string[]): RealPricingImportPlan => ({
  rowsParsed: 0,
  upserts: [],
  hotelsMatched: 0,
  unmatched: [],
  rowErrors: [],
  fileErrors,
});

export const parseRealHotelPricingCsv = (
  csvText: string,
  existingHotels: ExistingHotelRef[],
  sourceLabel: string,
): RealPricingImportPlan => {
  const headers = new Set<string>();
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      bom: true,
      columns: (raw: string[]) => {
        const trimmed = raw.map((h) => h.trim());
        for (const h of trimmed) headers.add(h);
        return trimmed;
      },
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    return EMPTY_PLAN([error instanceof Error ? error.message : 'CSV could not be parsed']);
  }

  const fileErrors: string[] = [];
  for (const header of REQUIRED_HEADERS) {
    if (!headers.has(header)) fileErrors.push(`Missing required header: ${header}`);
  }
  if (fileErrors.length > 0) return EMPTY_PLAN(fileErrors);

  const existingByKey = new Map<string, ExistingHotelRef>();
  for (const hotel of existingHotels) {
    existingByKey.set(hotel.importKey ?? normalizeHotelPricingImportKey(hotel), hotel);
  }

  const upsertsByKey = new Map<string, RealPriceUpsert>();
  const matched = new Set<string>();
  const unmatched: Array<{ rowNumber: number; label: string }> = [];
  const rowErrors: Array<{ rowNumber: number; errors: string[] }> = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const city = (record.city ?? '').trim().toUpperCase() as City;
    const tier = (record.tier ?? '').trim().toUpperCase() as HotelTier;
    const label = (record.label ?? '').trim();
    const rawRoomType = (record.room_type ?? '').trim();

    const errors: string[] = [];
    if (!CITIES.includes(city)) errors.push(`invalid city "${record.city ?? ''}"`);
    if (!TIERS.includes(tier)) errors.push(`invalid tier "${record.tier ?? ''}"`);
    if (!label) errors.push('label is required');

    const roomType =
      rawRoomType === '' ? DEFAULT_ROOM_TYPE : (rawRoomType.toUpperCase() as RoomType);
    if (!ROOM_TYPES.includes(roomType)) errors.push(`invalid room_type "${rawRoomType}"`);

    if (errors.length > 0) {
      rowErrors.push({ rowNumber, errors });
      return;
    }

    const existing = existingByKey.get(normalizeHotelPricingImportKey({ city, tier, label }));
    if (!existing) {
      unmatched.push({ rowNumber, label });
      return;
    }

    let monthCount = 0;
    for (const { month, column } of MONTH_COLUMNS) {
      const cell = (record[column] ?? '').trim();
      if (cell === '') continue;
      const sar = parsePositiveInteger(cell);
      if (sar == null) {
        errors.push(`invalid ${column} "${cell}"`);
        continue;
      }
      upsertsByKey.set(`${existing.id}:${month}:${roomType}`, {
        hotelPriceId: existing.id,
        month,
        roomType,
        sarPerNight: sar,
        sourceLabel,
      });
      matched.add(existing.id);
      monthCount++;
    }

    if (errors.length > 0) rowErrors.push({ rowNumber, errors });
    else if (monthCount === 0)
      rowErrors.push({ rowNumber, errors: ['no real month prices provided'] });
  });

  return {
    rowsParsed: records.length,
    upserts: [...upsertsByKey.values()],
    hotelsMatched: matched.size,
    unmatched,
    rowErrors,
    fileErrors: [],
  };
};

type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

export const applyRealHotelPricing = async (
  tx: Tx,
  plan: RealPricingImportPlan,
): Promise<number> => {
  if (plan.upserts.length === 0) return 0;
  const now = new Date();
  for (const u of plan.upserts) {
    await tx
      .insert(realHotelPrices)
      .values({
        hotelPriceId: u.hotelPriceId,
        month: u.month,
        roomType: u.roomType,
        sarPerNight: u.sarPerNight,
        sourceLabel: u.sourceLabel,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [realHotelPrices.hotelPriceId, realHotelPrices.month, realHotelPrices.roomType],
        set: { sarPerNight: u.sarPerNight, sourceLabel: u.sourceLabel, updatedAt: now },
      });
  }
  return plan.upserts.length;
};
