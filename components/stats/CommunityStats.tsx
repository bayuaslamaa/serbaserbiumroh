import {
  COMMUNITY_SIZE,
  PILGRIMS_HELPED,
  formatVisitorCount,
} from "@/lib/stats/community"

const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-xs font-semibold text-gold"

const pillStyle = {
  background: "rgba(201, 168, 76, 0.06)",
  borderColor: "var(--color-border)",
} as const

/**
 * The three community figures, shown on the homepage hero and /layanan.
 *
 * Presentational by design: the caller resolves the count during its own
 * server render, so there is nothing to fetch and no pending state to draw.
 * A null count means the figure could not be read — the two static pills
 * still render.
 */
export function CommunityStats({ visitorCount }: { visitorCount: number | null }) {
  const displayCount = formatVisitorCount(visitorCount)

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
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {displayCount}+ Pengunjung
        </span>
      )}
    </div>
  )
}
