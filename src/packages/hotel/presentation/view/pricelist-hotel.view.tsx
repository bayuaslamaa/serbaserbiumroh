import { PricelistClient } from '@/packages/hotel/presentation/view/pricelist-client';
import { requireAuth } from '@/shared/auth/guards';
import { db } from '@/shared/db';
import { composePricelist, fetchPricelistRows } from '@/packages/hotel/domain/pricelist';
import { formatImportDate } from '@/packages/hotel/domain/pricing';

export const PricelistHotelView = async () => {
  await requireAuth();

  const hotels = composePricelist(await fetchPricelistRows(db));

  const importRange = hotels.reduce<{ oldest: Date; newest: Date } | null>((range, hotel) => {
    if (!range) return { oldest: hotel.updatedAt, newest: hotel.updatedAt };
    return {
      oldest: hotel.updatedAt < range.oldest ? hotel.updatedAt : range.oldest,
      newest: hotel.updatedAt > range.newest ? hotel.updatedAt : range.newest,
    };
  }, null);

  const importDates = importRange && {
    oldest: formatImportDate(importRange.oldest),
    newest: formatImportDate(importRange.newest),
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1
        className="text-2xl font-bold"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Pricelist Hotel
      </h1>

      <p
        className="mt-2 max-w-3xl text-sm leading-relaxed"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Angka di halaman ini adalah tarif katalog supplier: SAR, per kamar, per malam, apa adanya
        tanpa konversi. Angka ini belum tentu sama dengan yang dipakai sebuah estimasi untuk hotel
        dan bulan yang sama.
      </p>

      {importDates && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Pembaruan data per hotel: {importDates.oldest}
          {importDates.newest !== importDates.oldest && `–${importDates.newest}`}.
        </p>
      )}

      <div className="mt-6">
        {hotels.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada tarif katalog yang tersimpan.
          </p>
        ) : (
          <PricelistClient hotels={hotels} />
        )}
      </div>
    </div>
  );
};
