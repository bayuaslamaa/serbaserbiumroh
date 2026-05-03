import type { BudgetBreakdown, EstimateParams } from "@/types"

const AIRLINE_LABELS: Record<string, string> = {
  BUDGET: "Lion Air / Budget",
  STANDARD: "Batik Air / Standard",
  GARUDA: "Garuda Indonesia",
  BUSINESS: "Business Class",
}

function rp(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

export function generateWhatsAppText(
  params: EstimateParams,
  breakdown: BudgetBreakdown,
  title?: string | null
): string {
  const lines: string[] = []

  lines.push("🕋 *ESTIMASI BIAYA UMROH*")
  if (title) lines.push(`_${title}_`)
  lines.push("━━━━━━━━━━━━━━━━━")
  lines.push(`📅 Madinah: ${params.nightsMadinah} malam | Makkah: ${params.nightsMakkah} malam`)
  lines.push(`👥 Jamaah: ${params.pax} orang (${params.roomType})`)
  lines.push(`🏨 Hotel: ${params.hotelTier}`)
  lines.push(`✈️ Pesawat: ${AIRLINE_LABELS[params.airline] ?? params.airline}`)
  lines.push("")
  lines.push("💰 *RINCIAN PER ORANG*")

  const pad = 22
  function row(label: string, value: string): string {
    return `${label.padEnd(pad)}${value}`
  }

  lines.push(row("Hotel Madinah:", rp(breakdown.hotelMadinahIdr)))
  lines.push(row("Hotel Makkah:", rp(breakdown.hotelMakkahIdr)))

  for (const svc of breakdown.serviceItems) {
    const label = `${svc.label}:`
    const display = svc.amountDisplay !== `Rp ${svc.idr.toLocaleString("id-ID")}`
      ? `${svc.amountDisplay} ≈ ${rp(svc.idr)}`
      : rp(svc.idr)
    lines.push(row(label, display))
  }

  lines.push(row("Pesawat:", rp(breakdown.flightIdr)))
  lines.push("━━━━━━━━━━━━━━━━━")
  lines.push(`*TOTAL/ORANG:   ${rp(breakdown.totalIdrPax)}*`)

  if (params.pax > 1) {
    lines.push(`TOTAL GRUP (${params.pax} org): ${rp(breakdown.totalIdrGrp)}`)
  }

  lines.push("")
  lines.push(`Kurs: SAR ${breakdown.sarRate.toLocaleString("id-ID")} · USD ${breakdown.usdRate.toLocaleString("id-ID")}`)
  lines.push("⚠️ Estimasi, belum termasuk biaya lainnya.")

  return lines.join("\n")
}
