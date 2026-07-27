// Core domain enums
export type City = "MAKKAH" | "MADINAH"
export type HotelTier = "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
export type RoomType = "QUINT" | "QUAD" | "TRIPLE" | "DOUBLE"
export type AirlineTier = "BUDGET" | "STANDARD" | "GARUDA" | "BUSINESS"
export type EstimateAirline = AirlineTier | "NONE"
// Order here is the order the services are offered in — the pickers and the exports walk this
// list. Transport is quoted per leg: an itinerary uses three of the five (a trip arrives at
// Jeddah once and leaves once), so JED_MAKKAH/JED_MADINAH are alternatives, as are the two
// return legs.
//
// The retired all-or-nothing TRANSPORT key is deliberately absent: this constant is what the
// estimator offers and what the API validates against. Saved estimates still name it, and the
// Postgres enum still accepts it (an enum value cannot be dropped), so it is resolved on read by
// `normaliseServices` in lib/estimate/services.ts rather than being recognised here.
export const SERVICE_KEYS = [
  "VISA",
  "SISKOPATUH",
  "TASREH",
  "TRANSPORT_JED_MAKKAH",
  "TRANSPORT_JED_MADINAH",
  "TRANSPORT_MAKKAH_MADINAH",
  "TRANSPORT_MAKKAH_JED",
  "TRANSPORT_MADINAH_JED",
  "TOUR_MAKKAH",
  "TOUR_MADINAH",
  "MUTHOWIF",
] as const
export type ServiceKey = (typeof SERVICE_KEYS)[number]

// Core estimation parameters (stored as JSONB snapshot in estimates table)
export interface EstimateParams {
  nightsMadinah: number
  nightsMakkah: number
  pax: number
  hotelTier: HotelTier
  madinahHotelId?: string
  makkahHotelId?: string
  roomType: RoomType
  airline: EstimateAirline
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
    unitAmount: number // native per-unit price (e.g. 165 for $165, 325 for SAR 325)
    currency: string // "SAR" | "USD" | "IDR" — currency the unitAmount is expressed in
    idr: number
    divideByPax: boolean
  }[]
  flightIdr: number
  totalIdrPax: number
  totalIdrGrp: number
  sarRate: number
  usdRate: number
}

// --- Manual overrides (spreadsheet-style editing of the computed breakdown) ---

// Canonical row keys used to pin overrides to computed breakdown rows.
// Stable across parameter recomputes so overrides stay sticky (R5).
export const HOTEL_MADINAH_ROW_KEY = "hotelMadinah"
export const HOTEL_MAKKAH_ROW_KEY = "hotelMakkah"
export const FLIGHT_ROW_KEY = "flight"
export function serviceRowKey(key: ServiceKey): string {
  return `service:${key}`
}

// A manual override applied to one computed row, keyed by its canonical row key.
// `idr` (final per-person amount) and `unitPrice` (native unit rate) are mutually
// exclusive value sources: editing one clears the other. When unitPrice is set the
// per-person amount is re-derived live via linear scaling in applyOverrides.
export interface RowOverride {
  label?: string // rename the row
  idr?: number // override the per-person amount directly
  unitPrice?: number // override the native unit price (SAR/USD/IDR) → value recomputes
  hidden?: boolean // remove the row from totals (still shown struck-through with a reset)
  autoIdrAtOverride?: number // auto-computed idr captured when the override was set → staleness detection
}

// A custom line-item the admin adds (e.g. "Manasik", "Handling").
export interface CustomRow {
  id: string
  label: string
  idr: number
}

// Persisted override layer (stored as JSONB on estimates.manual_overrides; null = no edits).
export interface ManualOverrides {
  overrides: Record<string, RowOverride>
  customRows: CustomRow[]
}

// One row of the merged, override-aware display model consumed by UI + exports.
export interface BreakdownDisplayRow {
  key: string
  label: string // verbose label for UI/PDF, e.g. "Hotel Madinah - Emaar Group"
  shortLabel: string // compact label for WhatsApp, e.g. "Hotel Madinah:"
  amountDisplay?: string // foreign-currency display for services, e.g. "SAR 200"; undefined for plain IDR / overridden rows
  unitPrice: number // native per-unit rate shown in the editable "Harga satuan" column
  unitCurrency: string // "SAR" | "USD" | "IDR" — currency the unitPrice is expressed in
  unitEditable: boolean // false when the unit price can't scale (foreign-currency row with a 0 base) → input is disabled
  idr: number // per-person amount shown in the row
  hotelDetail?: HotelCostDetail // present on auto (non-amount-overridden) hotel rows so each surface renders its own formula
  shared: boolean // divide-by-pax service; drives the ÷pax badge
  hidden: boolean
  stale: boolean // override captured against an auto value that has since changed
  source: "computed" | "overridden" | "custom"
}

// Full override-aware display model returned by applyOverrides.
export interface BreakdownDisplay {
  rows: BreakdownDisplayRow[]
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
  distance?: string | null
  agodaUrl?: string | null
  bookingcomUrl?: string | null
  tripcomUrl?: string | null
  bookingUrl?: string | null
  monthlyPrices: Record<number, number> // month 1-12 → sarPerNight override (estimate)
  // month 1-12 → authoritative catalog price (real). Optional: absent/undefined means no real
  // price is known, so resolution falls back to the estimate. fetchPricingConfig always sets it.
  realMonthlyPrices?: Record<number, number>
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
  roomCount: number
  totalPax: number
  roomMultiplier: number
  priceSource?: "real" | "estimate" // which layer priced this hotel; undefined treated as estimate
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
  // The three legs the default itinerary actually requires: 4 nights Madinah + 9 Makkah means the
  // group flies into Jeddah, transfers to Makkah, moves to Madinah, and returns to Jeddah. Quoting
  // only the airport transfer would understate every fresh estimate by 1.100 SAR, and these quotes
  // go straight to customers — so the default covers the trip and the operator unticks what a
  // given group skips. Deliberately identical to what the retired TRANSPORT key expands to
  // (see lib/estimate/services.ts), so a saved estimate and a new one price transport alike.
  services: [
    "VISA",
    "SISKOPATUH",
    "TRANSPORT_JED_MAKKAH",
    "TRANSPORT_MAKKAH_MADINAH",
    "TRANSPORT_MADINAH_JED",
    "MUTHOWIF",
  ],
  fullboard: true,
}
