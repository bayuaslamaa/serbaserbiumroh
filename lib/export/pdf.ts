import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import type { BudgetBreakdown, EstimateParams } from "@/types"

const GOLD = "#c9a84c"
const GREEN = "#2c6b42"
const BG = "#0b1c12"
const WHITE = "#f0ece0"
const MUTED = "#9ab39e"

const styles = StyleSheet.create({
  page: { backgroundColor: BG, padding: 40, fontFamily: "Helvetica", color: WHITE },
  header: { backgroundColor: GREEN, borderRadius: 8, padding: 20, marginBottom: 20, alignItems: "center" },
  headerTitle: { fontSize: 22, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  headerSub: { fontSize: 10, color: MUTED },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#1e3a2a" },
  label: { fontSize: 10, color: MUTED },
  value: { fontSize: 10, color: WHITE },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: GOLD },
  totalLabel: { fontSize: 13, color: MUTED, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 18, color: GOLD, fontFamily: "Helvetica-Bold" },
  groupBox: { backgroundColor: "#1a3a28", borderRadius: 6, padding: 10, marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  groupLabel: { fontSize: 11, color: MUTED },
  groupValue: { fontSize: 14, color: GOLD, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#1e3a2a" },
  footerText: { fontSize: 8, color: MUTED },
  infoRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  infoValue: { fontSize: 11, color: WHITE },
})

function rp(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

const ROOM_LABELS: Record<string, string> = { QUAD: "Quad (4 org/kamar)", TRIPLE: "Triple (3 org/kamar)", DOUBLE: "Double (2 org/kamar)", SINGLE: "Single" }
const AIRLINE_LABELS: Record<string, string> = { BUDGET: "Budget (Lion/AirAsia)", STANDARD: "Batik Air", GARUDA: "Garuda Indonesia", BUSINESS: "Business Class" }

export async function generatePDF(
  params: EstimateParams,
  breakdown: BudgetBreakdown,
  title?: string | null,
  estimateId?: string
): Promise<Uint8Array> {
  const generatedDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  const doc = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.headerTitle }, "🕋 ESTIMASI BIAYA UMROH"),
        createElement(Text, { style: styles.headerSub }, title ?? "Paket Umroh")
      ),
      // Trip summary
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Ringkasan Perjalanan"),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "MADINAH"),
            createElement(Text, { style: styles.infoValue }, `${params.nightsMadinah} malam`)
          ),
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "MAKKAH"),
            createElement(Text, { style: styles.infoValue }, `${params.nightsMakkah} malam`)
          ),
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "JAMAAH"),
            createElement(Text, { style: styles.infoValue }, `${params.pax} orang`)
          )
        ),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "HOTEL"),
            createElement(Text, { style: styles.infoValue }, params.hotelTier)
          ),
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "KAMAR"),
            createElement(Text, { style: styles.infoValue }, ROOM_LABELS[params.roomType] ?? params.roomType)
          ),
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "MASKAPAI"),
            createElement(Text, { style: styles.infoValue }, AIRLINE_LABELS[params.airline] ?? params.airline)
          )
        )
      ),
      // Breakdown
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Rincian Biaya per Orang"),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Hotel Madinah"),
          createElement(Text, { style: styles.value }, rp(breakdown.hotelMadinahIdr))
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Hotel Makkah"),
          createElement(Text, { style: styles.value }, rp(breakdown.hotelMakkahIdr))
        ),
        ...breakdown.serviceItems.map((svc) =>
          createElement(
            View,
            { style: styles.row, key: svc.key },
            createElement(Text, { style: styles.label }, `${svc.label} (${svc.amountDisplay})`),
            createElement(Text, { style: styles.value }, rp(svc.idr))
          )
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Penerbangan"),
          createElement(Text, { style: styles.value }, rp(breakdown.flightIdr))
        ),
        // Total per person
        createElement(
          View,
          { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, "TOTAL PER ORANG"),
          createElement(Text, { style: styles.totalValue }, rp(breakdown.totalIdrPax))
        ),
        // Group total
        params.pax > 1
          ? createElement(
              View,
              { style: styles.groupBox },
              createElement(Text, { style: styles.groupLabel }, `Total ${params.pax} orang`),
              createElement(Text, { style: styles.groupValue }, rp(breakdown.totalIdrGrp))
            )
          : null
      ),
      // Footer
      createElement(
        View,
        { style: styles.footer },
        createElement(Text, { style: styles.footerText }, `Kurs: SAR 1 = Rp ${breakdown.sarRate.toLocaleString("id-ID")} · USD 1 = Rp ${breakdown.usdRate.toLocaleString("id-ID")}`),
        createElement(Text, { style: styles.footerText }, `Digenerate: ${generatedDate}${estimateId ? ` · ID: ${estimateId}` : ""}`),
        createElement(Text, { style: styles.footerText }, "⚠️ Estimasi menggunakan kurs terkini. Harga dapat berubah.")
      )
    )
  )

  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}
