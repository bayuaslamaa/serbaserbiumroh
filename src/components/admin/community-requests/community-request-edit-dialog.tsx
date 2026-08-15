"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { STATUS_OPTIONS, type RequestStatus } from "@/shared/community/admin-requests-status"

type CommunityRequestEditDialogProps = {
  id: string
  fullName: string
  status: RequestStatus
  adminNote: string
}

const REQUEST_TIMEOUT_MS = 10_000

const fieldStyle = {
  borderColor: "var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
}

/**
 * Editing lives behind a dialog rather than inside the row. The admin note is a
 * multi-line field, so any in-row form -- expanded or not -- puts the table back
 * where it started: a handful of very tall rows over 1600 records.
 */
export function CommunityRequestEditDialog({
  id,
  fullName,
  status,
  adminNote,
}: CommunityRequestEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)
  const [note, setNote] = useState(adminNote)
  const [error, setError] = useState<string | null>(null)
  // Explicit rather than useTransition: React 18 does not await an async
  // transition callback, so isPending would clear the moment the fetch was
  // issued -- leaving Simpan live and double-submittable for the whole request.
  const [isPending, setIsPending] = useState(false)

  function handleOpenChange(next: boolean) {
    if (isPending) return
    if (next) {
      // Reseed from the server's copy: a refresh may have changed it since the
      // last time this row was opened.
      setCurrentStatus(status)
      setNote(adminNote)
      setError(null)
    }
    setOpen(next)
  }

  async function save() {
    if (isPending) return
    setError(null)
    setIsPending(true)
    try {
      const res = await fetch(`/api/admin/community-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: currentStatus, adminNote: note }),
        // A hang, unlike a rejection, never reaches the catch below -- without
        // this the dialog stays disabled with no way forward.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Gagal menyimpan.")
        return
      }

      setOpen(false)
      router.refresh()
    } catch {
      setError("Gagal menyimpan.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className="rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-gold)]"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        Kelola
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola pengajuan</DialogTitle>
          <DialogDescription>{fullName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
            Status
            <select
              value={currentStatus}
              onChange={(event) => setCurrentStatus(event.target.value as typeof currentStatus)}
              disabled={isPending}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={fieldStyle}
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
              className="mt-1 min-h-[96px] w-full resize-none rounded-md border px-3 py-2 text-sm outline-none"
              style={fieldStyle}
            />
          </label>

          {error && (
            <p role="alert" className="text-xs" style={{ color: "#ef4444" }}>
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-md px-4 py-2 text-xs font-semibold disabled:opacity-60"
            style={{ background: "var(--color-gold)", color: "#1a1206" }}
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
