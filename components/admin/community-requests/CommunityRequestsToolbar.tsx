"use client"

import { useEffect, useMemo, useState } from "react"
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

  const current = useMemo<RawSearchParams>(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams]
  )

  useEffect(() => {
    // Already in sync -- covers the first render and the settle after a
    // navigation, so neither writes a redundant history entry.
    if (term === q) return

    const timer = setTimeout(() => {
      router.replace(buildAdminRequestsHref(current, { q: term || null }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [term, q, current, router])

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
