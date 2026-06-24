"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { HotelBookingOfferImportParseResult } from "@/lib/admin/hotel-booking-offer-import"

export function HotelBookingOfferImportPanel() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [csv, setCsv] = useState("")
  const [fileName, setFileName] = useState("")
  const [preview, setPreview] = useState<HotelBookingOfferImportParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isConfirmPending, setIsConfirmPending] = useState(false)

  const canConfirm =
    !!preview &&
    preview.summary.conflict === 0 &&
    preview.summary.create + preview.summary.update > 0

  async function postImport(url: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Terjadi kesalahan.")
    return data
  }

  async function previewImport() {
    setError(null)
    setIsPreviewPending(true)
    try {
      const data = await postImport("/api/admin/hotel-booking-offers/import/preview")
      setPreview(data.preview)
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setIsPreviewPending(false)
    }
  }

  async function confirmImport() {
    setError(null)
    setIsConfirmPending(true)
    try {
      const data = await postImport("/api/admin/hotel-booking-offers/import/confirm")
      setPreview(data.preview)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setIsConfirmPending(false)
    }
  }

  const loading = isPreviewPending || isConfirmPending

  async function selectCsvFile(file: File | undefined) {
    if (!file) return

    setError(null)
    setPreview(null)
    setFileName(file.name)
    try {
      setCsv(await file.text())
    } catch {
      setCsv("")
      setError("File CSV tidak dapat dibaca.")
    }
  }

  return (
    <section
      className="rounded-lg border"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block text-lg font-semibold" style={{ color: "var(--color-gold)" }}>
            Import Offer Booking CSV
          </span>
          <span className="mt-1 block text-sm" style={{ color: "var(--color-text-muted)" }}>
            Bulk create/update offer hotel berdasarkan kota, tier, hotel, periode, basis kamar, dan label.
          </span>
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          {isOpen ? "Tutup" : "Buka"}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t p-5" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              CSV sudah berisi hotel dari /hotel-nusuk. Lengkapi periode, label offer, basis kamar,
              harga, dan ubah status menjadi ACTIVE saat siap ditampilkan.
            </p>
            <a
              href="/api/admin/hotel-booking-offers/import/template"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: "var(--color-gold)" }}
            >
              Download CSV Hotel Nusuk
            </a>
          </div>

          <textarea
            value={csv}
            onChange={(event) => {
              setCsv(event.target.value)
              setPreview(null)
            }}
            placeholder="Tempel isi CSV offer booking hotel di sini..."
            className="min-h-[180px] w-full rounded-md border px-3 py-2 font-mono text-xs outline-none focus:ring-2"
            style={{
              borderColor: "var(--color-border)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--color-text)",
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <label
              className="cursor-pointer rounded-md border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              Pilih File CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => void selectCsvFile(event.target.files?.[0])}
              />
            </label>
            {fileName && (
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {fileName}
              </span>
            )}
          </div>

          {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void previewImport()}
              disabled={loading || csv.trim().length === 0}
              className="rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              {isPreviewPending ? "Memeriksa..." : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => void confirmImport()}
              disabled={!canConfirm || loading}
              className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ background: "var(--color-gold)", color: "#1a1206" }}
            >
              {isConfirmPending ? "Mengimpor..." : "Konfirmasi Import"}
            </button>
          </div>

          {preview && <HotelBookingOfferImportPreview preview={preview} />}
        </div>
      )}
    </section>
  )
}

function HotelBookingOfferImportPreview({ preview }: { preview: HotelBookingOfferImportParseResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Baru", preview.summary.create],
          ["Update", preview.summary.update],
          ["Invalid", preview.summary.invalid],
          ["Konflik", preview.summary.conflict],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border p-3"
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </div>
            <div className="mt-1 text-xl font-semibold" style={{ color: "var(--color-text)" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {preview.fileErrors.length > 0 && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}
        >
          {preview.fileErrors.join("; ")}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--color-border)" }}>
        <table className="w-full min-w-[860px] text-sm">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {["Row", "Status", "Hotel", "Periode", "Harga", "Catatan"].map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.rowNumber} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>{row.rowNumber}</td>
                <td className="px-3 py-2 font-semibold" style={{ color: statusColor(row.status) }}>{row.status}</td>
                <td className="px-3 py-2" style={{ color: "var(--color-text)" }}>
                  {row.data?.hotelName ?? "-"}
                </td>
                <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
                  {row.data ? `${row.data.periodStart} - ${row.data.periodEnd}` : "-"}
                </td>
                <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
                  {row.data ? `${row.data.currency} ${row.data.priceAmount.toLocaleString("id-ID")}` : "-"}
                </td>
                <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
                  {row.errors.length > 0
                    ? row.errors.join("; ")
                    : row.status === "update"
                      ? "Akan memperbarui offer existing"
                      : "Akan membuat offer baru"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function statusColor(status: string) {
  if (status === "invalid" || status === "conflict") return "#ef4444"
  if (status === "update") return "var(--color-gold)"
  return "var(--color-text)"
}
