import type { City, HotelTier } from "@/types"

interface PriceRow {
  id: string
  city: City
  tier: HotelTier
  sarPerNight: number
  updatedAt: Date
}

function compareBaselinePriceRows(a: PriceRow, b: PriceRow) {
  const updatedDiff = a.updatedAt.getTime() - b.updatedAt.getTime()
  if (updatedDiff !== 0) return updatedDiff
  return a.id.localeCompare(b.id)
}

export function buildHotelNusukPriceMap(prices: PriceRow[], sarToIdrRate: number): Record<string, number> {
  const baselineByKey = new Map<string, PriceRow>()

  for (const price of prices) {
    const key = `${price.city}_${price.tier}`
    const current = baselineByKey.get(key)
    if (!current || compareBaselinePriceRows(price, current) < 0) {
      baselineByKey.set(key, price)
    }
  }

  const priceMap: Record<string, number> = {}
  for (const [key, price] of baselineByKey) {
    priceMap[key] = price.sarPerNight * sarToIdrRate
  }

  return priceMap
}
