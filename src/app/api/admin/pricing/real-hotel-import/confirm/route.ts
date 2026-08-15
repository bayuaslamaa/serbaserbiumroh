import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { hotelPrices } from '@/shared/db/schema';
import {
  HOTEL_PRICING_IMPORT_MAX_BYTES,
  HOTEL_PRICING_IMPORT_MAX_ROWS,
} from '@/packages/admin/domain/hotel-pricing-import';
import {
  parseRealHotelPricingCsv,
  applyRealHotelPricing,
} from '@/packages/admin/domain/real-hotel-pricing-import';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session };
};

export const POST = async (req: NextRequest) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: { csv?: unknown; sourceLabel?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.csv !== 'string' || body.csv.trim().length === 0) {
    return NextResponse.json({ error: 'csv is required' }, { status: 400 });
  }
  if (typeof body.sourceLabel !== 'string' || body.sourceLabel.trim().length === 0) {
    return NextResponse.json(
      { error: 'sourceLabel is required (name of the price catalog)' },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(body.csv, 'utf8') > HOTEL_PRICING_IMPORT_MAX_BYTES) {
    return NextResponse.json(
      { error: `csv must be ${HOTEL_PRICING_IMPORT_MAX_BYTES} bytes or less` },
      { status: 413 },
    );
  }

  const existingHotels = await db.select().from(hotelPrices);
  const plan = parseRealHotelPricingCsv(body.csv, existingHotels, body.sourceLabel.trim());
  if (plan.fileErrors.length > 0) {
    return NextResponse.json(
      { error: plan.fileErrors.join('; '), fileErrors: plan.fileErrors },
      { status: 400 },
    );
  }
  if (plan.rowsParsed > HOTEL_PRICING_IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `csv must contain ${HOTEL_PRICING_IMPORT_MAX_ROWS} rows or fewer` },
      { status: 413 },
    );
  }

  const imported = await db.transaction((tx) => applyRealHotelPricing(tx, plan));

  return NextResponse.json({
    imported,
    hotelsMatched: plan.hotelsMatched,
    unmatched: plan.unmatched,
    rowErrors: plan.rowErrors,
  });
};
