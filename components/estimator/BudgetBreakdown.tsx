"use client"

import { useState } from "react"
import { RotateCcw, X } from "lucide-react"
import type { BreakdownDisplay, BreakdownDisplayRow, CustomRow, HotelCostDetail } from "@/types"
import { MAX_LABEL_LEN, MAX_ROWS } from "@/lib/estimate/overrides"
import { rp, rowCalc, exportLabel, basisNote, kursLine, travelMonthLabel, EXPORT_NOTES } from "@/lib/export/summary"

// Parse an amount input into an integer; blank → null (treated as "no override").
function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "")
  if (digits === "") return null
  return parseInt(digits, 10)
}

// Short currency marker shown before the unit-price input.
function unitPrefix(currency: string): string {
  if (currency === "USD") return "$"
  if (currency === "SAR") return "SAR"
  return "Rp"
}

// Unit prices are whole numbers in their native currency; thousands separators aid reading
// large SAR/IDR rates (e.g. 1.300, 2.500, 200.000). The currency prefix disambiguates.
function formatUnit(amount: number): string {
  return amount.toLocaleString("id-ID")
}

interface BudgetBreakdownProps {
  display: BreakdownDisplay
  customRows: CustomRow[]
  pax: number
  /** Departure month (1-12) shown in the copied text; hotel rates are seasonal. */
  travelMonth?: number
  editable?: boolean
  onSetAmount: (key: string, idr: number | null) => void
  onSetUnitPrice: (key: string, unitPrice: number | null) => void
  onSetLabel: (key: string, label: string | null) => void
  onToggleHidden: (key: string) => void
  onResetRow: (key: string) => void
  onAddCustom: () => void
  onSetCustomLabel: (id: string, label: string) => void
  onSetCustomAmount: (id: string, idr: number | null) => void
  onRemoveCustom: (id: string) => void
}

const SOFT_SELLING_NOTE =
  "Jika Kakak benar-benar serius transaksi ke kami, bisa kami hitungkan estimasi yang lebih detail dan akurat. WA: 085172117757 / 085161134844"

function hotelFormula(detail: HotelCostDetail): string {
  const multiplier = detail.roomMultiplier === 1 ? "" : ` × ${detail.roomMultiplier}`
  return `SAR ${detail.sarPerNight.toLocaleString("id-ID")} × ${detail.nights} malam × ${detail.roomCount} kamar${multiplier} ÷ ${detail.totalPax} orang (${detail.roomPax} orang/kamar)`
}

function buildCopyText(display: BreakdownDisplay, pax: number, travelMonth?: number): string {
  const lines: string[] = [
    "*ESTIMASI BIAYA UMROH*",
    // Hotel rates are seasonal, so the month is what makes this quote checkable later. Stated even
    // when unset, so an unspecified departure reads as a question to answer rather than an omission.
    `Keberangkatan: ${travelMonthLabel(travelMonth) ?? "belum ditentukan"}`,
    `Rincian per orang${basisNote(display)}:`,
    "",
  ]

  for (const row of display.rows) {
    if (row.hidden) continue
    lines.push(`• ${exportLabel(row)}`)
    const calc = rowCalc(row, pax)
    if (calc) lines.push(`  ${calc}`)
    lines.push(`  ${rp(row.idr)}`)
  }

  lines.push("")
  lines.push(`*TOTAL PER ORANG: ${rp(display.totalIdrPax)}*`)
  if (pax > 1) lines.push(`*TOTAL ${pax} ORANG: ${rp(display.totalIdrGrp)}*`)

  lines.push("")
  lines.push("Catatan:")
  lines.push(`- ${kursLine(display)}`)
  lines.push(`- ${EXPORT_NOTES.exclusions}`)
  lines.push(`- ${EXPORT_NOTES.priceChange}`)
  lines.push(`- ${EXPORT_NOTES.contact}`)

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

// Shared visual base for row-level text/amount inputs — colors via CSS vars (project convention),
// sizing/spacing via the Tailwind classes each input applies alongside this.
const inputBase: React.CSSProperties = {
  background: "rgba(0,0,0,0.25)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
}

// Grid-column template for the desktop (lg:+) "Rincian Biaya" table: component / unit price /
// total / actions. The actions column is `auto` (not a fixed px width) so it never clips when a
// row renders two icon buttons (reset + hide) side by side.
const ROW_GRID_COLS = "lg:grid-cols-[1fr_148px_176px_auto]"

function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "muted" | "warn" }) {
  const toneClass =
    tone === "warn"
      ? "bg-red-500/15 text-red-400"
      : tone === "muted"
        ? "bg-white/[0.08] text-[var(--color-text-muted)]"
        : "text-[#0b1c12]"
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClass}`}
      style={tone === "gold" ? { background: "var(--color-gold)" } : undefined}
    >
      {children}
    </span>
  )
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors lg:h-8 lg:w-8 ${
        danger ? "hover:border-[#c9683c] hover:text-[#e8a082]" : "hover:opacity-70"
      }`}
      style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
    >
      {children}
    </button>
  )
}

