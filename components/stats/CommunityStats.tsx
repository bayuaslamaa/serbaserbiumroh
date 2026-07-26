import { Globe, Heart, Users } from "lucide-react"
import {
  COMMUNITY_SIZE,
  PILGRIMS_HELPED,
  formatVisitorCount,
} from "@/lib/stats/community"

const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-xs font-semibold text-gold"

const compactPillClass =
  "inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-semibold text-gold"

const pillStyle = {
  background: "rgba(201, 168, 76, 0.06)",
  borderColor: "var(--color-border)",
} as const

/** Live indicator on the visitor pill. */
function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

/**
 * The three community figures.
 *
 * Presentational by design: the caller resolves the count during its own
 * server render, so there is nothing to fetch and no pending state to draw.
 * A null count means the figure could not be read — the two static pills
 * still render.
 *
 * `full` is the hero treatment on the homepage and /layanan. `compact` drops
 * the word labels for icons so the set fits the navbar, which has roughly
 * 270px of free space between the nav links and the call to action; the
 * meaning moves to a tooltip and screen-reader text.
 */
export function CommunityStats({
  visitorCount,
  variant = "full",
}: {
  visitorCount: number | null
  variant?: "full" | "compact"
}) {
  const displayCount = formatVisitorCount(visitorCount)

  if (variant === "compact") {
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
            {displayCount}+
            <span className="sr-only">pengunjung</span>
          </span>
        )}
      </div>
    )
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
  )
}
