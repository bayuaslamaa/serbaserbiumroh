import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  serviceFees,
  hotelMonthlyPrices,
  airlineMonthlyPrices,
} from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { normalizeHotelPricingImportKey } from '@/packages/admin/domain/hotel-pricing-import';
import { normalizeAirlinePricingImportKey } from '@/packages/admin/domain/airline-pricing-import';
import { nextAvailableSlug } from '@/packages/hotel/domain/slug';
import { SERVICE_KEYS, type ServiceKey } from '@/shared/types';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session };
};

const CITIES = ['MAKKAH', 'MADINAH'];
const HOTEL_TIERS = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'];
const AIRLINE_TIERS = ['BUDGET', 'STANDARD', 'GARUDA', 'BUSINESS'];
const HOTEL_URL_FIELDS = ['agodaUrl', 'bookingcomUrl', 'tripcomUrl', 'bookingUrl'] as const;

const normalizeOptionalUrl = (
  value: unknown,
): { provided: boolean; valid: boolean; value: string | null } => {
  if (value === undefined) return { provided: false, valid: true, value: null };
  if (value === null) return { provided: true, valid: true, value: null };
  if (typeof value !== 'string') return { provided: true, valid: false, value: null };

  const normalized = value.trim();
  if (!normalized) return { provided: true, valid: true, value: null };

  try {
    const parsed = new URL(normalized);
    return {
      provided: true,
      valid: parsed.protocol === 'http:' || parsed.protocol === 'https:',
      value: parsed.protocol === 'http:' || parsed.protocol === 'https:' ? normalized : null,
    };
  } catch {
    return { provided: true, valid: false, value: null };
  }
};

type RouteCtx = { params: Promise<{ category: string }> };

export const POST = async (req: NextRequest, ctx: RouteCtx) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { category } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const now = new Date();

  if (category === 'hotel') {
    const {
      city,
      tier,
      label,
      sublabel,
      distance,
      sarPerNight,
      agodaUrl,
      bookingcomUrl,
      tripcomUrl,
      bookingUrl,
    } = body;
    if (!CITIES.includes(city as string)) {
      return NextResponse.json({ error: 'invalid city' }, { status: 400 });
    }
    if (!HOTEL_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
    }
    if (typeof label !== 'string' || !label.trim()) {
      return NextResponse.json({ error: 'label required' }, { status: 400 });
    }
    if (typeof sublabel !== 'string') {
      return NextResponse.json({ error: 'sublabel required' }, { status: 400 });
    }
    if (distance !== undefined && distance !== null && typeof distance !== 'string') {
      return NextResponse.json({ error: 'distance must be a string' }, { status: 400 });
    }
    const normalizedAgodaUrl = normalizeOptionalUrl(agodaUrl);
    if (!normalizedAgodaUrl.valid) {
      return NextResponse.json(
        { error: 'agodaUrl must be a valid http/https URL' },
        { status: 400 },
      );
    }
    const normalizedBookingcomUrl = normalizeOptionalUrl(bookingcomUrl);
    if (!normalizedBookingcomUrl.valid) {
      return NextResponse.json(
        { error: 'bookingcomUrl must be a valid http/https URL' },
        { status: 400 },
      );
    }
    const normalizedTripcomUrl = normalizeOptionalUrl(tripcomUrl);
    if (!normalizedTripcomUrl.valid) {
      return NextResponse.json(
        { error: 'tripcomUrl must be a valid http/https URL' },
        { status: 400 },
      );
    }
    const normalizedBookingUrl = normalizeOptionalUrl(bookingUrl);
    if (!normalizedBookingUrl.valid) {
      return NextResponse.json(
        { error: 'bookingUrl must be a valid http/https URL' },
        { status: 400 },
      );
    }
    if (typeof sarPerNight !== 'number' || sarPerNight <= 0) {
      return NextResponse.json({ error: 'sarPerNight must be a positive number' }, { status: 400 });
    }

    const { hotel, monthlyPrices } = await db.transaction(async (tx) => {
      const existingSlugs = await tx.select({ slug: hotelPrices.slug }).from(hotelPrices);
      const slug = nextAvailableSlug(
        label.trim(),
        existingSlugs.map((row) => row.slug).filter((s): s is string => Boolean(s)),
      );

      const [created] = await tx
        .insert(hotelPrices)
        .values({
          city: city as 'MAKKAH' | 'MADINAH',
          tier: tier as 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM',
          slug,
          label: label.trim(),
          sublabel: sublabel.trim(),
          distance: typeof distance === 'string' && distance.trim() ? distance.trim() : null,
          agodaUrl: normalizedAgodaUrl.value,
          bookingcomUrl: normalizedBookingcomUrl.value,
          tripcomUrl: normalizedTripcomUrl.value,
          bookingUrl: normalizedBookingUrl.value,
          importKey: normalizeHotelPricingImportKey({
            city: city as 'MAKKAH' | 'MADINAH',
            tier: tier as 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM',
            label: label.trim(),
          }),
          sarPerNight,
          updatedAt: now,
        })
        .returning();

      const monthlyRows = Array.from({ length: 12 }, (_, i) => ({
        hotelPriceId: created.id,
        month: i + 1,
        sarPerNight,
        updatedAt: now,
      }));
      const created_monthly = await tx.insert(hotelMonthlyPrices).values(monthlyRows).returning();

      return { hotel: created, monthlyPrices: created_monthly };
    });

    return NextResponse.json({ hotel, monthlyPrices }, { status: 201 });
  }

  if (category === 'airline') {
    const { tier, label, sublabel, idr, isDefault } = body;
    if (!AIRLINE_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
    }
    if (typeof label !== 'string' || !label.trim()) {
      return NextResponse.json({ error: 'label required' }, { status: 400 });
    }
    if (typeof sublabel !== 'string') {
      return NextResponse.json({ error: 'sublabel required' }, { status: 400 });
    }
    if (typeof idr !== 'number' || idr <= 0) {
      return NextResponse.json({ error: 'idr must be a positive number' }, { status: 400 });
    }

    const importKey = normalizeAirlinePricingImportKey({
      tier: tier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS',
      label: label.trim(),
    });
    const shouldBeDefault = typeof isDefault === 'boolean' ? isDefault : false;

    const result = await db.transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx
          .update(airlinePrices)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(airlinePrices.tier, tier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS'));
      }

      const [airline] = await tx
        .insert(airlinePrices)
        .values({
          tier: tier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS',
          label: label.trim(),
          sublabel: sublabel.trim(),
          importKey,
          idr,
          isDefault: shouldBeDefault,
          updatedAt: now,
        })
        .returning();

      const monthlyRows = Array.from({ length: 12 }, (_, i) => ({
        airlinePriceId: airline.id,
        month: i + 1,
        idr,
        updatedAt: now,
      }));
      const monthlyPrices = await tx.insert(airlineMonthlyPrices).values(monthlyRows).returning();

      return { airline, monthlyPrices };
    });

    return NextResponse.json(result, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
};

