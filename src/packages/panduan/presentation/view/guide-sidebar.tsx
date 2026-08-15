'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { GuideMetadata, GuideGroup } from '@/packages/panduan/domain/panduan';

const GROUP_LABELS: Record<GuideGroup, string> = {
  persiapan: 'Persiapan',
  manasik: 'Manasik',
  'doa-dzikir': 'Doa & Dzikir',
};

const GROUP_ORDER: GuideGroup[] = ['persiapan', 'manasik', 'doa-dzikir'];

interface GuideSidebarProps {
  guides: GuideMetadata[];
}

export const GuideSidebar = ({ guides }: GuideSidebarProps) => {
  const pathname = usePathname();

  const grouped = GROUP_ORDER.reduce<Record<GuideGroup, GuideMetadata[]>>(
    (acc, group) => {
      acc[group] = guides.filter((g) => g.group === group);
      return acc;
    },
    { persiapan: [], manasik: [], 'doa-dzikir': [] },
  );

  return (
    <nav className="sticky top-4 w-64 shrink-0 hidden md:block">
      {GROUP_ORDER.map((group) => {
        const groupGuides = grouped[group];
        if (groupGuides.length === 0) return null;
        return (
          <div key={group} className="mb-6">
            <h3
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {GROUP_LABELS[group]}
            </h3>
            <ul className="space-y-1">
              {groupGuides.map((guide) => {
                const isActive = pathname === `/panduan/${guide.slug}`;
                return (
                  <li key={guide.slug}>
                    <Link
                      href={`/panduan/${guide.slug}`}
                      className="block text-sm px-2 py-1 rounded transition-colors"
                      style={{
                        color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)',
                        backgroundColor: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                      }}
                    >
                      {guide.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
};
