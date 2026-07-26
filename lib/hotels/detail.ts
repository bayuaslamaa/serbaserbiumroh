import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { exchangeRates, hotelListings, hotelMonthlyPrices, hotelPrices } from "@/lib/db/schema"
import { buildMonthlyPrices, type MonthlyPriceDetail } from "./pricing"

const DEFAULT_SAR_TO_IDR = 4700

export interface HotelDetail {
  id: string
  slug: string
  city: "MAKKAH" | "MADINAH"
  tier: "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  label: string
  sublabel: string
  distance: string | null
  sarPerNight: number
  agodaUrl: string | null
  bookingcomUrl: string | null
  tripcomUrl: string | null
  bookingUrl: string | null
  monthlyPrices: MonthlyPriceDetail[]
  exchangeRate: number
  /**
   * Editorial overlay from hotel_listings, matched by slug. Null whenever no
   * published listing exists -- which is most of the time today, since that
   * table has only ever been written through the admin CMS and never read by
   * a public page. The detail page must render fully without it.
   */
  editorial: { facilities: string; pilgrimNotes: string } | null
}

type HotelPriceRow = typeof hotelPrices.$inferSelect
type MonthlyRow = typeof hotelMonthlyPrices.$inferSelect
type ListingRow = typeof hotelListings.$inferSelect

/**
 * Pure assembly step, kept separate from the queries so the overlay and
 * pricing rules can be tested without a database.
 */
export function composeHotelDetail(
  hotel: HotelPriceRow,
  monthlyRows: MonthlyRow[],
  sarToIdrRate: number,
  listing: ListingRow | null,
): HotelDetail {
  const overridesByMonth: Record<number, number> = {}
  for (const row of monthlyRows) {
    overridesByMonth[row.month] = row.sarPerNight
  }

  const facilities = listing?.facilities?.trim() ?? ""
  const pilgrimNotes = listing?.pilgrimNotes?.trim() ?? ""
  const hasEditorial = Boolean(listing?.isPublished) && Boolean(facilities || pilgrimNotes)

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
  }
}

export async function getHotelDetailBySlug(slug: string): Promise<HotelDetail | null> {
  const [hotel] = await db.select().from(hotelPrices).where(eq(hotelPrices.slug, slug)).limit(1)
  if (!hotel) return null

  const [monthlyRows, rateRows, listingRows] = await Promise.all([
    db.select().from(hotelMonthlyPrices).where(eq(hotelMonthlyPrices.hotelPriceId, hotel.id)),
    db.select().from(exchangeRates).where(eq(exchangeRates.currency, "SAR")),
    db.select().from(hotelListings).where(eq(hotelListings.slug, slug)).limit(1),
  ])

  return composeHotelDetail(
    hotel,
    monthlyRows,
    rateRows[0]?.rateToIdr ?? DEFAULT_SAR_TO_IDR,
    listingRows[0] ?? null,
  )
}

/**
 * Slugs for generateStaticParams and the sitemap.
 *
 * Returns an empty list rather than throwing when the database is
 * unreachable: this runs at build time, and a build without database access
 * should fall back to on-demand rendering, not fail the whole deploy.
 */
export async function getAllHotelSlugs(): Promise<string[]> {
  try {
    const rows = await db
      .select({ slug: hotelPrices.slug })
      .from(hotelPrices)
      .orderBy(asc(hotelPrices.slug))

    return rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug))
  } catch (error) {
    console.error("Could not read hotel slugs; falling back to on-demand rendering.", error)
    return []
  }
}
