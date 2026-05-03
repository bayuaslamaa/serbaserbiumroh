"use client"

import type { BudgetBreakdown as Breakdown } from "@/types"

function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

interface BudgetBreakdownProps {
  breakdown: Breakdown
  pax: number
}

export function BudgetBreakdown({ breakdown, pax }: BudgetBreakdownProps) {
  const rows: { label: string; value: string; shared?: boolean }[] = [
    { label: "Hotel Madinah", value: formatIdr(breakdown.hotelMadinahIdr) },
    { label: "Hotel Makkah", value: formatIdr(breakdown.hotelMakkahIdr) },
    ...breakdown.serviceItems.map((s) => ({
      label: `${s.label} (${s.amountDisplay})`,
      value: formatIdr(s.idr),
      shared: s.divideByPax && pax > 1,
    })),
    { label: "Penerbangan", value: formatIdr(breakdown.flightIdr) },
  ]

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <h2
        className="text-lg font-bold"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
      >
        Rincian Biaya
      </h2>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
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
