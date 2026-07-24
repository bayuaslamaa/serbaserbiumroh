import type { BreakdownDisplay, BudgetBreakdown, EstimateParams } from "@/types"
import { rp, rowCalc, exportLabel, basisNote, kursLine, EXPORT_NOTES } from "./summary"

const AIRLINE_LABELS: Record<string, string> = {
  BUDGET: "Lion Air / Budget",
  STANDARD: "Batik Air / Standard",
  GARUDA: "Garuda Indonesia",
  BUSINESS: "Business Class",
}

export function generateWhatsAppText(
  params: EstimateParams,
  breakdown: BudgetBreakdown,
  display: BreakdownDisplay,
  title?: string | null
): string {
  const lines: string[] = []

  lines.push("🕋 *ESTIMASI BIAYA UMROH*")
  if (title) lines.push(`_${title}_`)
  lines.push("━━━━━━━━━━━━━━━━━")
  lines.push(`📅 Madinah: ${params.nightsMadinah} malam | Makkah: ${params.nightsMakkah} malam`)
  lines.push(`👥 Jamaah: ${params.pax} orang (${params.roomType})`)
  lines.push(`🏨 Hotel Madinah: ${breakdown.hotelMadinahDetail.label}`)
  lines.push(`🏨 Hotel Makkah: ${breakdown.hotelMakkahDetail.label}`)
  lines.push(`✈️ Pesawat: ${AIRLINE_LABELS[params.airline] ?? params.airline}`)
  lines.push("")
  lines.push(`💰 *RINCIAN PER ORANG*${basisNote(display)}`)

  // Itemized rows come from the override-aware display model; hidden rows are dropped.
  for (const r of display.rows) {
    if (r.hidden) continue
    lines.push(`• ${exportLabel(r)}`)
    const calc = rowCalc(r, params.pax)
    if (calc) lines.push(`  ${calc}`)
    lines.push(`  ${rp(r.idr)}`)
  }

  lines.push("━━━━━━━━━━━━━━━━━")
  lines.push(`*TOTAL PER ORANG: ${rp(display.totalIdrPax)}*`)
  if (params.pax > 1) {
    lines.push(`*TOTAL ${params.pax} ORANG: ${rp(display.totalIdrGrp)}*`)
  }

  lines.push("")
  lines.push(kursLine(display))
  lines.push(`⚠️ ${EXPORT_NOTES.exclusions}`)
  lines.push(EXPORT_NOTES.priceChange)
  lines.push(EXPORT_NOTES.contact)

  return lines.join("\n")
}
