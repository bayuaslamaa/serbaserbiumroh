// Shared between ParamsPanel and HotelPicker so the "which SAR/night rate to show" resolution
// stays in one place — the two consumers must never diverge on this behavior.
export function resolveMonthlyHotelSar(
  config: { sarPerNight: number; monthlyPrices: Record<number, number> },
  month?: number
): number {
  if (month != null && config.monthlyPrices[month] != null) return config.monthlyPrices[month]
  return config.sarPerNight
}

export function sarLabel(amount: number): string {
  return `SAR ${amount}/mlm`
}
