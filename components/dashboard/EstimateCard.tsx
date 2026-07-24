"use client"

import Link from "next/link"
import { useState } from "react"
import type { Estimate } from "@/lib/db/schema"
import type { EstimateParams } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

const TIER_COLORS: Record<string, string> = {
  ECONOMY: "#6b8c7a",
  STANDARD: "#4a7c6a",
  PELATARAN: "var(--color-gold)",
  PREMIUM: "#9f7f2e",
}

function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
}

interface EstimateCardProps {
  estimate: Estimate
  onDelete: (id: string) => void
  onDuplicate: (estimate: Estimate) => void
}

export function EstimateCard({ estimate, onDelete, onDuplicate }: EstimateCardProps) {
  const [duplicating, setDuplicating] = useState(false)
  const params = estimate.params as EstimateParams

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceEstimateId: estimate.id }),
      })
      if (!res.ok) throw new Error()
      const { estimate: newEstimate } = await res.json()
      onDuplicate(newEstimate)
      toast({ title: "Estimasi berhasil diduplikat!" })
    } catch {
      toast({ title: "Gagal menduplikat", variant: "destructive" })
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/estimate/${estimate.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onDelete(estimate.id)
      toast({ title: "Estimasi dihapus." })
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" })
    }
  }

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-3 transition-colors hover:border-[var(--color-gold-muted)]"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base leading-snug" style={{ color: "var(--color-text)" }}>
          {estimate.title ?? "Tanpa Judul"}
        </h3>
        <Badge
          style={{
            background: "transparent",
            borderColor: TIER_COLORS[params.hotelTier] ?? "var(--color-border)",
            color: TIER_COLORS[params.hotelTier] ?? "var(--color-text-muted)",
            border: "1px solid",
          }}
          className="shrink-0 text-xs"
        >
          {params.hotelTier}
        </Badge>
      </div>

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {formatDate(estimate.createdAt)}
      </div>

      <div className="flex flex-wrap gap-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <span>Madinah {params.nightsMadinah} mlm + Makkah {params.nightsMakkah} mlm</span>
        <span>·</span>
        <span>{params.pax} orang · {params.roomType}</span>
      </div>

      <div className="mt-1">
        <span className="text-xl font-bold tabular-nums" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
          {formatIdr(estimate.totalIdrPax)}
        </span>
        <span className="text-xs ml-1" style={{ color: "var(--color-text-muted)" }}>/ orang</span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
        <Link href={`/estimate/${estimate.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">Lihat</Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleDuplicate} disabled={duplicating}>
          {duplicating ? "…" : "Duplikat"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" style={{ color: "#e05252" }}>Hapus</Button>
          </AlertDialogTrigger>
          <AlertDialogContent style={{ background: "#0f2318", borderColor: "var(--color-border)" }}>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: "var(--color-text)" }}>Hapus estimasi ini?</AlertDialogTitle>
              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} style={{ background: "#c03c3c" }}>Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
