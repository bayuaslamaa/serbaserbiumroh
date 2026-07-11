import { hotelBookingOffers } from "@/lib/db/schema"
import {
  HOTEL_BOOKING_OFFER_MAX_PRICE_AMOUNT,
  SUPPORTED_HOTEL_BOOKING_OFFER_CURRENCIES,
  normalizeHotelBookingOfferImportKey,
  type HotelBookingOfferCurrency,
} from "@/lib/admin/hotel-booking-offer-import"

const CITIES = ["MAKKAH", "MADINAH"] as const
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const STATUSES = ["ACTIVE", "UNAVAILABLE", "INACTIVE"] as const

export function parseHotelBookingOfferPayload(
  body: Record<string, unknown>,
  options: {
    partial: boolean
    current?: Pick<typeof hotelBookingOffers.$inferSelect, "periodStart" | "periodEnd">
  }
) {
  const city = normalizeEnum(body.city)
  const tier = normalizeEnum(body.tier)
  const hotelName = normalizeText(body.hotelName)
  const offerLabel = normalizeText(body.offerLabel)
  const roomType = normalizeText(body.roomType) || "Standard Room"
  const rateLabel = normalizeText(body.rateLabel)
  const periodStart = parseDateField(body.periodStart)
  const periodEnd = parseDateField(body.periodEnd)
  const periodLabel = normalizeText(body.periodLabel)
  const roomBasis = normalizeText(body.roomBasis)
  const currency = normalizeText(body.currency).toUpperCase() || "SAR"
  const priceAmount = parsePositiveInteger(body.priceAmount, HOTEL_BOOKING_OFFER_MAX_PRICE_AMOUNT)
  const maxAdults = parseOptionalPositiveInteger(body.maxAdults, 100)
  const maxGuests = parseOptionalPositiveInteger(body.maxGuests, 100)
  const minNights = parsePositiveInteger(body.minNights ?? 1, 365)
  const inclusions = normalizeText(body.inclusions)
  const cancellationPolicy = normalizeText(body.cancellationPolicy)
  const sortOrder = parseNonNegativeInteger(body.sortOrder ?? 0)
  const verifiedAt = parseOptionalDateField(body.verifiedAt)
  const status = normalizeEnum(body.status) || "ACTIVE"
  const notes = normalizeText(body.notes)
  const terms = normalizeText(body.terms)
  const hotelListingId = normalizeNullableId(body.hotelListingId)

  if (!options.partial || body.city !== undefined) {
    if (!CITIES.includes(city as (typeof CITIES)[number])) return { error: "invalid city" } as const
  }
  if (!options.partial || body.tier !== undefined) {
    if (!HOTEL_TIERS.includes(tier as (typeof HOTEL_TIERS)[number])) return { error: "invalid tier" } as const
  }
  if (!options.partial || body.status !== undefined) {
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { error: "invalid status" } as const
  }
  if (!options.partial || body.hotelName !== undefined) {
    if (!hotelName) return { error: "hotelName required" } as const
    if (hotelName.length > 160) return { error: "hotelName must be 160 characters or fewer" } as const
  }
  if (!options.partial || body.periodStart !== undefined) {
    if (!periodStart) return { error: "periodStart must use YYYY-MM-DD" } as const
  }
  if (!options.partial || body.periodEnd !== undefined) {
    if (!periodEnd) return { error: "periodEnd must use YYYY-MM-DD" } as const
  }
  const effectivePeriodStart = periodStart ?? options.current?.periodStart
  const effectivePeriodEnd = periodEnd ?? options.current?.periodEnd
  if (effectivePeriodStart && effectivePeriodEnd && effectivePeriodStart > effectivePeriodEnd) {
    return { error: "periodEnd must be on or after periodStart" } as const
  }
  if (!options.partial || body.roomBasis !== undefined) {
    if (!roomBasis) return { error: "roomBasis required" } as const
    if (roomBasis.length > 120) return { error: "roomBasis must be 120 characters or fewer" } as const
  }
  if (!options.partial || body.priceAmount !== undefined) {
    if (priceAmount == null) return { error: "priceAmount must be a positive number" } as const
  }
  if (offerLabel.length > 120) return { error: "offerLabel must be 120 characters or fewer" } as const
  if (!options.partial || body.roomType !== undefined) {
    if (!roomType) return { error: "roomType required" } as const
    if (roomType.length > 120) return { error: "roomType must be 120 characters or fewer" } as const
  }
  if (rateLabel.length > 120) return { error: "rateLabel must be 120 characters or fewer" } as const
  if (periodLabel.length > 120) return { error: "periodLabel must be 120 characters or fewer" } as const
  if (!SUPPORTED_HOTEL_BOOKING_OFFER_CURRENCIES.includes(currency as HotelBookingOfferCurrency)) {
    return { error: "currency must be SAR, USD, or IDR" } as const
  }
  if ((!options.partial || body.maxAdults !== undefined) && maxAdults === undefined) {
    return { error: "maxAdults must be a positive number" } as const
  }
  if ((!options.partial || body.maxGuests !== undefined) && maxGuests === undefined) {
    return { error: "maxGuests must be a positive number" } as const
  }
  if ((!options.partial || body.minNights !== undefined) && minNights == null) {
    return { error: "minNights must be a positive number" } as const
  }
  if ((!options.partial || body.sortOrder !== undefined) && sortOrder == null) {
    return { error: "sortOrder must be zero or a positive number" } as const
  }
  if ((!options.partial || body.verifiedAt !== undefined) && verifiedAt === undefined) {
    return { error: "verifiedAt must use YYYY-MM-DD" } as const
  }
  if (inclusions.length > 800) return { error: "inclusions must be 800 characters or fewer" } as const
  if (cancellationPolicy.length > 800) {
    return { error: "cancellationPolicy must be 800 characters or fewer" } as const
  }
  if (notes.length > 800) return { error: "notes must be 800 characters or fewer" } as const
  if (terms.length > 800) return { error: "terms must be 800 characters or fewer" } as const

  const data: Partial<typeof hotelBookingOffers.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (!options.partial || body.city !== undefined) data.city = city as (typeof CITIES)[number]
  if (!options.partial || body.tier !== undefined) data.tier = tier as (typeof HOTEL_TIERS)[number]
  if (!options.partial || body.hotelName !== undefined) data.hotelName = hotelName
  if (!options.partial || body.hotelListingId !== undefined) data.hotelListingId = hotelListingId
  if (!options.partial || body.offerLabel !== undefined) data.offerLabel = offerLabel
  if (!options.partial || body.roomType !== undefined) data.roomType = roomType
  if (!options.partial || body.rateLabel !== undefined) data.rateLabel = rateLabel
  if (!options.partial || body.periodStart !== undefined) data.periodStart = periodStart!
  if (!options.partial || body.periodEnd !== undefined) data.periodEnd = periodEnd!
  if (!options.partial || body.periodLabel !== undefined) data.periodLabel = periodLabel
  if (!options.partial || body.roomBasis !== undefined) data.roomBasis = roomBasis
  if (!options.partial || body.currency !== undefined) data.currency = currency
  if (!options.partial || body.priceAmount !== undefined) data.priceAmount = priceAmount!
  if (!options.partial || body.maxAdults !== undefined) data.maxAdults = maxAdults ?? null
  if (!options.partial || body.maxGuests !== undefined) data.maxGuests = maxGuests ?? null
  if (!options.partial || body.minNights !== undefined) data.minNights = minNights!
  if (!options.partial || body.inclusions !== undefined) data.inclusions = inclusions
  if (!options.partial || body.cancellationPolicy !== undefined) data.cancellationPolicy = cancellationPolicy
  if (!options.partial || body.sortOrder !== undefined) data.sortOrder = sortOrder!
  if (!options.partial || body.verifiedAt !== undefined) data.verifiedAt = verifiedAt ?? null
  if (!options.partial || body.status !== undefined) data.status = status as (typeof STATUSES)[number]
  if (!options.partial || body.notes !== undefined) data.notes = notes
  if (!options.partial || body.terms !== undefined) data.terms = terms

  if (!options.partial) {
    data.importKey = toHotelBookingOfferImportKey({
      city: data.city!,
      tier: data.tier!,
      hotelName: data.hotelName!,
      periodStart: data.periodStart as Date,
      periodEnd: data.periodEnd as Date,
      roomBasis: data.roomBasis!,
      offerLabel: data.offerLabel,
      roomType: data.roomType,
      rateLabel: data.rateLabel,
    })
  }

  return { data } as const
}

