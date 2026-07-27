"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import type { RawSearchParams } from "@/lib/community/admin-requests-query"
import { buildAdminRequestsHref } from "@/lib/community/admin-requests-url"

const SEARCH_DEBOUNCE_MS = 300

type CommunityRequestsToolbarProps = {
  q: string
}

/**
 * Search is the only control here that needs JavaScript. Status and duplicate
 * filtering live on the stat cards, which are plain links.
 */
export function CommunityRequestsToolbar({ q }: CommunityRequestsToolbarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [term, setTerm] = useState(q)

  // The last value this toolbar wrote to the URL. Anything else changing `q`
  // -- the empty-state "Hapus filter" link, a stat card, browser Back -- is an
  // external edit the box must adopt.
  const pushedRef = useRef(q)

  const current = useMemo<RawSearchParams>(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams]
  )

  // Read at fire time, not capture time: a filter link clicked during the
  // debounce window would otherwise be overwritten by the stale params the
  // effect closed over.
  const currentRef = useRef(current)
  currentRef.current = current

  useEffect(() => {
    if (q === pushedRef.current) return
    pushedRef.current = q
    setTerm(q)
  }, [q])

  useEffect(() => {
    // Already in sync -- covers the first render and the settle after a
    // navigation, so neither writes a redundant history entry.
    if (term === q) return

    const timer = setTimeout(() => {
      pushedRef.current = term
      router.replace(buildAdminRequestsHref(currentRef.current, { q: term || null }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [term, q, router])

  return (
    <div>
      <label htmlFor="community-request-search" className="sr-only">
        Cari nama, nomor telepon, atau username sosial
      </label>
      <Input
        id="community-request-search"
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Cari nama, nomor, atau username..."
        className="h-9 max-w-md text-sm"
      />
    </div>
  )
}
