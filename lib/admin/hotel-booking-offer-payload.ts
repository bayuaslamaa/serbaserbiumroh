import { hotelBookingOffers } from "@/lib/db/schema"
import { normalizeHotelBookingOfferImportKey } from "@/lib/admin/hotel-booking-offer-import"

const CITIES = ["MAKKAH", "MADINAH"] as const
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const STATUSES = ["ACTIVE", "UNAVAILABLE", "INACTIVE"] as const

export function parseHotelBookingOfferPayload(
  body: Record<string, unknown>,
  options: { partial: boolean }
) {
  const city = normalizeEnum(body.city)
  const tier = normalizeEnum(body.tier)
  const hotelName = normalizeText(body.hotelName, 160)
  const offerLabel = normalizeText(body.offerLabel, 120)
  const periodStart = parseDateField(body.periodStart)
  const periodEnd = parseDateField(body.periodEnd)
  const periodLabel = normalizeText(body.periodLabel, 120)
  const roomBasis = normalizeText(body.roomBasis, 120)
  const currency = normalizeText(body.currency, 8).toUpperCase() || "SAR"
  const priceAmount = parsePositiveInteger(body.priceAmount)
  const status = normalizeEnum(body.status) || "ACTIVE"
  const notes = normalizeText(body.notes, 800)
  const terms = normalizeText(body.terms, 800)
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
  }
  if (!options.partial || body.periodStart !== undefined) {
    if (!periodStart) return { error: "periodStart must use YYYY-MM-DD" } as const
  }
  if (!options.partial || body.periodEnd !== undefined) {
    if (!periodEnd) return { error: "periodEnd must use YYYY-MM-DD" } as const
  }
  if (periodStart && periodEnd && periodStart > periodEnd) {
    return { error: "periodEnd must be on or after periodStart" } as const
  }
  if (!options.partial || body.roomBasis !== undefined) {
    if (!roomBasis) return { error: "roomBasis required" } as const
  }
  if (!options.partial || body.priceAmount !== undefined) {
    if (priceAmount == null) return { error: "priceAmount must be a positive number" } as const
  }

  const data: Partial<typeof hotelBookingOffers.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (!options.partial || body.city !== undefined) data.city = city as (typeof CITIES)[number]
  if (!options.partial || body.tier !== undefined) data.tier = tier as (typeof HOTEL_TIERS)[number]
  if (!options.partial || body.hotelName !== undefined) data.hotelName = hotelName
  if (!options.partial || body.hotelListingId !== undefined) data.hotelListingId = hotelListingId
  if (!options.partial || body.offerLabel !== undefined) data.offerLabel = offerLabel
  if (!options.partial || body.periodStart !== undefined) data.periodStart = periodStart!
  if (!options.partial || body.periodEnd !== undefined) data.periodEnd = periodEnd!
  if (!options.partial || body.periodLabel !== undefined) data.periodLabel = periodLabel
  if (!options.partial || body.roomBasis !== undefined) data.roomBasis = roomBasis
  if (!options.partial || body.currency !== undefined) data.currency = currency
  if (!options.partial || body.priceAmount !== undefined) data.priceAmount = priceAmount!
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
}) {
  return normalizeHotelBookingOfferImportKey({
    city: input.city,
    tier: input.tier,
    hotelName: input.hotelName,
    periodStart: toDateString(input.periodStart),
    periodEnd: toDateString(input.periodEnd),
    roomBasis: input.roomBasis,
    offerLabel: input.offerLabel,
  })
}

function normalizeEnum(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
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

function parsePositiveInteger(value: unknown): number | null {
  const normalized =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim().replace(/,/g, "")
        : ""
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}
