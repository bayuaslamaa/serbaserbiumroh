"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Props = {
  id: string
  status: string
}

export function HotelBookingOfferTableActions({ id, status }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [localStatus, setLocalStatus] = useState(status)
  const [error, setError] = useState<string | null>(null)

  async function updateStatus(nextStatus: string) {
    setError(null)
    setIsPending(true)
    try {
      const res = await fetch(`/api/admin/hotel-booking-offers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal memperbarui offer.")
      setLocalStatus(data.offer?.status ?? nextStatus)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui offer.")
    } finally {
      setIsPending(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus offer booking ini? Tindakan tidak dapat dibatalkan.")) return

    setError(null)
    setIsPending(true)
    try {
      const res = await fetch(`/api/admin/hotel-booking-offers/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus offer.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus offer.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/admin/content/hotel-booking-offers/${id}/edit`}
          className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          Edit
        </Link>

        {localStatus === "ACTIVE" ? (
          <button
            type="button"
            onClick={() => void updateStatus("UNAVAILABLE")}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: "rgba(234,179,8,0.55)", color: "#eab308" }}
          >
            Tidak tersedia
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void updateStatus("ACTIVE")}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: "rgba(34,197,94,0.55)", color: "#22c55e" }}
          >
            Aktifkan
          </button>
        )}

        <button
          type="button"
          onClick={() => void updateStatus("INACTIVE")}
          disabled={isPending || localStatus === "INACTIVE"}
          className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          Arsip
        </button>

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" }}
        >
          Hapus
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
