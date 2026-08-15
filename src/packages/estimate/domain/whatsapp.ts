import type { BreakdownDisplay, BudgetBreakdown, EstimateParams } from '@/shared/types';
import { HOTEL_MADINAH_ROW_KEY, HOTEL_MAKKAH_ROW_KEY } from '@/shared/types';
import {
  rp,
  rowCalc,
  exportLabel,
  basisNote,
  kursLine,
  travelMonthLabel,
  EXPORT_NOTES,
} from './summary';

const AIRLINE_LABELS: Record<string, string> = {
  BUDGET: 'Lion Air / Budget',
  STANDARD: 'Batik Air / Standard',
  GARUDA: 'Garuda Indonesia',
  BUSINESS: 'Business Class',
};

export const generateWhatsAppText = (
  params: EstimateParams,
  breakdown: BudgetBreakdown,
  display: BreakdownDisplay,
  title?: string | null,
): string => {
  const lines: string[] = [];

  lines.push('🕋 *ESTIMASI BIAYA UMROH*');
  if (title) lines.push(`_${title}_`);
  lines.push('━━━━━━━━━━━━━━━━━');
  lines.push(`📅 Madinah: ${params.nightsMadinah} malam | Makkah: ${params.nightsMakkah} malam`);
  lines.push(`👥 Jamaah: ${params.pax} orang (${params.roomType})`);
  lines.push(`🏨 Hotel Madinah: ${breakdown.hotelMadinahDetail.label}`);
  lines.push(`🏨 Hotel Makkah: ${breakdown.hotelMakkahDetail.label}`);
  lines.push(`✈️ Pesawat: ${AIRLINE_LABELS[params.airline] ?? params.airline}`);
  lines.push('');
  lines.push(`💰 *RINCIAN PER ORANG*${basisNote(display)}`);

  for (const r of display.rows) {
    if (r.hidden) continue;
    lines.push(`• ${exportLabel(r)}`);
    const calc = rowCalc(r, params.pax);
    if (calc) lines.push(`  ${calc}`);
    lines.push(`  ${rp(r.idr)}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━');
  lines.push(`*TOTAL PER ORANG: ${rp(display.totalIdrPax)}*`);
  if (params.pax > 1) {
    lines.push(`*TOTAL ${params.pax} ORANG: ${rp(display.totalIdrGrp)}*`);
  }

  lines.push('');
  lines.push(kursLine(display));
  lines.push(`⚠️ ${EXPORT_NOTES.exclusions}`);
  lines.push(EXPORT_NOTES.priceChange);
  lines.push(EXPORT_NOTES.contact);

  return lines.join('\n');
};

export const buildWhatsAppMessage = (
  display: BreakdownDisplay,
  params: EstimateParams,
  pax: number,
): string => {
  const lines: string[] = [];
  const totalDays = params.nightsMadinah + params.nightsMakkah;
  const month = travelMonthLabel(params.travelMonth);
  const monthLabel = month ? ` di bulan ${month}` : '';

  lines.push("Assalamu'alaikum, berikut estimasi biaya Umroh yang Kakak minta:");
  lines.push('');
  lines.push(`🕋 Umroh ${totalDays} hari untuk ${pax} orang${monthLabel}`);

  const madinahRow = display.rows.find((r) => r.key === HOTEL_MADINAH_ROW_KEY);
  const makkahRow = display.rows.find((r) => r.key === HOTEL_MAKKAH_ROW_KEY);
  const madinahHotel = madinahRow?.hotelDetail ? ` di ${madinahRow.hotelDetail.label}` : '';
  const makkahHotel = makkahRow?.hotelDetail ? ` di ${makkahRow.hotelDetail.label}` : '';
  lines.push(`🏨 Madinah: ${params.nightsMadinah} malam${madinahHotel}`);
  lines.push(`🏨 Makkah: ${params.nightsMakkah} malam${makkahHotel}`);

  lines.push('');
  lines.push(`*Total per orang: ${rp(display.totalIdrPax)}*`);
  if (pax > 1) lines.push(`*Total ${pax} orang: ${rp(display.totalIdrGrp)}*`);

  lines.push('');
  lines.push(EXPORT_NOTES.exclusions);
  lines.push(EXPORT_NOTES.priceChange);
  lines.push(EXPORT_NOTES.contact);

  return lines.join('\n');
};
