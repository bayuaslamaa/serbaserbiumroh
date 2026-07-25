import type { EstimateParams } from "@/types"

export const MIN_TRIP_DAYS = 5
export const MAX_TRIP_DAYS = 30

export function totalTripDaysToNights(totalDays: number): { nightsMadinah: number; nightsMakkah: number } {
  const nightsMadinah = Math.min(4, totalDays - 1)
  const nightsMakkah = totalDays - nightsMadinah
  return { nightsMadinah, nightsMakkah }
}

export function totalTripDays(params: Pick<EstimateParams, "nightsMadinah" | "nightsMakkah">): number {
  return params.nightsMadinah + params.nightsMakkah
}
