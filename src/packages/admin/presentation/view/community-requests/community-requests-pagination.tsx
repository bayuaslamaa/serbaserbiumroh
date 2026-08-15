import Link from 'next/link';
import {
  PAGE_SIZE,
  type RawSearchParams,
} from '@/packages/community/admin-requests/domain/admin-requests-query';
import { buildAdminRequestsHref } from '@/packages/community/admin-requests/domain/admin-requests-url';

type CommunityRequestsPaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  searchParams: RawSearchParams;
};

const linkClass =
  'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-gold)]';

export const CommunityRequestsPagination = ({
  page,
  pageCount,
  total,
  searchParams,
}: CommunityRequestsPaginationProps) => {
  if (total === 0) return null;

  const firstOnPage = (page - 1) * PAGE_SIZE + 1;
  const lastOnPage = Math.min(page * PAGE_SIZE, total);

  return (
    <nav
      aria-label="Navigasi halaman pengajuan"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Menampilkan {firstOnPage}-{lastOnPage} dari {total} pengajuan
        {pageCount > 1 && ` · halaman ${page} dari ${pageCount}`}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={buildAdminRequestsHref(searchParams, { page: String(page - 1) })}
              className={linkClass}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Sebelumnya
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${linkClass} opacity-40`}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Sebelumnya
            </span>
          )}

          {page < pageCount ? (
            <Link
              href={buildAdminRequestsHref(searchParams, { page: String(page + 1) })}
              className={linkClass}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Berikutnya
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${linkClass} opacity-40`}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Berikutnya
            </span>
          )}
        </div>
      )}
    </nav>
  );
};
