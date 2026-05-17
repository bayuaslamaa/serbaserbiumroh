"use client"

import { useState } from "react"
import type { BudgetBreakdown as Breakdown } from "@/types"

function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

interface BudgetBreakdownProps {
  breakdown: Breakdown
  pax: number
}

type BreakdownRow = { label: string; value: string; shared?: boolean; sublabel?: string }

function hotelFormula(detail: Breakdown["hotelMadinahDetail"]): string {
  const multiplier =
    detail.roomMultiplier === 1 ? "" : ` × ${detail.roomMultiplier}`
  return `SAR ${detail.sarPerNight.toLocaleString("id-ID")} × ${detail.nights} malam × ${detail.roomCount} kamar${multiplier} ÷ ${detail.totalPax} orang (${detail.roomPax} orang/kamar)`
}

function buildCopyText(rows: BreakdownRow[], breakdown: Breakdown, pax: number): string {
  const lines = ["Estimasi Biaya Umroh", "", "Rincian per orang:"]

  rows.forEach((row) => {
    const shared = row.shared ? ` / orang (biaya bersama dibagi ${pax} orang)` : ""
    lines.push(`- ${row.label}: ${row.value}${shared}`)
    if (row.sublabel) lines.push(`  - Hitungan: ${row.sublabel}`)
    lines.push("")
  })

  lines.push("Total:")
  lines.push(`- Per orang: ${formatIdr(breakdown.totalIdrPax)}`)
  if (pax > 1) {
    lines.push(`- Total ${pax} orang: ${formatIdr(breakdown.totalIdrGrp)}`)
  }

  lines.push("")
  lines.push("Catatan:")
  lines.push(`- Kurs: SAR 1 = Rp ${breakdown.sarRate.toLocaleString("id-ID")} | USD 1 = Rp ${breakdown.usdRate.toLocaleString("id-ID")}`)
  lines.push("- Estimasi belum termasuk biaya tak terduga.")
  lines.push("- Harga sewaktu-waktu dapat berubah.")

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

export function BudgetBreakdown({ breakdown, pax }: BudgetBreakdownProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")
  const rows: BreakdownRow[] = [
    {
      label: `Hotel Madinah - ${breakdown.hotelMadinahDetail.label}`,
      value: formatIdr(breakdown.hotelMadinahIdr),
      sublabel: hotelFormula(breakdown.hotelMadinahDetail),
    },
    {
      label: `Hotel Makkah - ${breakdown.hotelMakkahDetail.label}`,
      value: formatIdr(breakdown.hotelMakkahIdr),
      sublabel: hotelFormula(breakdown.hotelMakkahDetail),
    },
    ...breakdown.serviceItems.map((s) => ({
      label: `${s.label} (${s.amountDisplay})`,
      value: formatIdr(s.idr),
      shared: s.divideByPax && pax > 1,
    })),
    { label: "Penerbangan", value: formatIdr(breakdown.flightIdr) },
  ]

  async function copyEstimate() {
    try {
      await navigator.clipboard.writeText(buildCopyText(rows, breakdown, pax))
      setCopyStatus("copied")
      window.setTimeout(() => setCopyStatus("idle"), 1800)
    } catch {
      setCopyStatus("error")
    }
  }

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Rincian Biaya
        </h2>
        <button
          type="button"
          onClick={copyEstimate}
          className="text-xs px-3 py-1.5 rounded border transition-colors"
          style={{
            borderColor: copyStatus === "copied" ? "var(--color-gold)" : "var(--color-border)",
            color: copyStatus === "error" ? "#ef4444" : copyStatus === "copied" ? "var(--color-gold)" : "var(--color-text-muted)",
          }}
          aria-label="Salin rincian estimasi"
        >
          {copyStatus === "copied" ? "Tersalin" : copyStatus === "error" ? "Gagal" : "Salin"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <span className="text-sm flex flex-col gap-0.5" style={{ color: "var(--color-text-muted)" }}>
              <span className="flex items-center gap-1.5">
                {row.label}
                {row.shared && (
                  <span
                    className="text-xs px-1 rounded"
                    style={{ background: "rgba(201,168,76,0.15)", color: "var(--color-gold)" }}
                  >
                    ÷{pax} org
                  </span>
                )}
              </span>
              {row.sublabel && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {row.sublabel}
                </span>
              )}
            </span>
            <span className="text-sm font-medium tabular-nums" style={{ color: "var(--color-text)" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div
        className="border-t pt-4 flex items-baseline justify-between"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
          Total per Orang
        </span>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          {formatIdr(breakdown.totalIdrPax)}
        </span>
      </div>

      {pax > 1 && (
        <div
          className="rounded-lg border p-3 flex items-center justify-between"
          style={{ borderColor: "var(--color-gold-muted)", background: "rgba(201,168,76,0.08)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Total {pax} orang
          </span>
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: "var(--color-gold)" }}
          >
            {formatIdr(breakdown.totalIdrGrp)}
          </span>
        </div>
      )}

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Kurs: SAR 1 = Rp {breakdown.sarRate.toLocaleString("id-ID")} · USD 1 = Rp{" "}
        {breakdown.usdRate.toLocaleString("id-ID")}
        <br />
        *Estimasi belum termasuk biaya tak terduga. Harga sewaktu-waktu dapat berubah.
      </div>
    </div>
  )
}