export function toHotelBookingOfferImportKey(input: {
  city: (typeof CITIES)[number]
  tier: (typeof HOTEL_TIERS)[number]
  hotelName: string
  periodStart: Date
  periodEnd: Date
  roomBasis: string
  offerLabel?: string
  roomType?: string
  rateLabel?: string
}) {
  return normalizeHotelBookingOfferImportKey({
    city: input.city,
    tier: input.tier,
    hotelName: input.hotelName,
    periodStart: toDateString(input.periodStart),
    periodEnd: toDateString(input.periodEnd),
    roomBasis: input.roomBasis,
    offerLabel: input.offerLabel,
    roomType: input.roomType,
    rateLabel: input.rateLabel,
  })
}

function normalizeEnum(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeNullableId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function parseDateField(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null
  const normalized = value.trim()
  const date = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (toDateString(date) !== normalized) return null
  return date
}

function parseOptionalDateField(value: unknown): Date | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value === "string" && value.trim() === "") return null
  return parseDateField(value) ?? undefined
}

function parsePositiveInteger(value: unknown, max: number): number | null {
  const normalized =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim().replace(/,/g, "")
        : ""
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null
}

function parseOptionalPositiveInteger(value: unknown, max: number): number | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value === "string" && value.trim() === "") return null
  return parsePositiveInteger(value, max) ?? undefined
}

function parseNonNegativeInteger(value: unknown): number | null {
  const normalized =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim().replace(/,/g, "")
        : ""
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}
