import { requireAdmin } from '@/shared/auth/guards';
import { db } from '@/shared/db';
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  serviceFees,
  hotelMonthlyPrices,
  airlineMonthlyPrices,
} from '@/shared/db/schema';
import { PricingTable } from '@/packages/admin/presentation/view/pricing-table';
import { asc } from 'drizzle-orm';

export const AdminPricingView = async () => {
  await requireAdmin();

  const [rates, hotelsRaw, airlinesRaw, services, monthlyPrices, airlineMonthlyRows] =
    await Promise.all([
      db.select().from(exchangeRates),
      db.select().from(hotelPrices),
      db.select().from(airlinePrices),
      db.select().from(serviceFees),
      db.select().from(hotelMonthlyPrices).orderBy(asc(hotelMonthlyPrices.month)),
      db.select().from(airlineMonthlyPrices).orderBy(asc(airlineMonthlyPrices.month)),
    ]);

  const hotels = hotelsRaw.map((h) => ({
    ...h,
    monthlyPrices: monthlyPrices
      .filter((mp) => mp.hotelPriceId === h.id)
      .sort((a, b) => a.month - b.month),
  }));

  const airlines = airlinesRaw.map((a) => ({
    ...a,
    monthlyPrices: airlineMonthlyRows
      .filter((mp) => mp.airlinePriceId === a.id)
      .sort((a, b) => a.month - b.month),
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          Kelola Harga
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Klik sel untuk mengedit. Perubahan disimpan otomatis.
        </p>
      </div>
      <PricingTable rates={rates} hotels={hotels} airlines={airlines} services={services} />
    </div>
  );
};
