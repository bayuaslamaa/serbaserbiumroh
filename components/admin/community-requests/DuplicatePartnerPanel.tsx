"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatAbsoluteDateTime, formatPhoneDisplay } from "@/lib/community/admin-requests-format"

type DuplicatePartner = {
  id: string
  fullName: string
  phone: string
  socialUsername: string | null
  status: "NEW" | "MATCHED" | "REJECTED"
  adminNote: string
  createdAt: string
  matchedByPhone: boolean
  matchedBySocial: boolean
}

type DuplicatePartnerPanelProps = {
  id: string
  fullName: string
  reason: string
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Baru",
  MATCHED: "Sudah dicocokkan",
  REJECTED: "Ditolak",
}

function matchLabel(partner: DuplicatePartner) {
  return [partner.matchedByPhone ? "nomor sama" : null, partner.matchedBySocial ? "sosial sama" : null]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Read-only on purpose. Comparing is a separate act from deciding -- acting on
 * what you find here goes through the row's own Kelola dialog.
 */
export function DuplicatePartnerPanel({ id, fullName, reason }: DuplicatePartnerPanelProps) {
  const [open, setOpen] = useState(false)
  const [partners, setPartners] = useState<DuplicatePartner[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/community-requests/duplicates/${id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Gagal memuat pengajuan serupa.")
        return
      }
      const data = await res.json()
      setPartners(data.duplicates ?? [])
    } catch {
      setError("Gagal memuat pengajuan serupa.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Only fetch the first time; reopening reuses what was already loaded.
    if (next && partners === null && !isLoading) void load()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger aria-label={`Lihat pengajuan serupa dengan ${fullName}`}>
        <Badge
          variant="outline"
          className="cursor-pointer text-xs transition-colors hover:border-[var(--color-gold)]"
        >
          Duplikat: {reason}
        </Badge>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pengajuan serupa</DialogTitle>
          <DialogDescription>
            Kontak yang sama dengan {fullName}. Ubah status lewat tombol Kelola di barisnya.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Memuat pengajuan serupa...
          </p>
        )}

        {error && (
          <div role="alert" className="space-y-2 py-4">
            <p className="text-sm" style={{ color: "#ef4444" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={load}
              className="rounded-md border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              Coba lagi
            </button>
          </div>
        )}

        {!isLoading && !error && partners?.length === 0 && (
          <p className="py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Tidak ada pengajuan lain dengan kontak ini.
          </p>
        )}

        {!isLoading && !error && !!partners?.length && (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {partners.map((partner) => (
              <li
                key={partner.id}
                className="rounded-md border px-3 py-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    {partner.fullName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {STATUS_LABELS[partner.status] ?? partner.status}
                  </Badge>
                </div>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatPhoneDisplay(partner.phone)}
                  {partner.socialUsername && ` · ${partner.socialUsername}`}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatAbsoluteDateTime(new Date(partner.createdAt))} · {matchLabel(partner)}
                </p>
                {partner.adminNote && (
                  <p className="mt-1 text-xs" style={{ color: "var(--color-gold)" }}>
                    Catatan: {partner.adminNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
