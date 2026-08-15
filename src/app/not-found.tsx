import Link from 'next/link';

import { NOINDEX_METADATA } from '@/shared/seo/metadata';

export const metadata = NOINDEX_METADATA;

const NotFound = () => {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p
        className="mb-3 text-sm font-bold uppercase tracking-[0.08em]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        404
      </p>

      <h1
        className="mb-4 text-3xl font-bold md:text-4xl"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Halaman tidak ditemukan
      </h1>

      <p className="mb-8 text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Alamat yang Anda buka tidak ada, atau sudah dipindahkan. Silakan mulai dari beranda, atau
        langsung ke panduan umroh mandiri.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-lg px-5 py-2.5 text-sm font-bold"
          style={{ backgroundColor: 'var(--color-gold)', color: '#081510' }}
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/panduan"
          className="rounded-lg border px-5 py-2.5 text-sm font-bold"
          style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}
        >
          Lihat panduan umroh
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
