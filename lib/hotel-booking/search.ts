export type HotelBookingSearchInput = {
  checkIn?: string | string[] | null
  checkOut?: string | string[] | null
  rooms?: string | string[] | number | null
  adults?: string | string[] | number | null
  city?: string | string[] | null
  query?: string | string[] | null
}

export type HotelBookingSearchParams = {
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  city: "ALL" | "MAKKAH" | "MADINAH"
  query: string
  nights: number
}

export type HotelBookingSearchParseResult =
  | { ok: true; params: HotelBookingSearchParams; errors: [] }
  | { ok: false; params: Partial<HotelBookingSearchParams>; errors: string[] }

export type SearchableHotelBookingOffer = {
  id: string
  status: "ACTIVE" | "UNAVAILABLE" | "INACTIVE"
  city: "MAKKAH" | "MADINAH"
  hotelName: string
  periodStart: Date | string
  periodEnd: Date | string
  roomType?: string | null
  rateLabel?: string | null
  roomBasis: string
  currency: string
  priceAmount: number
  maxAdults?: number | null
  maxGuests?: number | null
  minNights?: number | null
}

export type HotelBookingQuote = {
  checkIn: string
  checkOut: string
  nights: number
  rooms: number
  adults: number
  currency: string
  pricePerNight: number
  totalAmount: number
}

const CITIES = ["MAKKAH", "MADINAH"] as const
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseHotelBookingSearchParams(input: HotelBookingSearchInput): HotelBookingSearchParseResult {
  const checkIn = firstValue(input.checkIn)
  const checkOut = firstValue(input.checkOut)
  const rooms = parsePositiveCount(firstValue(input.rooms) || "1")
  const adults = parsePositiveCount(firstValue(input.adults) || "2")
  const city = normalizeCity(firstValue(input.city))
  const query = (firstValue(input.query) ?? "").trim()
  const errors: string[] = []

  if (!checkIn && !checkOut) {
    return {
      ok: false,
      params: { rooms: rooms ?? 1, adults: adults ?? 2, city, query },
      errors: [],
    }
  }

  if (!isValidDateString(checkIn)) errors.push("checkIn must use YYYY-MM-DD")
  if (!isValidDateString(checkOut)) errors.push("checkOut must use YYYY-MM-DD")
  if (rooms == null) errors.push("rooms must be a positive number")
  if (adults == null) errors.push("adults must be a positive number")

  const nights =
    isValidDateString(checkIn) && isValidDateString(checkOut)
      ? calculateHotelBookingNights(checkIn!, checkOut!)
      : 0

  if (isValidDateString(checkIn) && isValidDateString(checkOut) && nights < 1) {
    errors.push("checkOut must be after checkIn")
  }

  const params = {
    checkIn: checkIn ?? "",
    checkOut: checkOut ?? "",
    rooms: rooms ?? 1,
    adults: adults ?? 2,
    city,
    query,
    nights,
  }

  if (errors.length > 0) return { ok: false, params, errors }
  return { ok: true, params, errors: [] }
}

export function calculateHotelBookingNights(checkIn: string, checkOut: string): number {
  return Math.round((dateToUtcMs(checkOut) - dateToUtcMs(checkIn)) / MS_PER_DAY)
}

export function hotelBookingOfferMatchesSearch(
  offer: SearchableHotelBookingOffer,
  params: HotelBookingSearchParams
): boolean {
  if (offer.status !== "ACTIVE") return false
  if (params.city !== "ALL" && offer.city !== params.city) return false
  if (params.query && !offer.hotelName.toLowerCase().includes(params.query.toLowerCase())) return false
  if (params.nights < (offer.minNights ?? 1)) return false
  if (offer.maxAdults != null && params.adults > offer.maxAdults * params.rooms) return false
  if (offer.maxGuests != null && params.adults > offer.maxGuests * params.rooms) return false

  const periodStart = toDateString(offer.periodStart)
  const periodEnd = toDateString(offer.periodEnd)
  return periodStart <= params.checkIn && params.checkOut <= periodEnd
}

export function buildHotelBookingQuote(
  offer: Pick<SearchableHotelBookingOffer, "currency" | "priceAmount">,
  params: HotelBookingSearchParams
): HotelBookingQuote {
  return {
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    nights: params.nights,
    rooms: params.rooms,
    adults: params.adults,
    currency: offer.currency,
    pricePerNight: offer.priceAmount,
    totalAmount: offer.priceAmount * params.nights * params.rooms,
  }
}

export function hasCompleteHotelBookingSearch(params: Partial<HotelBookingSearchParams>): params is HotelBookingSearchParams {
  return Boolean(params.checkIn && params.checkOut && params.nights && params.rooms && params.adults && params.city)
}

function firstValue(value: HotelBookingSearchInput[keyof HotelBookingSearchInput]): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  if (typeof value === "number") return String(value)
  return value ?? null
}

function parsePositiveCount(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 20 ? parsed : null
}

function normalizeCity(value: string | null): HotelBookingSearchParams["city"] {
  const normalized = (value ?? "ALL").trim().toUpperCase()
  if (CITIES.includes(normalized as (typeof CITIES)[number])) {
    return normalized as (typeof CITIES)[number]
  }
  return "ALL"
}

function isValidDateString(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function dateToUtcMs(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime()
}

function toDateString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}