export const PATCH = async (req: NextRequest, ctx: RouteCtx) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { category } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const now = new Date();

  if (category === 'rates') {
    const { currency, rateToIdr } = body;
    if (typeof currency !== 'string')
      return NextResponse.json({ error: 'currency required' }, { status: 400 });
    if (typeof rateToIdr !== 'number' || rateToIdr <= 0) {
      return NextResponse.json({ error: 'rateToIdr must be a positive number' }, { status: 400 });
    }
    const [updated] = await db
      .update(exchangeRates)
      .set({ rateToIdr, updatedBy: session.user.id, updatedAt: now })
      .where(eq(exchangeRates.currency, currency))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });
    return NextResponse.json({ rate: updated });
  }

  if (category === 'hotel') {
    const {
      hotelId,
      city,
      tier,
      sarPerNight,
      label,
      sublabel,
      distance,
      agodaUrl,
      bookingcomUrl,
      tripcomUrl,
      bookingUrl,
    } = body;
    if (!CITIES.includes(city as string)) {
      return NextResponse.json({ error: 'invalid city' }, { status: 400 });
    }
    if (!HOTEL_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
    }
    if (typeof sarPerNight !== 'number' || sarPerNight <= 0) {
      return NextResponse.json({ error: 'sarPerNight must be a positive number' }, { status: 400 });
    }
    if (label !== undefined && (typeof label !== 'string' || !label.trim())) {
      return NextResponse.json({ error: 'label required' }, { status: 400 });
    }
    if (sublabel !== undefined && typeof sublabel !== 'string') {
      return NextResponse.json({ error: 'sublabel required' }, { status: 400 });
    }
    if (distance !== undefined && distance !== null && typeof distance !== 'string') {
      return NextResponse.json({ error: 'distance must be a string' }, { status: 400 });
    }
    const urlUpdates = {
      agodaUrl: normalizeOptionalUrl(agodaUrl),
      bookingcomUrl: normalizeOptionalUrl(bookingcomUrl),
      tripcomUrl: normalizeOptionalUrl(tripcomUrl),
      bookingUrl: normalizeOptionalUrl(bookingUrl),
    };
    for (const field of HOTEL_URL_FIELDS) {
      if (!urlUpdates[field].valid) {
        return NextResponse.json(
          { error: `${field} must be a valid http/https URL` },
          { status: 400 },
        );
      }
    }
    const updates: Partial<typeof hotelPrices.$inferInsert> & { updatedAt: Date } = {
      sarPerNight,
      updatedAt: now,
    };
    if (typeof label === 'string') {
      updates.label = label.trim();
      updates.importKey = normalizeHotelPricingImportKey({
        city: city as 'MAKKAH' | 'MADINAH',
        tier: tier as 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM',
        label: label.trim(),
      });
    }
    if (typeof sublabel === 'string') updates.sublabel = sublabel.trim();
    if (distance !== undefined) {
      updates.distance = typeof distance === 'string' && distance.trim() ? distance.trim() : null;
    }
    for (const field of HOTEL_URL_FIELDS) {
      const normalized = urlUpdates[field];
      if (normalized.provided) {
        updates[field] = normalized.value;
      }
    }
    const [updated] = await db
      .update(hotelPrices)
      .set(updates)
      .where(
        typeof hotelId === 'string' && hotelId
          ? eq(hotelPrices.id, hotelId)
          : and(
              eq(hotelPrices.city, city as 'MAKKAH' | 'MADINAH'),
              eq(hotelPrices.tier, tier as 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM'),
            ),
      )
      .returning();
    if (!updated) return NextResponse.json({ error: 'Hotel price not found' }, { status: 404 });
    return NextResponse.json({ hotel: updated });
  }

  if (category === 'airline') {
    const { airlineId, tier, idr, label, sublabel, isDefault } = body;
    if (!AIRLINE_TIERS.includes(tier as string)) {
      return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
    }
    if (idr !== undefined && (typeof idr !== 'number' || idr <= 0)) {
      return NextResponse.json({ error: 'idr must be a positive number' }, { status: 400 });
    }
    if (label !== undefined && (typeof label !== 'string' || !label.trim())) {
      return NextResponse.json({ error: 'label required' }, { status: 400 });
    }
    if (sublabel !== undefined && typeof sublabel !== 'string') {
      return NextResponse.json({ error: 'sublabel required' }, { status: 400 });
    }

    const updates: Partial<typeof airlinePrices.$inferInsert> & { updatedAt: Date } = {
      updatedAt: now,
    };
    if (typeof idr === 'number') updates.idr = idr;
    if (typeof label === 'string') {
      updates.label = label.trim();
      updates.importKey = normalizeAirlinePricingImportKey({
        tier: tier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS',
        label: label.trim(),
      });
    }
    if (typeof sublabel === 'string') updates.sublabel = sublabel.trim();
    if (typeof isDefault === 'boolean') updates.isDefault = isDefault;

    const whereClause =
      typeof airlineId === 'string' && airlineId
        ? eq(airlinePrices.id, airlineId)
        : and(
            eq(airlinePrices.tier, tier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS'),
            eq(airlinePrices.isDefault, true),
          );

    const [updated] = await db.transaction(async (tx) => {
      if (isDefault === true) {
        await tx
          .update(airlinePrices)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(airlinePrices.tier, tier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS'));
      }

      return tx.update(airlinePrices).set(updates).where(whereClause).returning();
    });
    if (!updated) return NextResponse.json({ error: 'Airline price not found' }, { status: 404 });
    return NextResponse.json({ airline: updated });
  }

  if (category === 'service') {
    const { key, amount, enabled, divideByPax } = body;
    if (!SERVICE_KEYS.includes(key as ServiceKey)) {
      return NextResponse.json({ error: 'invalid key' }, { status: 400 });
    }
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    const updates: Partial<typeof serviceFees.$inferInsert> & { updatedAt: Date } = {
      updatedAt: now,
    };
    if (typeof amount === 'number') updates.amount = amount;
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof divideByPax === 'boolean') updates.divideByPax = divideByPax;

    const [updated] = await db
      .update(serviceFees)
      .set(updates)
      .where(eq(serviceFees.key, key as ServiceKey))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Service fee not found' }, { status: 404 });
    return NextResponse.json({ service: updated });
  }

  if (category === 'monthly-hotel') {
    const { hotelId, month, sarPerNight } = body;
    if (typeof hotelId !== 'string' || !hotelId) {
      return NextResponse.json({ error: 'hotelId required' }, { status: 400 });
    }
    if (typeof month !== 'number' || month < 1 || month > 12) {
      return NextResponse.json({ error: 'month must be 1-12' }, { status: 400 });
    }
    if (typeof sarPerNight !== 'number' || sarPerNight <= 0) {
      return NextResponse.json({ error: 'sarPerNight must be a positive number' }, { status: 400 });
    }
    const [updated] = await db
      .update(hotelMonthlyPrices)
      .set({ sarPerNight, updatedAt: now })
      .where(and(eq(hotelMonthlyPrices.hotelPriceId, hotelId), eq(hotelMonthlyPrices.month, month)))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Monthly price not found' }, { status: 404 });
    return NextResponse.json({ monthlyPrice: updated });
  }

  if (category === 'monthly-airline') {
    const { airlineId, month, idr } = body;
    if (typeof airlineId !== 'string' || !airlineId) {
      return NextResponse.json({ error: 'airlineId required' }, { status: 400 });
    }
    if (typeof month !== 'number' || month < 1 || month > 12) {
      return NextResponse.json({ error: 'month must be 1-12' }, { status: 400 });
    }
    if (typeof idr !== 'number' || idr <= 0) {
      return NextResponse.json({ error: 'idr must be a positive number' }, { status: 400 });
    }
    const [updated] = await db
      .update(airlineMonthlyPrices)
      .set({ idr, updatedAt: now })
      .where(
        and(
          eq(airlineMonthlyPrices.airlinePriceId, airlineId),
          eq(airlineMonthlyPrices.month, month),
        ),
      )
      .returning();
    if (!updated)
      return NextResponse.json({ error: 'Monthly airline price not found' }, { status: 404 });
    return NextResponse.json({ monthlyPrice: updated });
  }

  return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
};
