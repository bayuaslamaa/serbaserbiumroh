import Link from 'next/link';
import type {
  AdminRequestFilters,
  AdminRequestStats,
  RawSearchParams,
} from '@/packages/community/admin-requests/domain/admin-requests-query';
import { buildAdminRequestsHref } from '@/packages/community/admin-requests/domain/admin-requests-url';
import type { RequestStatus } from '@/packages/community/admin-requests/domain/admin-requests-status';

type CommunityRequestsStatsProps = {
  stats: AdminRequestStats;
  filters: AdminRequestFilters;
  searchParams: RawSearchParams;
};

export const CommunityRequestsStats = ({
  stats,
  filters,
  searchParams,
}: CommunityRequestsStatsProps) => {
  const statusCard = (key: string, label: string, value: number, status: RequestStatus) => {
    const active = filters.status === status;
    return {
      key,
      label,
      value,
      active,
      href: buildAdminRequestsHref(searchParams, { status: active ? null : status }),
    };
  };

  const cards = [
    {
      key: 'total',
      label: 'Total pengajuan',
      value: stats.total,
      active: filters.status === 'ALL' && !filters.duplicatesOnly && filters.q === '',
      href: buildAdminRequestsHref(searchParams, { status: null, dup: null, q: null }),
    },
    statusCard('new', 'Baru', stats.newCount, 'NEW'),
    statusCard('matched', 'Sudah dicocokkan', stats.matchedCount, 'MATCHED'),
    statusCard('rejected', 'Ditolak', stats.rejectedCount, 'REJECTED'),
    {
      key: 'duplicates',
      label: 'Kemungkinan duplikat',
      value: stats.duplicateCount,
      active: filters.duplicatesOnly,
      href: buildAdminRequestsHref(searchParams, {
        dup: filters.duplicatesOnly ? null : '1',
      }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          aria-current={card.active ? 'page' : undefined}
          className="rounded-lg border px-4 py-3 transition-colors hover:border-[var(--color-gold)]"
          style={{
            borderColor: card.active ? 'var(--color-gold)' : 'var(--color-border)',
            background: card.active ? 'rgba(201,168,76,0.08)' : 'var(--color-surface)',
          }}
        >
          <span
            className="block text-xl font-bold"
            style={{ color: card.active ? 'var(--color-gold)' : 'var(--color-text)' }}
          >
            {card.value.toLocaleString('id-ID')}
          </span>
          <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {card.label}
          </span>
        </Link>
      ))}
    </div>
  );
};
