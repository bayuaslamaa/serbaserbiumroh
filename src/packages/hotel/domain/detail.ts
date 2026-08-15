import { asc, eq } from 'drizzle-orm';

import { db } from '@/shared/db';
import { exchangeRates, hotelListings, hotelMonthlyPrices, hotelPrices } from '@/shared/db/schema';
import { buildMonthlyPrices, type MonthlyPriceDetail } from './pricing';

const DEFAULT_SAR_TO_IDR = 4700;

export interface HotelDetail {
  id: string;
  slug: string;
  city: 'MAKKAH' | 'MADINAH';
  tier: 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM';
  label: string;
  sublabel: string;
  distance: string | null;
  sarPerNight: number;
  agodaUrl: string | null;
  bookingcomUrl: string | null;
  tripcomUrl: string | null;
  bookingUrl: string | null;
  monthlyPrices: MonthlyPriceDetail[];
  exchangeRate: number;
  editorial: { facilities: string; pilgrimNotes: string } | null;
}

type HotelPriceRow = typeof hotelPrices.$inferSelect;
type MonthlyRow = typeof hotelMonthlyPrices.$inferSelect;
type ListingRow = typeof hotelListings.$inferSelect;

export const composeHotelDetail = (
  hotel: HotelPriceRow,
  monthlyRows: MonthlyRow[],
  sarToIdrRate: number,
  listing: ListingRow | null,
): HotelDetail => {
  const overridesByMonth: Record<number, number> = {};
  for (const row of monthlyRows) {
    overridesByMonth[row.month] = row.sarPerNight;
  }

  const facilities = listing?.facilities?.trim() ?? '';
  const pilgrimNotes = listing?.pilgrimNotes?.trim() ?? '';
  const hasEditorial = Boolean(listing?.isPublished) && Boolean(facilities || pilgrimNotes);

  return {
    id: hotel.id,
    slug: hotel.slug!,
    city: hotel.city,
    tier: hotel.tier,
    label: hotel.label,
    sublabel: hotel.sublabel,
    distance: hotel.distance,
    sarPerNight: hotel.sarPerNight,
    agodaUrl: hotel.agodaUrl,
    bookingcomUrl: hotel.bookingcomUrl,
    tripcomUrl: hotel.tripcomUrl,
    bookingUrl: hotel.bookingUrl,
    monthlyPrices: buildMonthlyPrices(hotel.sarPerNight, overridesByMonth, sarToIdrRate),
    exchangeRate: sarToIdrRate,
    editorial: hasEditorial ? { facilities, pilgrimNotes } : null,
  };
};

export const getHotelDetailBySlug = async (slug: string): Promise<HotelDetail | null> => {
  const [hotel] = await db.select().from(hotelPrices).where(eq(hotelPrices.slug, slug)).limit(1);
  if (!hotel) return null;

  const [monthlyRows, rateRows, listingRows] = await Promise.all([
    db.select().from(hotelMonthlyPrices).where(eq(hotelMonthlyPrices.hotelPriceId, hotel.id)),
    db.select().from(exchangeRates).where(eq(exchangeRates.currency, 'SAR')),
    db.select().from(hotelListings).where(eq(hotelListings.slug, slug)).limit(1),
  ]);

  return composeHotelDetail(
    hotel,
    monthlyRows,
    rateRows[0]?.rateToIdr ?? DEFAULT_SAR_TO_IDR,
    listingRows[0] ?? null,
  );
};

export const getAllHotelSlugs = async (): Promise<string[]> => {
  try {
    const rows = await db
      .select({ slug: hotelPrices.slug })
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.slug));

    return rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug));
  } catch (error) {
    console.error('Could not read hotel slugs; falling back to on-demand rendering.', error);
    return [];
  }
};
