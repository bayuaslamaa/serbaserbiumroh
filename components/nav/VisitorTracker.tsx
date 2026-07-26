"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Paths that are not counted as visitor pageviews
const BLACKLIST_PATHS = ["/admin", "/dashboard", "/login", "/api"]

/**
 * Records a pageview on every public route and renders nothing.
 *
 * This is the beacon half of the old VisitorCounter — the pills it used to
 * render are now server-rendered by components/stats/CommunityStats.tsx.
 * Mount this in the route-group layouts so tracking stays site-wide.
 */
export function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Nothing reads the response, so a non-tracked path makes no request at all.
    // (The old VisitorCounter issued a GET here only because it rendered the count.)
    if (BLACKLIST_PATHS.some((path) => pathname?.startsWith(path))) return

    fetch("/api/visitor", {
      method: "POST",
      body: JSON.stringify({ path: pathname }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch((err) => {
      console.error("Error tracking visit:", err)
    })
  }, [pathname])

  return null
}
