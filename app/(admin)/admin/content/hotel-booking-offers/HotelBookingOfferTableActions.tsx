"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Props = {
  id: string
  status: string
}

export function HotelBookingOfferTableActions({ id, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(status)

  function updateStatus(nextStatus: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/hotel-booking-offers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setLocalStatus(data.offer?.status ?? nextStatus)
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!confirm("Hapus offer booking ini? Tindakan tidak dapat dibatalkan.")) return

    startTransition(async () => {
      await fetch(`/api/admin/hotel-booking-offers/${id}`, { method: "DELETE" })
      router.refresh()
    })
  }

  return (
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
          onClick={() => updateStatus("UNAVAILABLE")}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: "rgba(234,179,8,0.55)", color: "#eab308" }}
        >
          Tidak tersedia
        </button>
      ) : (
        <button
          type="button"
          onClick={() => updateStatus("ACTIVE")}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: "rgba(34,197,94,0.55)", color: "#22c55e" }}
        >
          Aktifkan
        </button>
      )}

      <button
        type="button"
        onClick={() => updateStatus("INACTIVE")}
        disabled={isPending || localStatus === "INACTIVE"}
        className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        Arsip
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" }}
      >
        Hapus
      </button>
    </div>
  )
}