export function BudgetBreakdown({
  display,
  customRows,
  pax,
  travelMonth,
  editable = true,
  onSetAmount,
  onSetUnitPrice,
  onSetLabel,
  onToggleHidden,
  onResetRow,
  onAddCustom,
  onSetCustomLabel,
  onSetCustomAmount,
  onRemoveCustom,
}: BudgetBreakdownProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")

  async function copyEstimate() {
    try {
      await navigator.clipboard.writeText(buildCopyText(display, pax, travelMonth))
      setCopyStatus("copied")
      window.setTimeout(() => setCopyStatus("idle"), 1800)
    } catch {
      setCopyStatus("error")
    }
  }

  const computedRows = display.rows.filter((r) => r.source !== "custom")

  return (
    <div
      className="rounded-[14px] border p-5 flex flex-col gap-4"
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
          className="h-8 rounded-lg border px-3 text-xs font-semibold transition-colors"
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
        <div
          className={`hidden text-[9px] font-bold uppercase tracking-wide lg:grid lg:gap-3 lg:pb-1 ${ROW_GRID_COLS}`}
          style={{ color: "var(--color-text-muted)" }}
        >
          <span>Komponen</span>
          <span className="text-right">Harga Satuan</span>
          <span className="text-right">Total / Orang</span>
          <span />
        </div>

        {computedRows.map((row) => (
          <ComputedRow
            key={row.key}
            row={row}
            pax={pax}
            onSetAmount={onSetAmount}
            onSetUnitPrice={onSetUnitPrice}
            onSetLabel={onSetLabel}
            onToggleHidden={onToggleHidden}
            onResetRow={onResetRow}
            editable={editable}
          />
        ))}

        {customRows.map((row) => (
          <CustomRowEditor
            key={row.id}
            row={row}
            onSetLabel={onSetCustomLabel}
            onSetAmount={onSetCustomAmount}
            onRemove={onRemoveCustom}
            editable={editable}
          />
        ))}

        {editable && (
          <button
            type="button"
            onClick={onAddCustom}
            aria-label="Tambah baris"
            disabled={customRows.length >= MAX_ROWS}
            className="mt-1 flex h-11 w-full items-center justify-center rounded-[10px] border border-dashed text-xs font-medium transition-colors hover:opacity-80 lg:h-10"
            style={{ borderColor: "var(--color-gold-muted)", color: "var(--color-gold)" }}
          >
            + Tambah baris
          </button>
        )}
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
          {rp(display.totalIdrPax)}
        </span>
      </div>

      {pax > 1 && (
        <div
          className="rounded-[10px] border p-3 flex items-center justify-between"
          style={{ borderColor: "var(--color-gold-muted)", background: "rgba(201,168,76,0.08)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Total {pax} orang
          </span>
          <span className="text-lg font-bold tabular-nums" style={{ color: "var(--color-gold)" }}>
            {rp(display.totalIdrGrp)}
          </span>
        </div>
      )}

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Kurs: SAR 1 = Rp {display.sarRate.toLocaleString("id-ID")} · USD 1 = Rp{" "}
        {display.usdRate.toLocaleString("id-ID")}
        <br />
        *Estimasi belum termasuk biaya tak terduga. Harga sewaktu-waktu dapat berubah.
      </div>

      <p
        className="rounded-[10px] border px-3 py-2 text-xs leading-relaxed"
        style={{
          borderColor: "rgba(201,168,76,0.28)",
          background: "rgba(201,168,76,0.08)",
          color: "var(--color-text-muted)",
        }}
      >
        {SOFT_SELLING_NOTE}
      </p>
    </div>
  )
}

// One right-aligned, captioned amount input (a "Harga satuan" or "Total /orang" cell).
// Shared by computed and custom rows so width, formatting, prefix, and a11y stay in one place.
// `width` is the desktop (lg:+) pixel width from the design spec; on mobile the field grows to
// the full row width instead (via a CSS var so both breakpoints share the same inline style).
function AmountField({
  label,
  value,
  ariaLabel,
  width,
  onChange,
  prefix,
  placeholder,
  disabled,
  readOnly,
}: {
  label: string
  value: string
  ariaLabel: string
  width: number
  onChange: (value: number | null) => void
  prefix?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
}) {
  // w-full only while the row stacks (<sm). From sm: up the row is a flex-row, where a
  // full-width sibling would starve the label column — so the field sizes to its input.
  return (
    <div className="flex w-full flex-col items-end gap-0.5 sm:w-auto">
      <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <div
        className="flex w-full items-center gap-1 sm:w-auto"
        style={{ "--field-w": `${width}px` } as React.CSSProperties}
      >
        {prefix && (
          <span className="shrink-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(parseAmount(e.target.value))}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={ariaLabel}
          className="min-h-11 w-full rounded-lg px-2.5 text-right text-sm transition-colors lg:min-h-9 lg:w-[var(--field-w)] lg:text-[13px]"
          style={inputBase}
        />
      </div>
    </div>
  )
}

function ComputedRow({
  row,
  pax,
  onSetAmount,
  onSetUnitPrice,
  onSetLabel,
  onToggleHidden,
  onResetRow,
  editable,
}: {
  row: BreakdownDisplayRow
  pax: number
  onSetAmount: (key: string, idr: number | null) => void
  onSetUnitPrice: (key: string, unitPrice: number | null) => void
  onSetLabel: (key: string, label: string | null) => void
  onToggleHidden: (key: string) => void
  onResetRow: (key: string) => void
  editable: boolean
}) {
  const edited = row.source === "overridden" || row.hidden
  return (
    <div
      className={`flex flex-col gap-2 rounded-[10px] border p-3 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-3 lg:grid lg:items-start lg:gap-3 lg:rounded-none lg:border-0 lg:border-t lg:p-0 lg:py-3 ${ROW_GRID_COLS}`}
      style={{
        opacity: row.hidden ? 0.5 : 1,
        borderColor: edited ? "var(--color-gold)" : "var(--color-border)",
        background: edited ? "rgba(201,168,76,0.05)" : "transparent",
      }}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1 lg:flex-none">
        <input
          type="text"
          value={row.label}
          onChange={(e) => onSetLabel(row.key, e.target.value)}
          aria-label="Nama baris"
          maxLength={MAX_LABEL_LEN}
          readOnly={!editable}
          className="min-h-11 w-full rounded-lg px-2.5 text-sm font-semibold transition-colors lg:min-h-9 lg:text-[13.5px]"
          style={{ ...inputBase, textDecoration: row.hidden ? "line-through" : "none" }}
        />
        {row.hotelDetail && (
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {hotelFormula(row.hotelDetail)}
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.hidden && <Badge tone="muted">disembunyikan</Badge>}
          {row.source === "overridden" && <Badge>manual</Badge>}
          {/* Source badge only while the row is still layer-priced. A unit-price override keeps
              hotelDetail (to show the formula at the edited rate) but the number is now manual, so
              gate on source too — otherwise a hand-typed SAR rate would falsely read as "harga real". */}
          {row.source !== "overridden" && row.hotelDetail?.priceSource === "real" && <Badge>harga real</Badge>}
          {row.source !== "overridden" && row.hotelDetail?.priceSource === "estimate" && <Badge tone="muted">estimasi</Badge>}
          {row.stale && <Badge tone="warn">⚠ nilai mungkin usang</Badge>}
          {row.shared && pax > 1 && <Badge>÷{pax} org</Badge>}
        </div>
      </div>
      {/* shrink-0 keeps the amounts from compressing, but w-full must stop at sm: — together they
          would claim the whole flex-row and collapse the min-w-0 label column (tablet / Z Fold). */}
      <div className="flex w-full flex-col items-end gap-1.5 shrink-0 sm:w-auto lg:contents">
        <AmountField
          label="Harga satuan"
          prefix={unitPrefix(row.unitCurrency)}
          value={formatUnit(row.unitPrice)}
          ariaLabel="Harga satuan"
          width={row.unitCurrency === "IDR" ? 130 : 104}
          disabled={row.hidden || !row.unitEditable}
          readOnly={!editable}
          onChange={(v) => onSetUnitPrice(row.key, v)}
        />
        <AmountField
          label="Total /orang"
          value={formatUnit(row.idr)}
          ariaLabel="Nilai (Rp)"
          width={130}
          disabled={row.hidden}
          readOnly={!editable}
          onChange={(v) => onSetAmount(row.key, v)}
        />
        {editable && (
          <div className="flex items-center gap-1.5 lg:justify-self-end">
            {edited && (
              <IconButton label="Kembalikan ke nilai otomatis" onClick={() => onResetRow(row.key)}>
                <RotateCcw className="h-4 w-4" />
              </IconButton>
            )}
            {!row.hidden && (
              <IconButton label="Sembunyikan baris" onClick={() => onToggleHidden(row.key)}>
                <X className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomRowEditor({
  row,
  onSetLabel,
  onSetAmount,
  onRemove,
  editable,
}: {
  row: CustomRow
  onSetLabel: (id: string, label: string) => void
  onSetAmount: (id: string, idr: number | null) => void
  onRemove: (id: string) => void
  editable: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-[10px] border p-3 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-3 lg:grid lg:items-start lg:gap-3 lg:rounded-none lg:border-0 lg:border-t lg:p-0 lg:py-3 ${ROW_GRID_COLS}`}
      style={{ borderColor: "var(--color-gold)", background: "rgba(201,168,76,0.05)" }}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1 lg:flex-none">
        <input
          type="text"
          value={row.label}
          placeholder="Nama biaya (mis. Manasik)"
          onChange={(e) => onSetLabel(row.id, e.target.value)}
          aria-label="Nama biaya"
          maxLength={MAX_LABEL_LEN}
          readOnly={!editable}
          className="min-h-11 w-full rounded-lg px-2.5 text-sm font-semibold transition-colors lg:min-h-9 lg:text-[13.5px]"
          style={inputBase}
        />
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>per orang</span>
      </div>
      {/* shrink-0 keeps the amounts from compressing, but w-full must stop at sm: — together they
          would claim the whole flex-row and collapse the min-w-0 label column (tablet / Z Fold). */}
      <div className="flex w-full flex-col items-end gap-1.5 shrink-0 sm:w-auto lg:contents">
        {/* Custom rows are plain IDR at quantity 1, so unit price always equals the total.
            Show it as a read-only mirror and keep the total as the single editable amount. */}
        <AmountField
          label="Harga satuan"
          prefix="Rp"
          value={row.idr ? formatUnit(row.idr) : ""}
          placeholder="0"
          ariaLabel="Harga satuan"
          width={130}
          readOnly
          onChange={() => {}}
        />
        <AmountField
          label="Total /orang"
          value={row.idr ? formatUnit(row.idr) : ""}
          placeholder="0"
          ariaLabel="Nilai (Rp)"
          width={130}
          readOnly={!editable}
          onChange={(v) => onSetAmount(row.id, v)}
        />
        {editable && (
          <div className="flex items-center lg:justify-self-end">
            <IconButton label="Hapus baris" onClick={() => onRemove(row.id)} danger>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  )
}
