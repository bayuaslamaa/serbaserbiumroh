"use client"

import { useEffect, useState } from "react"

// Static community stats (update these values as the community grows)
const COMMUNITY_SIZE = "3.500+"
const PILGRIMS_HELPED = "3.000+"

// Baseline offset for promotional purposes
const BASELINE_OFFSET = 100

const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-xs font-semibold text-gold"

const pillStyle = {
  background: "rgba(201, 168, 76, 0.06)",
  borderColor: "var(--color-border)",
} as const

/**
 * The three community pills that used to sit in the navbar. Read-only — the
 * pageview beacon lives in components/nav/VisitorTracker.tsx.
 */
export function StatBadges() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/visitor", { method: "GET" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat statistik")
        return res.json()
      })
      .then((data) => {
        if (data.success) setCount(data.uniqueVisitors)
      })
      .catch((err) => {
        console.error("Error fetching visitor count:", err)
      })
  }, [])

  const displayCount = count !== null ? count + BASELINE_OFFSET : null

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className={pillClass} style={pillStyle}>
        {COMMUNITY_SIZE} Komunitas
      </span>
      <span className={pillClass} style={pillStyle}>
        {PILGRIMS_HELPED} Jamaah Terbantu
      </span>

      {displayCount === null ? (
        // Fixed-size skeleton so the hero does not shift once the count lands
        <span
          className="inline-flex animate-pulse rounded-full border"
          style={{
            background: "rgba(201, 168, 76, 0.03)",
            borderColor: "rgba(201, 168, 76, 0.1)",
            width: "150px",
            height: "26px",
          }}
          data-testid="visitor-skeleton"
        />
      ) : (
        <span className={pillClass} style={pillStyle}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {displayCount.toLocaleString("id-ID")}+ Pengunjung
        </span>
      )}
    </div>
  )
}
