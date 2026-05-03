"use client"

import { useState } from "react"
import Link from "next/link"
import type { Estimate } from "@/lib/db/schema"
import type { EstimateParams } from "@/types"
import { EstimateCard } from "./EstimateCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EstimateListProps {
  initialEstimates: Estimate[]
}

export function EstimateList({ initialEstimates }: EstimateListProps) {
  const [estimates, setEstimates] = useState<Estimate[]>(initialEstimates)
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialEstimates.length === 20)

  const filtered = searchQuery.trim()
    ? estimates.filter((e) => {
        const title = (e.title ?? "").toLowerCase()
        const params = e.params as EstimateParams
        const tier = params.hotelTier.toLowerCase()
        const q = searchQuery.toLowerCase()
        return title.includes(q) || tier.includes(q)
      })
    : estimates

  function handleDelete(id: string) {
    setEstimates((prev) => prev.filter((e) => e.id !== id))
  }

  function handleDuplicate(newEstimate: Estimate) {
    setEstimates((prev) => [newEstimate, ...prev])
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/estimate?page=${nextPage}&limit=20`)
      if (!res.ok) return
      const { estimates: more, total } = await res.json()
      setEstimates((prev) => [...prev, ...more])
      setPage(nextPage)
      setHasMore(estimates.length + more.length < total)
    } finally {
      setLoadingMore(false)
    }
  }

  if (initialEstimates.length === 0) {
    return (
      <div className="text-center py-16 flex flex-col items-center gap-4">
        <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>
          Belum ada estimasi. Mulai buat estimasi pertama Anda.
        </p>
        <Link href="/estimate/new">
          <Button size="lg">Buat Estimasi Baru</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        placeholder="Cari estimasi…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      {filtered.length === 0 ? (
        <p className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          Tidak ada estimasi yang cocok.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((estimate) => (
            <EstimateCard
              key={estimate.id}
              estimate={estimate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {hasMore && !searchQuery && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Memuat…" : "Muat lebih banyak"}
          </Button>
        </div>
      )}
    </div>
  )
}
