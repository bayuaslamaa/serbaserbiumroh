export type City = 'MAKKAH' | 'MADINAH';
export type HotelTier = 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM';
export type RoomType = 'QUINT' | 'QUAD' | 'TRIPLE' | 'DOUBLE';
export type AirlineTier = 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS';
export type EstimateAirline = AirlineTier | 'NONE';
export const SERVICE_KEYS = [
  'VISA',
  'SISKOPATUH',
  'TASREH',
  'TRANSPORT_JED_MAKKAH',
  'TRANSPORT_JED_MADINAH',
  'TRANSPORT_MAKKAH_MADINAH',
  'TRANSPORT_MAKKAH_JED',
  'TRANSPORT_MADINAH_JED',
  'TOUR_MAKKAH',
  'TOUR_MADINAH',
  'MUTHOWIF',
] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export interface EstimateParams {
  nightsMadinah: number;
  nightsMakkah: number;
  pax: number;
  hotelTier: HotelTier;
  madinahHotelId?: string;
  makkahHotelId?: string;
  roomType: RoomType;
  airline: EstimateAirline;
  services: ServiceKey[];
  fullboard: boolean;
  travelMonth?: number;
}

export interface BudgetBreakdown {
  hotelMadinahIdr: number;
  hotelMakkahIdr: number;
  hotelMadinahDetail: HotelCostDetail;
  hotelMakkahDetail: HotelCostDetail;
  servicesIdr: number;
  serviceItems: {
    key: ServiceKey;
    label: string;
    amountDisplay: string;
    unitAmount: number;
    currency: string;
    idr: number;
    divideByPax: boolean;
  }[];
  flightIdr: number;
  totalIdrPax: number;
  totalIdrGrp: number;
  sarRate: number;
  usdRate: number;
}

export const HOTEL_MADINAH_ROW_KEY = 'hotelMadinah';
export const HOTEL_MAKKAH_ROW_KEY = 'hotelMakkah';
export const FLIGHT_ROW_KEY = 'flight';
export const serviceRowKey = (key: ServiceKey): string => {
  return `service:${key}`;
};

export interface RowOverride {
  label?: string;
  idr?: number;
  unitPrice?: number;
  hidden?: boolean;
  autoIdrAtOverride?: number;
}

export interface CustomRow {
  id: string;
  label: string;
  idr: number;
}

export interface ManualOverrides {
  overrides: Record<string, RowOverride>;
  customRows: CustomRow[];
}

export interface BreakdownDisplayRow {
  key: string;
  label: string;
  shortLabel: string;
  amountDisplay?: string;
  unitPrice: number;
  unitCurrency: string;
  unitEditable: boolean;
  idr: number;
  hotelDetail?: HotelCostDetail;
  shared: boolean;
  hidden: boolean;
  stale: boolean;
  source: 'computed' | 'overridden' | 'custom';
}

export interface BreakdownDisplay {
  rows: BreakdownDisplayRow[];
  totalIdrPax: number;
  totalIdrGrp: number;
  sarRate: number;
  usdRate: number;
}

export interface RoomMultiplierConfig {
  paxPerRoom: number;
  multiplier: number;
}

export interface RealHotelPrice {
  sarPerNight: number;
  sourceLabel: string;
}

export interface HotelPriceConfig {
  sarPerNight: number;
  label: string;
  sublabel: string;
  distance?: string | null;
  agodaUrl?: string | null;
  bookingcomUrl?: string | null;
  tripcomUrl?: string | null;
  bookingUrl?: string | null;
  monthlyPrices: Record<number, number>;
  realMonthlyPrices?: Record<number, Partial<Record<RoomType, RealHotelPrice>>>;
}

export interface HotelOptionConfig extends HotelPriceConfig {
  id: string;
  city: City;
  tier: HotelTier;
}

export interface HotelCostDetail {
  id?: string;
  label: string;
  tier: HotelTier;
  sarPerNight: number;
  nights: number;
  roomPax: number;
  roomCount: number;
  totalPax: number;
  roomMultiplier: number;
  priceSource?: 'real' | 'estimate';
  priceSourceLabel?: string;
}

export interface AirlinePriceConfig {
  id?: string;
  tier?: AirlineTier;
  idr: number;
  label: string;
  sublabel?: string | null;
  isDefault?: boolean;
  monthlyPrices?: Record<number, number>;
}

export interface ServiceFeeConfig {
  currency: string;
  amount: number;
  label: string;
  enabled: boolean;
  divideByPax: boolean;
}

export interface PricingConfig {
  rates: Record<string, number>;
  hotels: Record<City, Record<HotelTier, HotelPriceConfig>>;
  hotelOptions?: Record<City, HotelOptionConfig[]>;
  airlines: Record<AirlineTier, AirlinePriceConfig>;
  airlineOptions?: Record<AirlineTier, AirlinePriceConfig[]>;
  services: Record<ServiceKey, ServiceFeeConfig>;
  roomMultipliers: Record<RoomType, RoomMultiplierConfig>;
}

export const DEFAULT_PARAMS: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 9,
  pax: 1,
  hotelTier: 'STANDARD',
  roomType: 'QUAD',
  airline: 'STANDARD',
  services: [
    'VISA',
    'SISKOPATUH',
    'TRANSPORT_JED_MAKKAH',
    'TRANSPORT_MAKKAH_MADINAH',
    'TRANSPORT_MADINAH_JED',
    'MUTHOWIF',
  ],
  fullboard: true,
};
