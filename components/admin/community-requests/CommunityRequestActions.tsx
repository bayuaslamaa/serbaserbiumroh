"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type CommunityRequestActionsProps = {
  id: string
  status: "NEW" | "MATCHED" | "REJECTED"
  adminNote: string
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "Baru" },
  { value: "MATCHED", label: "Sudah dicocokkan" },
  { value: "REJECTED", label: "Ditolak" },
] as const

export function CommunityRequestActions({ id, status, adminNote }: CommunityRequestActionsProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [note, setNote] = useState(adminNote)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/community-requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: currentStatus, adminNote: note }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Gagal menyimpan.")
          return
        }

        router.refresh()
      } catch {
        setError("Gagal menyimpan.")
      }
    })
  }

  return (
    <div className="min-w-[220px] space-y-2">
      <label className="block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
        Status
        <select
          value={currentStatus}
          onChange={(event) => setCurrentStatus(event.target.value as typeof currentStatus)}
          disabled={isPending}
          className="mt-1 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
        Catatan admin
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={isPending}
          className="mt-1 min-h-[70px] w-full rounded-md border px-2 py-1.5 text-xs outline-none"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
          }}
        />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
        style={{ background: "var(--color-gold)", color: "#1a1206" }}
      >
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
      {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  )
}
