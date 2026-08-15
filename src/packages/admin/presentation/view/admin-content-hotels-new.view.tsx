import { requireAdmin } from '@/shared/auth/guards';
import Link from 'next/link';
import { HotelListingForm } from '@/packages/admin/presentation/view/hotels/hotel-listing-form';

export const AdminContentHotelsNewView = async () => {
  await requireAdmin();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/content/hotels"
          className="text-sm mb-3 inline-block hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Kembali ke daftar
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          Tambah Hotel Baru
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Tambahkan informasi hotel ke direktori Hotel Nusuk.
        </p>
      </div>

      <HotelListingForm />
    </div>
  );
};
