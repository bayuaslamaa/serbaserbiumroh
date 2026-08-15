export interface MonthlyPriceDetail {
  month: number;
  sar: number;
  idr: number;
  isOverride: boolean;
}

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ags',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

export const MONTH_NAMES_FULL = [
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

export const buildMonthlyPrices = (
  sarPerNight: number,
  overridesByMonth: Record<number, number | undefined>,
  sarToIdrRate: number,
): MonthlyPriceDetail[] => {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const override = overridesByMonth[month];
    const isOverride = override !== undefined && override !== null;
    const sar = isOverride ? override : sarPerNight;

    return { month, sar, idr: sar * sarToIdrRate, isOverride };
  });
};

export const formatFullIdr = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactIdr = (amount: number): string => {
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    return `Rp ${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  }
  return `Rp ${amount}`;
};

const sarFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const formatSar = (amount: number): string => {
  return `SAR ${sarFormatter.format(amount)}`;
};

const importDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const formatImportDate = (value: Date): string => {
  return importDateFormatter.format(value);
};

export const priceRange = (monthlyPrices: MonthlyPriceDetail[]) => {
  if (monthlyPrices.length === 0) return null;

  const idrValues = monthlyPrices.map((p) => p.idr);
  return { min: Math.min(...idrValues), max: Math.max(...idrValues) };
};
