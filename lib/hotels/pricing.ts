export interface MonthlyPriceDetail {
  month: number
  sar: number
  idr: number
  isOverride: boolean
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
] as const

export const MONTH_NAMES_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const

/**
 * Expands a hotel's base nightly rate into twelve months, applying whatever
 * seasonal overrides exist.
 *
 * Extracted from the directory page so the detail page cannot drift from it --
 * two pages quoting different prices for the same hotel is worse than either
 * price being wrong.
 */
export function buildMonthlyPrices(
  sarPerNight: number,
  overridesByMonth: Record<number, number | undefined>,
  sarToIdrRate: number,
): MonthlyPriceDetail[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const override = overridesByMonth[month]
    const isOverride = override !== undefined && override !== null
    const sar = isOverride ? override : sarPerNight

    return { month, sar, idr: sar * sarToIdrRate, isOverride }
  })
}

export function formatFullIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCompactIdr(amount: number): string {
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000
    return `Rp ${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}jt`
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`
  }
  return `Rp ${amount}`
}

/**
 * A bare SAR figure with Indonesian thousands separators.
 *
 * Deliberately not sarLabel from lib/estimate/hotel-pricing.ts: that one bakes
 * in a "/mlm" suffix, which repeats once per cell in a month-by-room-type
 * table where the heading already says what the figure is per.
 */
export function formatSar(amount: number): string {
  return `SAR ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount)}`
}

/** Lowest and highest monthly rate, used to summarise a hotel in one line. */
export function priceRange(monthlyPrices: MonthlyPriceDetail[]) {
  if (monthlyPrices.length === 0) return null

  const idrValues = monthlyPrices.map((p) => p.idr)
  return { min: Math.min(...idrValues), max: Math.max(...idrValues) }
}
