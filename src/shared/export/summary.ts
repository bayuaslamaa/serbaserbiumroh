import type { BreakdownDisplay, BreakdownDisplayRow } from "@/shared/types"

// Shared formatting for every estimate export surface (Salin / WhatsApp / PDF) so the
// per-row calculation, room basis, and footer notes stay consistent across all three.

export function rp(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

// Clean component name for exports: strips the trailing "(unit price)" that computed service
// labels carry (e.g. "Visa Umroh Reguler ($165)"), so the unit lives only in the calc column.
// Only computed rows are stripped — a user-renamed (overridden) label is left exactly as typed,
// even if it happens to end with the same suffix.
export function exportLabel(row: BreakdownDisplayRow): string {
  if (row.source === "computed" && row.amountDisplay) {
    const suffix = ` (${row.amountDisplay})`
    if (row.label.endsWith(suffix)) return row.label.slice(0, -suffix.length)
  }
  return row.label
}

// Compact "how this row was computed" line, or "" when there's nothing worth showing
// (plain-IDR rows like Siskopatuh, flight, custom rows, or an amount-overridden row).
export function rowCalc(
  row: BreakdownDisplayRow,
  pax: number,
  symbols: { times: string; div: string } = { times: "×", div: "÷" },
): string {
  const { times, div } = symbols
  if (row.hotelDetail) {
    const d = row.hotelDetail
    const rooms = d.roomCount > 1 ? ` ${times} ${d.roomCount} kamar` : ""
    const mult = d.roomMultiplier === 1 ? "" : ` ${times} ${d.roomMultiplier}`
    return `SAR ${d.sarPerNight.toLocaleString("id-ID")} ${times} ${d.nights} malam${rooms}${mult} ${div} ${d.totalPax} pax`
  }
  // Foreign-currency services (SAR/USD): show the native unit, plus ÷pax for divide-by-pax rows.
  // Plain-IDR services (Siskopatuh) get nothing — the value already equals the unit.
  if (row.amountDisplay && row.unitCurrency !== "IDR") {
    const shared = row.shared && pax > 1 ? ` ${div} ${pax} pax` : ""
    return `${row.amountDisplay}${shared}`
  }
  return ""
}

// Room capacity basis (e.g. 4 for Quad), pulled from the first visible hotel row's detail.
// null when no hotel row is shown with its formula (hidden or both amount-overridden).
export function roomBasisPax(display: BreakdownDisplay): number | null {
  return display.rows.find((r) => !r.hidden && r.hotelDetail)?.hotelDetail?.roomPax ?? null
}

// " (basis N orang/kamar)" clause for a rincian header, or "" — one spelling for every surface.
export function basisNote(display: BreakdownDisplay): string {
  const basis = roomBasisPax(display)
  return basis ? ` (basis ${basis} orang/kamar)` : ""
}

// Exchange-rate footer line, identical across surfaces.
export function kursLine(display: BreakdownDisplay): string {
  return `Kurs: SAR 1 = ${rp(display.sarRate)} | USD 1 = ${rp(display.usdRate)}`
}

// Indexed by EstimateParams.travelMonth (1-12), so slot 0 is deliberately empty.
export const MONTH_NAMES = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const

// Departure month for the estimate, or null when none was given. Every surface shows this:
// hotel rates are seasonal, so a quote without its month cannot be checked or honoured later.
export function travelMonthLabel(travelMonth: number | undefined): string | null {
  if (travelMonth == null || travelMonth < 1 || travelMonth > 12) return null
  return MONTH_NAMES[travelMonth]
}

// Shared footer notes, in display order.
export const EXPORT_NOTES = {
  exclusions: "Belum termasuk biaya tak terduga, perlengkapan, handling, dan manasik",
  priceChange: "Harga dapat berubah sewaktu-waktu",
  // The recipient is already in a WhatsApp conversation and is holding the detailed quote the team
  // just built for them, so this is not a "contact us" invitation — it is the next step. It follows
  // priceChange above it: the price moves, a DP is what stops it moving.
  contact: "Kunci harga ini dengan DP tanda jadi. Konfirmasi via WA: 085172117757 / 085161134844",
} as const
