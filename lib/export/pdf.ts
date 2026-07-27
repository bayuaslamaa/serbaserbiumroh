import { Document, Page, Text, View, StyleSheet, renderToBuffer, Image } from "@react-pdf/renderer"
import { createElement } from "react"
import path from "path"
import type { BreakdownDisplay, BudgetBreakdown, EstimateParams } from "@/types"
import { rp, rowCalc, exportLabel, basisNote, kursLine, travelMonthLabel, EXPORT_NOTES } from "./summary"

const GOLD = "#c9a84c"
const GREEN = "#2c6b42"
const BG = "#0b1c12"
const WHITE = "#f0ece0"
const MUTED = "#9ab39e"

const styles = StyleSheet.create({
  page: { backgroundColor: BG, padding: 40, fontFamily: "Helvetica", color: WHITE },
  header: { backgroundColor: GREEN, borderRadius: 8, padding: 20, marginBottom: 20, flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 40, height: 40, marginRight: 15, objectFit: "contain" },
  headerTextContainer: { flexDirection: "column", flex: 1 },
  headerTitle: { fontSize: 20, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  headerSub: { fontSize: 10, color: MUTED },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#1e3a2a" },
  rowLabelWrap: { flexDirection: "column", maxWidth: "70%" },
  label: { fontSize: 10, color: MUTED },
  sublabel: { fontSize: 8, color: MUTED, marginTop: 1 },
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

const ROOM_LABELS: Record<string, string> = { QUINT: "Quint (5 org/kamar)", QUAD: "Quad (4 org/kamar)", TRIPLE: "Triple (3 org/kamar)", DOUBLE: "Double (2 org/kamar)" }
const AIRLINE_LABELS: Record<string, string> = { BUDGET: "Budget (Lion/AirAsia)", STANDARD: "Batik Air", GARUDA: "Garuda Indonesia", BUSINESS: "Business Class" }

export async function generatePDF(
  params: EstimateParams,
  breakdown: BudgetBreakdown,
  display: BreakdownDisplay,
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
        createElement(Image, {
          src: path.join(process.cwd(), "public/pdf/ssu.png"),
          style: styles.headerLogo,
        }),
        createElement(
          View,
          { style: styles.headerTextContainer },
          createElement(Text, { style: styles.headerTitle }, "ESTIMASI BIAYA UMROH"),
          createElement(Text, { style: styles.headerSub }, title ?? "Paket Umroh")
        )
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
          ),
          // Hotel rates are seasonal, so the quote is only checkable against the month it was
          // priced for. "Belum ditentukan" is stated rather than omitted — a blank slot would read
          // as an oversight, and it flags to the reader that the figure is not month-specific.
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "KEBERANGKATAN"),
            createElement(
              Text,
              { style: styles.infoValue },
              travelMonthLabel(params.travelMonth) ?? "Belum ditentukan"
            )
          )
        ),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "HOTEL MADINAH"),
            createElement(Text, { style: styles.infoValue }, breakdown.hotelMadinahDetail.label)
          ),
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "HOTEL MAKKAH"),
            createElement(Text, { style: styles.infoValue }, breakdown.hotelMakkahDetail.label)
          ),
          createElement(View, { style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, "KAMAR"),
            createElement(Text, { style: styles.infoValue }, ROOM_LABELS[params.roomType] ?? params.roomType)
          )
        ),
        createElement(
          View,
          { style: styles.infoRow },
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
        createElement(Text, { style: styles.sectionTitle }, `Rincian Biaya per Orang${basisNote(display)}`),
        // Itemized rows from the override-aware display model; hidden rows are dropped.
        ...display.rows
          .filter((r) => !r.hidden)
          .map((r) => {
            // ASCII x / to keep the built-in Helvetica PDF font rendering safe.
            const calc = rowCalc(r, params.pax, { times: "x", div: "/" })
            return createElement(
              View,
              { style: styles.row, key: r.key },
              calc
                ? createElement(
                    View,
                    { style: styles.rowLabelWrap },
                    createElement(Text, { style: styles.label }, exportLabel(r)),
                    createElement(Text, { style: styles.sublabel }, calc)
                  )
                : createElement(Text, { style: styles.label }, exportLabel(r)),
              createElement(Text, { style: styles.value }, rp(r.idr))
            )
          }),
        // Total per person
        createElement(
          View,
          { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, "TOTAL PER ORANG"),
          createElement(Text, { style: styles.totalValue }, rp(display.totalIdrPax))
        ),
        // Group total
        params.pax > 1
          ? createElement(
              View,
              { style: styles.groupBox },
              createElement(Text, { style: styles.groupLabel }, `Total ${params.pax} orang`),
              createElement(Text, { style: styles.groupValue }, rp(display.totalIdrGrp))
            )
          : null
      ),
      // Footer
      createElement(
        View,
        { style: styles.footer },
        createElement(Text, { style: styles.footerText }, kursLine(display)),
        createElement(Text, { style: styles.footerText }, `Digenerate: ${generatedDate}${estimateId ? ` · ID: ${estimateId}` : ""}`),
        createElement(Text, { style: styles.footerText }, EXPORT_NOTES.exclusions),
        createElement(Text, { style: styles.footerText }, EXPORT_NOTES.priceChange),
        createElement(Text, { style: styles.footerText }, EXPORT_NOTES.contact)
      )
    )
  )

  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}
