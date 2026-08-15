import { NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { exchangeRates, hotelPrices, airlinePrices, serviceFees } from '@/shared/db/schema';

export const GET = async () => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [rates, hotels, airlines, services] = await Promise.all([
    db.select().from(exchangeRates),
    db.select().from(hotelPrices),
    db.select().from(airlinePrices),
    db.select().from(serviceFees),
  ]);

  return NextResponse.json({ rates, hotels, airlines, services });
};
