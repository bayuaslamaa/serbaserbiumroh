import type {
  City,
  EstimateParams,
  HotelOptionConfig,
  HotelTier,
  PricingConfig,
} from '@/shared/types';

const HOTEL_TIERS: HotelTier[] = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'];

const fallbackHotelOptions = (pricing: PricingConfig, city: City): HotelOptionConfig[] => {
  return HOTEL_TIERS.map((tier) => ({
    id: `${city}:${tier}`,
    city,
    tier,
    sarPerNight: pricing.hotels[city][tier].sarPerNight,
    label: pricing.hotels[city][tier].label,
    sublabel: pricing.hotels[city][tier].sublabel,
    monthlyPrices: pricing.hotels[city][tier].monthlyPrices,
  }));
};

export const resolveCityHotelOptions = (
  pricing: PricingConfig,
  city: City,
): HotelOptionConfig[] => {
  return pricing.hotelOptions?.[city]?.length
    ? pricing.hotelOptions[city]
    : fallbackHotelOptions(pricing, city);
};

export const resolveHotelSelection = (
  city: City,
  hotelId: string,
  pricing: PricingConfig,
): Partial<EstimateParams> | undefined => {
  const hotel = resolveCityHotelOptions(pricing, city).find((option) => option.id === hotelId);
  if (!hotel) return undefined;

  const isConcreteHotel =
    pricing.hotelOptions?.[city]?.some((option) => option.id === hotel.id) ?? false;
  const patch: Partial<EstimateParams> = { hotelTier: hotel.tier };
  if (city === 'MAKKAH') {
    patch.makkahHotelId = isConcreteHotel ? hotel.id : undefined;
  } else {
    patch.madinahHotelId = isConcreteHotel ? hotel.id : undefined;
  }
  return patch;
};
