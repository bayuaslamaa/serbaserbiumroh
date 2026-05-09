import { asc, desc } from "drizzle-orm"
import type {
  EstimateParams,
  BudgetBreakdown,
  PricingConfig,
  ServiceKey,
  HotelPriceConfig,
  AirlinePriceConfig,
} from "@/types"

function formatAmountDisplay(currency: string, amount: number): string {
  if (currency === "USD") return `$${amount}`
  if (currency === "SAR") return `SAR ${amount}`
  // IDR
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function resolveHotelSar(config: HotelPriceConfig, travelMonth?: number): number {
  if (travelMonth != null) {
    const monthly = config.monthlyPrices[travelMonth]
    if (monthly != null) return monthly
  }
  return config.sarPerNight
}

function resolveAirlineIdr(config: AirlinePriceConfig, travelMonth?: number): number {
  if (travelMonth != null) {
    const monthly = config.monthlyPrices?.[travelMonth]
    if (monthly != null) return monthly
  }
  return config.idr
}

export function calculateBudget(params: EstimateParams, pricing: PricingConfig): BudgetBreakdown {
  const sarRate = pricing.rates.SAR
  const usdRate = pricing.rates.USD

  const madinahHotel = pricing.hotels.MADINAH[params.hotelTier]
  const makkahHotel = pricing.hotels.MAKKAH[params.hotelTier]
  const room = pricing.roomMultipliers[params.roomType]

  const hotelMadinahIdr = Math.round(
    (resolveHotelSar(madinahHotel, params.travelMonth) * params.nightsMadinah * room.multiplier / room.paxPerRoom) * sarRate
  )
  const hotelMakkahIdr = Math.round(
    (resolveHotelSar(makkahHotel, params.travelMonth) * params.nightsMakkah * room.multiplier / room.paxPerRoom) * sarRate
  )

  const serviceItems: BudgetBreakdown["serviceItems"] = []
  let servicesIdr = 0

  for (const key of params.services) {
    const svc = pricing.services[key as ServiceKey]
    if (!svc || !svc.enabled) continue

    let idr: number
    if (svc.currency === "SAR") {
      idr = Math.round(svc.amount * sarRate)
    } else if (svc.currency === "USD") {
      idr = Math.round(svc.amount * usdRate)
    } else {
      idr = svc.amount
    }

    if (svc.divideByPax && params.pax > 1) {
      idr = Math.round(idr / params.pax)
    }

    servicesIdr += idr
    serviceItems.push({
      key: key as ServiceKey,
      label: svc.label,
      amountDisplay: formatAmountDisplay(svc.currency, svc.amount),
      idr,
      divideByPax: svc.divideByPax,
    })
  }

  const flightIdr = resolveAirlineIdr(pricing.airlines[params.airline], params.travelMonth)
  const totalIdrPax = hotelMadinahIdr + hotelMakkahIdr + servicesIdr + flightIdr
  const totalIdrGrp = totalIdrPax * params.pax

  return {
    hotelMadinahIdr,
    hotelMakkahIdr,
    servicesIdr,
    serviceItems,
    flightIdr,
    totalIdrPax,
    totalIdrGrp,
    sarRate,
    usdRate,
  }
}

export async function fetchPricingConfig(db: import("@/lib/db").DB): Promise<PricingConfig> {
  const {
    exchangeRates,
    hotelPrices,
    airlinePrices,
    serviceFees,
    roomMultipliers,
    hotelMonthlyPrices,
    airlineMonthlyPrices,
  } = await import("@/lib/db/schema")
  const [rates, hotels, airlines, services, rooms, monthlyPrices, airlineMonthlyRows] = await Promise.all([
    db.select().from(exchangeRates),
    db.select().from(hotelPrices).orderBy(asc(hotelPrices.updatedAt)),
    db.select().from(airlinePrices).orderBy(desc(airlinePrices.isDefault), asc(airlinePrices.updatedAt)),
    db.select().from(serviceFees),
    db.select().from(roomMultipliers),
    db.select().from(hotelMonthlyPrices),
    db.select().from(airlineMonthlyPrices),
  ])

  const ratesMap: Record<string, number> = {}
  for (const r of rates) ratesMap[r.currency] = r.rateToIdr

  const monthlyByHotelId: Record<string, Record<number, number>> = {}
  for (const mp of monthlyPrices) {
    if (!monthlyByHotelId[mp.hotelPriceId]) monthlyByHotelId[mp.hotelPriceId] = {}
    monthlyByHotelId[mp.hotelPriceId][mp.month] = mp.sarPerNight
  }

  const hotelsMap: PricingConfig["hotels"] = {} as PricingConfig["hotels"]
  for (const h of hotels) {
    if (!hotelsMap[h.city]) hotelsMap[h.city] = {} as PricingConfig["hotels"][typeof h.city]
    hotelsMap[h.city][h.tier] = {
      sarPerNight: h.sarPerNight,
      label: h.label,
      sublabel: h.sublabel,
      monthlyPrices: monthlyByHotelId[h.id] ?? {},
    }
  }

  const airlinesMap: PricingConfig["airlines"] = {} as PricingConfig["airlines"]
  const airlineOptionsMap: NonNullable<PricingConfig["airlineOptions"]> = {} as NonNullable<PricingConfig["airlineOptions"]>
  const monthlyByAirlineId: Record<string, Record<number, number>> = {}
  for (const mp of airlineMonthlyRows) {
    if (!monthlyByAirlineId[mp.airlinePriceId]) monthlyByAirlineId[mp.airlinePriceId] = {}
    monthlyByAirlineId[mp.airlinePriceId][mp.month] = mp.idr
  }

  for (const a of airlines) {
    const config = {
      id: a.id,
      tier: a.tier,
      idr: a.idr,
      label: a.label,
      sublabel: a.sublabel,
      isDefault: a.isDefault,
      monthlyPrices: monthlyByAirlineId[a.id] ?? {},
    }
    if (!airlineOptionsMap[a.tier]) {
      airlineOptionsMap[a.tier] = []
    }
    airlineOptionsMap[a.tier].push(config)

    if (a.isDefault || !airlinesMap[a.tier]) {
      airlinesMap[a.tier] = config
    }
  }

  const servicesMap: PricingConfig["services"] = {} as PricingConfig["services"]
  for (const s of services) {
    servicesMap[s.key] = {
      currency: s.currency,
      amount: s.amount,
      label: s.label,
      enabled: s.enabled,
      divideByPax: s.divideByPax,
    }
  }

  const roomsMap: PricingConfig["roomMultipliers"] = {} as PricingConfig["roomMultipliers"]
  for (const r of rooms) {
    roomsMap[r.type as keyof PricingConfig["roomMultipliers"]] = {
      paxPerRoom: r.paxPerRoom,
      multiplier: parseFloat(r.multiplier),
    }
  }

  return {
    rates: ratesMap,
    hotels: hotelsMap,
    airlines: airlinesMap,
    airlineOptions: airlineOptionsMap,
    services: servicesMap,
    roomMultipliers: roomsMap,
  }
}
