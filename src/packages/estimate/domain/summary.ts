import type { BreakdownDisplay, BreakdownDisplayRow } from '@/shared/types';

export const rp = (amount: number): string => {
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

export const exportLabel = (row: BreakdownDisplayRow): string => {
  if (row.source === 'computed' && row.amountDisplay) {
    const suffix = ` (${row.amountDisplay})`;
    if (row.label.endsWith(suffix)) return row.label.slice(0, -suffix.length);
  }
  return row.label;
};

export const rowCalc = (
  row: BreakdownDisplayRow,
  pax: number,
  symbols: { times: string; div: string } = { times: '×', div: '÷' },
): string => {
  const { times, div } = symbols;
  if (row.hotelDetail) {
    const d = row.hotelDetail;
    const rooms = d.roomCount > 1 ? ` ${times} ${d.roomCount} kamar` : '';
    const mult = d.roomMultiplier === 1 ? '' : ` ${times} ${d.roomMultiplier}`;
    return `SAR ${d.sarPerNight.toLocaleString('id-ID')} ${times} ${d.nights} malam${rooms}${mult} ${div} ${d.totalPax} pax`;
  }
  if (row.amountDisplay && row.unitCurrency !== 'IDR') {
    const shared = row.shared && pax > 1 ? ` ${div} ${pax} pax` : '';
    return `${row.amountDisplay}${shared}`;
  }
  return '';
};

export const roomBasisPax = (display: BreakdownDisplay): number | null => {
  return display.rows.find((r) => !r.hidden && r.hotelDetail)?.hotelDetail?.roomPax ?? null;
};

export const basisNote = (display: BreakdownDisplay): string => {
  const basis = roomBasisPax(display);
  return basis ? ` (basis ${basis} orang/kamar)` : '';
};

export const kursLine = (display: BreakdownDisplay): string => {
  return `Kurs: SAR 1 = ${rp(display.sarRate)} | USD 1 = ${rp(display.usdRate)}`;
};

export const MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const travelMonthLabel = (travelMonth: number | undefined): string | null => {
  if (travelMonth == null || travelMonth < 1 || travelMonth > 12) return null;
  return MONTH_NAMES[travelMonth];
};

export const EXPORT_NOTES = {
  exclusions: 'Belum termasuk biaya tak terduga, perlengkapan, handling, dan manasik',
  priceChange: 'Harga dapat berubah sewaktu-waktu',
  contact: 'Kunci harga ini dengan DP tanda jadi. Konfirmasi via WA: 085172117757 / 085161134844',
} as const;
