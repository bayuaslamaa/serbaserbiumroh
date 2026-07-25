"use client"

import { useState } from "react"
import type { BreakdownDisplay, BreakdownDisplayRow, EstimateParams } from "@/types"
import { HOTEL_MADINAH_ROW_KEY, HOTEL_MAKKAH_ROW_KEY, FLIGHT_ROW_KEY } from "@/types"
import { Button } from "@/components/ui/button"
import { rp } from "@/lib/export/summary"
import { buildWhatsAppMessage } from "@/lib/export/whatsapp"

// The rail is the narrow sticky column (352px per the Hi-Fi handoff): total, category bars,
// save + WhatsApp preview. It deliberately does NOT render the Rincian Biaya table — that lives
// in the wide main column, because the table's fixed 148px + 176px tracks cannot fit 352px and
// would collapse its label column (wrapping the hotel formula one word per line).
interface EstimatorRailProps {
  display: BreakdownDisplay
  pax: number
  params: EstimateParams
  // Mirrors EstimatorClient's existing "Simpan Estimasi" / "Perbarui Estimasi" button: the rail
  // just renders it and reports the click — the save dialog / persistence flow stays owned by
  // whichever parent wires this in.
  onSave: () => void
  saveLabel: string
  saveDisabled?: boolean
  // Controlled: a later integration unit needs to be able to close the WA preview from outside
  // (e.g. a "start over" flow), so this component must not own the open/closed state itself.
  waOpen: boolean
  onWaOpenChange: (open: boolean) => void
}

interface CategoryBucket {
  key: "hotel" | "flight" | "services"
  label: string
  amount: number
}

function isHotelRow(row: BreakdownDisplayRow): boolean {
  return row.key === HOTEL_MADINAH_ROW_KEY || row.key === HOTEL_MAKKAH_ROW_KEY || !!row.hotelDetail
}

// Aggregate the override-aware rows into three presentational buckets. Hidden rows are excluded
// so the bucket totals always sum to display.totalIdrPax, matching the total shown above them.
function categoryBuckets(display: BreakdownDisplay): CategoryBucket[] {
  let hotel = 0
  let flight = 0
  let services = 0
  for (const row of display.rows) {
    if (row.hidden) continue
    if (isHotelRow(row)) hotel += row.idr
    else if (row.key === FLIGHT_ROW_KEY) flight += row.idr
    else services += row.idr
  }
  return [
    { key: "hotel", label: "Hotel Madinah & Makkah", amount: hotel },
    { key: "flight", label: "Penerbangan", amount: flight },
    { key: "services", label: "Visa & layanan", amount: services },
  ]
}

function CategoryBreakdownBar({ display }: { display: BreakdownDisplay }) {
  const buckets = categoryBuckets(display)
  const max = Math.max(...buckets.map((b) => b.amount))

  return (
    <div className="flex flex-col gap-2.5">
      {buckets.map((b) => (
        <div key={b.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: "var(--color-text-muted)" }}>{b.label}</span>
            <span className="tabular-nums" style={{ color: "var(--color-text)" }}>
              {rp(b.amount)}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              data-testid={`category-bar-${b.key}`}
              className="h-full rounded-full"
              style={{
                // Avoid NaN/Infinity when every bucket is 0 (e.g. an all-hidden breakdown).
                width: `${max > 0 ? (b.amount / max) * 100 : 0}%`,
                background: "var(--color-gold)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EstimatorRail({
  display,
  pax,
  params,
  onSave,
  saveLabel,
  saveDisabled,
  waOpen,
  onWaOpenChange,
}: EstimatorRailProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage(display, params, pax))
      setCopyStatus("copied")
      window.setTimeout(() => setCopyStatus("idle"), 1800)
    } catch {
      setCopyStatus("error")
    }
  }

  return (
    <div className="lg:sticky lg:top-20 flex flex-col gap-4 self-start">
      <div
        className="rounded-xl border p-5 flex flex-col gap-1"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Total per Orang
        </span>
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          {rp(display.totalIdrPax)}
        </span>
        {pax > 1 && (
          <span className="text-sm tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            Total {pax} orang: <span style={{ color: "var(--color-gold)" }}>{rp(display.totalIdrGrp)}</span>
          </span>
        )}
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <CategoryBreakdownBar display={display} />
      </div>

      <Button onClick={onSave} className="w-full" size="lg" disabled={saveDisabled}>
        {saveLabel}
      </Button>

      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <button
          type="button"
          onClick={() => onWaOpenChange(!waOpen)}
          className="flex items-center justify-between text-sm font-medium"
          style={{ color: "var(--color-gold)" }}
          aria-expanded={waOpen}
        >
          Pratinjau Pesan WhatsApp
          <span aria-hidden="true">{waOpen ? "−" : "+"}</span>
        </button>

        {waOpen && (
          <div className="flex flex-col gap-3">
            <pre
              className="whitespace-pre-wrap rounded-lg border p-3 text-xs leading-relaxed"
              style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.25)", color: "var(--color-text)" }}
            >
              {buildWhatsAppMessage(display, params, pax)}
            </pre>
            <button
              type="button"
              onClick={copyMessage}
              className="text-xs px-3 py-1.5 rounded border self-start transition-colors"
              style={{
                borderColor: copyStatus === "copied" ? "var(--color-gold)" : "var(--color-border)",
                color:
                  copyStatus === "error"
                    ? "#ef4444"
                    : copyStatus === "copied"
                      ? "var(--color-gold)"
                      : "var(--color-text-muted)",
              }}
              aria-label="Salin pesan WhatsApp"
            >
              {copyStatus === "copied" ? "Tersalin" : copyStatus === "error" ? "Gagal" : "Salin pesan"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
