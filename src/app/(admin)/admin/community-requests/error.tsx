'use client';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const CommunityRequestsError = ({ error, reset }: ErrorProps) => {
  return (
    <div
      className="mx-auto max-w-lg rounded-lg border px-6 py-8 text-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <h2
        className="text-lg font-bold"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Gagal memuat pengajuan
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Data pengajuan komunitas tidak bisa diambil saat ini. Coba lagi, atau muat ulang halaman
        bila masalahnya berlanjut.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Kode kesalahan: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md px-4 py-2 text-xs font-semibold"
        style={{ background: 'var(--color-gold)', color: '#1a1206' }}
      >
        Coba lagi
      </button>
    </div>
  );
};

export default CommunityRequestsError;
