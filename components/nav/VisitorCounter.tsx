"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Users, Heart, Globe } from "lucide-react"

// Paths that are not counted as visitor pageviews
const BLACKLIST_PATHS = ["/admin", "/dashboard", "/login", "/api"]

// Static community stats (update these values as the community grows)
const COMMUNITY_SIZE = "3.500+"
const PILGRIMS_HELPED = "3.000+"

function StatBadge({
  icon,
  value,
  label,
  className = "",
}: {
  icon: React.ReactNode
  value: string
  label: string
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-default select-none transition-all duration-300 hover:bg-[rgba(201,168,76,0.1)] ${className}`}
      style={{
        background: "rgba(201, 168, 76, 0.05)",
        borderColor: "var(--color-border)",
        color: "var(--color-gold)",
      }}
      title={`${value} ${label}`}
    >
      {icon}
      <span className="whitespace-nowrap">
        {value} {label}
      </span>
    </div>
  )
}

export function VisitorCounter() {
  const pathname = usePathname()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const isBlacklisted = BLACKLIST_PATHS.some((path) => pathname?.startsWith(path))

    // Track (POST) for public pages, otherwise just fetch stats (GET)
    const method = isBlacklisted ? "GET" : "POST"
    const body = isBlacklisted ? undefined : JSON.stringify({ path: pathname })
    const headers = isBlacklisted ? undefined : { "Content-Type": "application/json" }

    fetch("/api/visitor", {
      method,
      body,
      headers,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat statistik")
        return res.json()
      })
      .then((data) => {
        if (data.success) {
          setCount(data.uniqueVisitors)
        }
      })
      .catch((err) => {
        console.error("Error fetching visitor count:", err)
      })
  }, [pathname])

  // Baseline offset for promotional purposes
  const BASELINE_OFFSET = 1420
  const displayCount = count !== null ? count + BASELINE_OFFSET : null

  return (
    <div className="flex items-center gap-2 w-max">
      {/* Community size badge */}
      <StatBadge
        icon={<Users size={12} />}
        value={COMMUNITY_SIZE}
        label="Komunitas"
      />

      {/* Pilgrims helped badge */}
      <StatBadge
        icon={<Heart size={12} />}
        value={PILGRIMS_HELPED}
        label="Jamaah"
      />

      {/* Live visitor counter — always visible */}
      {displayCount === null ? (
        // Loading skeleton to avoid layout shift
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border animate-pulse"
          style={{
            background: "rgba(201, 168, 76, 0.03)",
            borderColor: "rgba(201, 168, 76, 0.1)",
            width: "115px",
            height: "26px",
          }}
        />
      ) : (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-300 hover:bg-[rgba(201,168,76,0.12)] cursor-default select-none"
          style={{
            background: "rgba(201, 168, 76, 0.06)",
            borderColor: "var(--color-border)",
            color: "var(--color-gold)",
          }}
          title={`${displayCount.toLocaleString("id-ID")}+ teman umroh telah berkunjung`}
        >
          {/* Live pulse indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Globe size={12} className="text-[var(--color-gold)]" />
          <span className="whitespace-nowrap">
            {displayCount.toLocaleString("id-ID")}+ Pengunjung
          </span>
        </div>
      )}
    </div>
  )
}
