"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Paths that are not counted as visitor pageviews
const BLACKLIST_PATHS = ["/admin", "/dashboard", "/login", "/api"]

/**
 * Records a pageview on every public route and renders nothing.
 *
 * This is the beacon half of the old VisitorCounter — the pills it used to
 * render now live on /layanan (see components/layanan/StatBadges.tsx). Mount
 * this in the route-group layouts so tracking stays site-wide.
 */
export function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const isBlacklisted = BLACKLIST_PATHS.some((path) => pathname?.startsWith(path))

    // Track (POST) for public pages, otherwise just touch the endpoint (GET)
    const method = isBlacklisted ? "GET" : "POST"
    const body = isBlacklisted ? undefined : JSON.stringify({ path: pathname })
    const headers = isBlacklisted ? undefined : { "Content-Type": "application/json" }

    fetch("/api/visitor", { method, body, headers }).catch((err) => {
      console.error("Error tracking visit:", err)
    })
  }, [pathname])

  return null
}
