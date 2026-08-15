import { Globe, Heart, Users } from 'lucide-react';
import {
  COMMUNITY_SIZE,
  PILGRIMS_HELPED,
  formatVisitorCount,
} from '@/packages/stats/domain/community';

const pillClass =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-xs font-semibold text-gold';

const compactPillClass =
  'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-semibold text-gold';

const InlineDot = () => {
  return (
    <span
      aria-hidden
      className="h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--color-gold-muted)]"
    />
  );
};

const pillStyle = {
  background: 'rgba(201, 168, 76, 0.06)',
  borderColor: 'var(--color-border)',
} as const;

const PulseDot = () => {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
};

export const CommunityStats = ({
  visitorCount,
  variant = 'full',
}: {
  visitorCount: number | null;
  variant?: 'full' | 'compact' | 'inline';
}) => {
  const displayCount = formatVisitorCount(visitorCount);

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12.5px] text-[var(--color-text-muted)] sm:gap-x-[18px]">
        <span>
          <strong className="font-bold text-gold">{COMMUNITY_SIZE}</strong> Komunitas
        </span>
        <InlineDot />
        <span>
          <strong className="font-bold text-gold">{PILGRIMS_HELPED}</strong> Jamaah Terbantu
        </span>

        {displayCount !== null && (
          <>
            <InlineDot />
            <span className="inline-flex items-center gap-1.5">
              <PulseDot />
              <strong className="font-bold text-gold">{displayCount}+</strong> Pengunjung
            </span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={compactPillClass}
          style={pillStyle}
          title={`${COMMUNITY_SIZE} anggota komunitas`}
        >
          <Users size={11} aria-hidden />
          {COMMUNITY_SIZE}
          <span className="sr-only">anggota komunitas</span>
        </span>
        <span
          className={compactPillClass}
          style={pillStyle}
          title={`${PILGRIMS_HELPED} jamaah terbantu`}
        >
          <Heart size={11} aria-hidden />
          {PILGRIMS_HELPED}
          <span className="sr-only">jamaah terbantu</span>
        </span>

        {displayCount !== null && (
          <span
            className={compactPillClass}
            style={pillStyle}
            title={`${displayCount}+ pengunjung`}
          >
            <PulseDot />
            <Globe size={11} aria-hidden />
            {displayCount}+<span className="sr-only">pengunjung</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className={pillClass} style={pillStyle}>
        {COMMUNITY_SIZE} Komunitas
      </span>
      <span className={pillClass} style={pillStyle}>
        {PILGRIMS_HELPED} Jamaah Terbantu
      </span>

      {displayCount !== null && (
        <span className={pillClass} style={pillStyle}>
          <PulseDot />
          {displayCount}+ Pengunjung
        </span>
      )}
    </div>
  );
};
