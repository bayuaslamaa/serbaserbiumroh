import { asc, desc } from 'drizzle-orm';
import { resolveHotelSar } from '@/packages/estimate/domain/hotel-pricing';
import { ROOM_TYPES, resolveRoomMultiplier } from '@/packages/estimate/domain/room-types';
import { isServiceKey, normaliseServices } from '@/packages/estimate/domain/services';
import type {
  EstimateParams,
  BudgetBreakdown,
  PricingConfig,
  ServiceKey,
  HotelPriceConfig,
  City,
  HotelTier,
  RoomType,
  RealHotelPrice,
  AirlinePriceConfig,
} from '@/shared/types';

type ResolvedHotelConfig = HotelPriceConfig & {
  id?: string;
  city: City;
  tier: HotelTier;
};

const formatAmountDisplay = (currency: string, amount: number): string => {
  if (currency === 'USD') return `$${amount.toLocaleString('id-ID')}`;
  if (currency === 'SAR') return `SAR ${amount.toLocaleString('id-ID')}`;
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

const resolveCityHotel = (
  pricing: PricingConfig,
  city: City,
  selectedId: string | undefined,
  fallbackTier: HotelTier,
): ResolvedHotelConfig => {
  const selected = pricing.hotelOptions?.[city]?.find((hotel) => hotel.id === selectedId);
  if (selected) return selected;

  const fallback = pricing.hotels[city][fallbackTier];
  return {
    city,
    tier: fallbackTier,
    sarPerNight: fallback.sarPerNight,
    label: fallback.label,
    sublabel: fallback.sublabel,
    monthlyPrices: fallback.monthlyPrices,
    realMonthlyPrices: fallback.realMonthlyPrices,
  };
};

const resolveAirlineIdr = (config: AirlinePriceConfig, travelMonth?: number): number => {
  if (travelMonth != null) {
    const monthly = config.monthlyPrices?.[travelMonth];
    if (monthly != null) return monthly;
  }
  return config.idr;
};

const calculateHotelIdrPerPerson = (
  sarPerNight: number,
  nights: number,
  roomMultiplier: number,
  roomPax: number,
  pax: number,
  sarRate: number,
): { idrPerPerson: number; roomCount: number } => {
  const roomCount = Math.max(1, Math.ceil(pax / roomPax));
  const totalIdr = sarPerNight * nights * roomMultiplier * roomCount * sarRate;
  return {
    idrPerPerson: Math.round(totalIdr / pax),
    roomCount,
  };
};

export const calculateBudget = (
  params: EstimateParams,
  pricing: PricingConfig,
): BudgetBreakdown => {
  const sarRate = pricing.rates.SAR;
  const usdRate = pricing.rates.USD;

  const madinahHotel = resolveCityHotel(
    pricing,
    'MADINAH',
    params.madinahHotelId,
    params.hotelTier,
  );
  const makkahHotel = resolveCityHotel(pricing, 'MAKKAH', params.makkahHotelId, params.hotelTier);
  const resolvedRoom = resolveRoomMultiplier(pricing, params.roomType);
  const room = resolvedRoom.config;
  const madinahPrice = resolveHotelSar(madinahHotel, resolvedRoom.roomType, params.travelMonth);
  const makkahPrice = resolveHotelSar(makkahHotel, resolvedRoom.roomType, params.travelMonth);
  const madinahSarPerNight = madinahPrice.sarPerNight;
  const makkahSarPerNight = makkahPrice.sarPerNight;

  const madinahMultiplier = madinahPrice.roomTypePriced ? 1 : room.multiplier;
  const makkahMultiplier = makkahPrice.roomTypePriced ? 1 : room.multiplier;

  const madinahHotelCost = calculateHotelIdrPerPerson(
    madinahSarPerNight,
    params.nightsMadinah,
    madinahMultiplier,
    room.paxPerRoom,
    params.pax,
    sarRate,
  );
  const makkahHotelCost = calculateHotelIdrPerPerson(
    makkahSarPerNight,
    params.nightsMakkah,
    makkahMultiplier,
    room.paxPerRoom,
    params.pax,
    sarRate,
  );

  const hotelMadinahIdr = madinahHotelCost.idrPerPerson;
  const hotelMakkahIdr = makkahHotelCost.idrPerPerson;

  const serviceItems: BudgetBreakdown['serviceItems'] = [];
  let servicesIdr = 0;

  for (const key of normaliseServices(params.services)) {
    const svc = pricing.services[key as ServiceKey];
    if (!svc || !svc.enabled) continue;

    let idr: number;
    if (svc.currency === 'SAR') {
      idr = Math.round(svc.amount * sarRate);
    } else if (svc.currency === 'USD') {
      idr = Math.round(svc.amount * usdRate);
    } else {
      idr = svc.amount;
    }

    if (svc.divideByPax && params.pax > 1) {
      idr = Math.round(idr / params.pax);
    }

    servicesIdr += idr;
    serviceItems.push({
      key: key as ServiceKey,
      label: svc.label,
      amountDisplay: formatAmountDisplay(svc.currency, svc.amount),
      unitAmount: svc.amount,
      currency: svc.currency,
      idr,
      divideByPax: svc.divideByPax,
    });
  }

  const flightIdr =
    params.airline === 'NONE'
      ? 0
      : resolveAirlineIdr(pricing.airlines[params.airline], params.travelMonth);
  const totalIdrPax = hotelMadinahIdr + hotelMakkahIdr + servicesIdr + flightIdr;
  const totalIdrGrp = totalIdrPax * params.pax;

  return {
    hotelMadinahIdr,
    hotelMakkahIdr,
    hotelMadinahDetail: {
      id: madinahHotel.id,
      label: madinahHotel.label,
      tier: madinahHotel.tier,
      sarPerNight: madinahSarPerNight,
      nights: params.nightsMadinah,
      roomPax: room.paxPerRoom,
      roomCount: madinahHotelCost.roomCount,
      totalPax: params.pax,
      roomMultiplier: madinahMultiplier,
      priceSource: madinahPrice.source,
      priceSourceLabel: madinahPrice.sourceLabel || undefined,
    },
    hotelMakkahDetail: {
      id: makkahHotel.id,
      label: makkahHotel.label,
      tier: makkahHotel.tier,
      sarPerNight: makkahSarPerNight,
      nights: params.nightsMakkah,
      roomPax: room.paxPerRoom,
      roomCount: makkahHotelCost.roomCount,
      totalPax: params.pax,
      roomMultiplier: makkahMultiplier,
      priceSource: makkahPrice.source,
      priceSourceLabel: makkahPrice.sourceLabel || undefined,
    },
    servicesIdr,
    serviceItems,
    flightIdr,
    totalIdrPax,
    totalIdrGrp,
    sarRate,
    usdRate,
  };
};

export const fetchPricingConfig = async (db: import('@/shared/db').DB): Promise<PricingConfig> => {
  const {
    exchangeRates,
    hotelPrices,
    airlinePrices,
    serviceFees,
    roomMultipliers,
    hotelMonthlyPrices,
    realHotelPrices,
    airlineMonthlyPrices,
  } = await import('@/shared/db/schema');
  const [rates, hotels, airlines, services, rooms, monthlyPrices, realPrices, airlineMonthlyRows] =
    await Promise.all([
      db.select().from(exchangeRates),
      db.select().from(hotelPrices).orderBy(asc(hotelPrices.updatedAt)),
      db
        .select()
        .from(airlinePrices)
        .orderBy(desc(airlinePrices.isDefault), asc(airlinePrices.updatedAt)),
      db.select().from(serviceFees),
      db.select().from(roomMultipliers),
      db.select().from(hotelMonthlyPrices),
      db.select().from(realHotelPrices),
      db.select().from(airlineMonthlyPrices),
    ]);

  const ratesMap: Record<string, number> = {};
  for (const r of rates) ratesMap[r.currency] = r.rateToIdr;

  const monthlyByHotelId: Record<string, Record<number, number>> = {};
  for (const mp of monthlyPrices) {
    if (!monthlyByHotelId[mp.hotelPriceId]) monthlyByHotelId[mp.hotelPriceId] = {};
    monthlyByHotelId[mp.hotelPriceId][mp.month] = mp.sarPerNight;
  }

  const realByHotelId: Record<
    string,
    Record<number, Partial<Record<RoomType, RealHotelPrice>>>
  > = {};
  for (const rp of realPrices) {
    const roomType = rp.roomType as RoomType;
    if (!ROOM_TYPES.includes(roomType)) continue;
    if (!realByHotelId[rp.hotelPriceId]) realByHotelId[rp.hotelPriceId] = {};
    if (!realByHotelId[rp.hotelPriceId][rp.month]) realByHotelId[rp.hotelPriceId][rp.month] = {};
    realByHotelId[rp.hotelPriceId][rp.month][roomType] = {
      sarPerNight: rp.sarPerNight,
      sourceLabel: rp.sourceLabel,
    };
  }

  const hotelsMap: PricingConfig['hotels'] = {} as PricingConfig['hotels'];
  const hotelOptionsMap: NonNullable<PricingConfig['hotelOptions']> = {
    MAKKAH: [],
    MADINAH: [],
  };
  for (const h of hotels) {
    if (!hotelsMap[h.city]) hotelsMap[h.city] = {} as PricingConfig['hotels'][typeof h.city];
    const config = {
      id: h.id,
      city: h.city,
      tier: h.tier,
      sarPerNight: h.sarPerNight,
      label: h.label,
      sublabel: h.sublabel,
      distance: h.distance,
      monthlyPrices: monthlyByHotelId[h.id] ?? {},
      realMonthlyPrices: realByHotelId[h.id] ?? {},
    };
    hotelOptionsMap[h.city].push(config);
    if (!hotelsMap[h.city][h.tier]) {
      hotelsMap[h.city][h.tier] = config;
    }
  }

  const airlinesMap: PricingConfig['airlines'] = {} as PricingConfig['airlines'];
  const airlineOptionsMap: NonNullable<PricingConfig['airlineOptions']> = {} as NonNullable<
    PricingConfig['airlineOptions']
  >;
  const monthlyByAirlineId: Record<string, Record<number, number>> = {};
  for (const mp of airlineMonthlyRows) {
    if (!monthlyByAirlineId[mp.airlinePriceId]) monthlyByAirlineId[mp.airlinePriceId] = {};
    monthlyByAirlineId[mp.airlinePriceId][mp.month] = mp.idr;
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
    };
    if (!airlineOptionsMap[a.tier]) {
      airlineOptionsMap[a.tier] = [];
    }
    airlineOptionsMap[a.tier].push(config);

    if (a.isDefault || !airlinesMap[a.tier]) {
      airlinesMap[a.tier] = config;
    }
  }

  const servicesMap: PricingConfig['services'] = {} as PricingConfig['services'];
  for (const s of services) {
    if (!isServiceKey(s.key)) continue;
    servicesMap[s.key] = {
      currency: s.currency,
      amount: s.amount,
      label: s.label,
      enabled: s.enabled,
      divideByPax: s.divideByPax,
    };
  }

  const roomsMap: PricingConfig['roomMultipliers'] = {} as PricingConfig['roomMultipliers'];
  for (const r of rooms) {
    roomsMap[r.type as keyof PricingConfig['roomMultipliers']] = {
      paxPerRoom: r.paxPerRoom,
      multiplier: parseFloat(r.multiplier),
    };
  }

  return {
    rates: ratesMap,
    hotels: hotelsMap,
    hotelOptions: hotelOptionsMap,
    airlines: airlinesMap,
    airlineOptions: airlineOptionsMap,
    services: servicesMap,
    roomMultipliers: roomsMap,
  };
};
