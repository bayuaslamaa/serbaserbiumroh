// Core domain enums
export type City = "MAKKAH" | "MADINAH"
export type HotelTier = "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
export type RoomType = "QUAD" | "TRIPLE" | "DOUBLE" | "SINGLE"
export type AirlineTier = "BUDGET" | "STANDARD" | "GARUDA" | "BUSINESS"
export type ServiceKey =
  | "VISA"
  | "SISKOPATUH"
  | "TASREH"
  | "TRANSPORT"
  | "TOUR_MAKKAH"
  | "TOUR_MADINAH"

// Core estimation parameters (stored as JSONB snapshot in estimates table)
export interface EstimateParams {
  nightsMadinah: number
  nightsMakkah: number
  pax: number
  hotelTier: HotelTier
  madinahHotelId?: string
  makkahHotelId?: string
  roomType: RoomType
  airline: AirlineTier
  services: ServiceKey[]
  fullboard: boolean
  travelMonth?: number // 1-12, optional — falls back to base sarPerNight when omitted
}

// Budget breakdown (computed, not stored directly)
export interface BudgetBreakdown {
  hotelMadinahIdr: number
  hotelMakkahIdr: number
  hotelMadinahDetail: HotelCostDetail
  hotelMakkahDetail: HotelCostDetail
  servicesIdr: number
  serviceItems: {
    key: ServiceKey
    label: string
    amountDisplay: string
    idr: number
    divideByPax: boolean
  }[]
  flightIdr: number
  totalIdrPax: number
  totalIdrGrp: number
  sarRate: number
  usdRate: number
}

// Aggregated pricing config used by calculateBudget
export interface RoomMultiplierConfig {
  paxPerRoom: number
  multiplier: number
}

export interface HotelPriceConfig {
  sarPerNight: number
  label: string
  sublabel: string
  monthlyPrices: Record<number, number> // month 1-12 → sarPerNight override
}

export interface HotelOptionConfig extends HotelPriceConfig {
  id: string
  city: City
  tier: HotelTier
}

export interface HotelCostDetail {
  id?: string
  label: string
  tier: HotelTier
  sarPerNight: number
  nights: number
  roomPax: number
  roomMultiplier: number
}

export interface AirlinePriceConfig {
  id?: string
  tier?: AirlineTier
  idr: number
  label: string
  sublabel?: string | null
  isDefault?: boolean
  monthlyPrices?: Record<number, number> // month 1-12 → IDR override
}

export interface ServiceFeeConfig {
  currency: string
  amount: number
  label: string
  enabled: boolean
  divideByPax: boolean
}

export interface PricingConfig {
  rates: Record<string, number> // { SAR: 4700, USD: 17300 }
  hotels: Record<City, Record<HotelTier, HotelPriceConfig>>
  hotelOptions?: Record<City, HotelOptionConfig[]>
  airlines: Record<AirlineTier, AirlinePriceConfig>
  airlineOptions?: Record<AirlineTier, AirlinePriceConfig[]>
  services: Record<ServiceKey, ServiceFeeConfig>
  roomMultipliers: Record<RoomType, RoomMultiplierConfig>
}

// Default estimate params (per PRD §6.2 defaults)
export const DEFAULT_PARAMS: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH", "TRANSPORT"],
  fullboard: true,
}
