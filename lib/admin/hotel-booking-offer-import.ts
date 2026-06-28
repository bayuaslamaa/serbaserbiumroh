import { parse } from "csv-parse/sync"
import type { City, HotelTier } from "@/types"

export type HotelBookingOfferStatus = "ACTIVE" | "UNAVAILABLE" | "INACTIVE"
export type HotelBookingOfferCurrency = (typeof SUPPORTED_HOTEL_BOOKING_OFFER_CURRENCIES)[number]

const CITIES: City[] = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const STATUSES: HotelBookingOfferStatus[] = ["ACTIVE", "UNAVAILABLE", "INACTIVE"]

export const HOTEL_BOOKING_OFFER_MAX_PRICE_AMOUNT = 2_147_483_647
export const SUPPORTED_HOTEL_BOOKING_OFFER_CURRENCIES = ["SAR", "USD", "IDR"] as const

const REQUIRED_HEADERS = [
  "city",
  "tier",
  "hotel_name",
  "period_start",
  "period_end",
  "room_basis",
  "price_amount",
] as const

export const HOTEL_BOOKING_OFFER_IMPORT_MAX_BYTES = 256 * 1024
export const HOTEL_BOOKING_OFFER_IMPORT_MAX_ROWS = 500

export const HOTEL_BOOKING_OFFER_IMPORT_HEADERS = [
  "city",
  "tier",
  "hotel_name",
  "hotel_listing_slug",
  "offer_label",
  "period_start",
  "period_end",
  "period_label",
  "room_basis",
  "currency",
  "price_amount",
  "status",
  "notes",
  "terms",
] as const

export const HOTEL_BOOKING_OFFER_IMPORT_TEMPLATE = [
  HOTEL_BOOKING_OFFER_IMPORT_HEADERS.join(","),
  [
    "MAKKAH",
    "STANDARD",
    "Safwa Tower 3",
    "safwa-tower-3",
    "Ramadan awal",
    "2026-02-15",
    "2026-03-05",
    "15 Feb - 5 Mar 2026",
    "per kamar per malam double",
    "SAR",
    "1450",
    "ACTIVE",
    "Harga dapat berubah sebelum dikonfirmasi hotel",
    "Booking final setelah admin cek ketersediaan",
  ].join(","),
].join("\n")

export type HotelBookingOfferImportStatus = "create" | "update" | "invalid" | "conflict"

export interface ExistingHotelBookingOfferImportRow {
  id: string
  importKey?: string | null
}

export interface HotelBookingOfferImportHotelListingRow {
  id: string
  slug: string
}

export interface HotelBookingOfferTemplateHotelRow {
  city: City
  tier: HotelTier
  label: string
  sublabel?: string | null
  distance?: string | null
  sarPerNight: number
}

export interface HotelBookingOfferTemplateListingRow {
  city: City
  tier: HotelTier
  name: string
  slug: string
}

export interface ParsedHotelBookingOfferImportData {
  city: City
  tier: HotelTier
  hotelName: string
  hotelListingId: string | null
  offerLabel: string
  periodStart: string
  periodEnd: string
  periodLabel: string
  roomBasis: string
  currency: string
  priceAmount: number
  status: HotelBookingOfferStatus
  notes: string
  terms: string
  matchKey: string
}

export interface HotelBookingOfferImportRowResult {
  rowNumber: number
  status: HotelBookingOfferImportStatus
  errors: string[]
  data?: ParsedHotelBookingOfferImportData
  existingOfferId?: string
}

export interface HotelBookingOfferImportParseResult {
  fileErrors: string[]
  rows: HotelBookingOfferImportRowResult[]
  summary: Record<HotelBookingOfferImportStatus, number>
}

export interface ParseHotelBookingOfferCsvOptions {
  existingOffers?: ExistingHotelBookingOfferImportRow[]
  hotelListings?: HotelBookingOfferImportHotelListingRow[]
}

export function normalizeHotelBookingOfferText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function normalizeHotelBookingOfferImportKey(input: {
  city: City
  tier: HotelTier
  hotelName: string
  periodStart: string
  periodEnd: string
  roomBasis: string
  offerLabel?: string
}): string {
  return [
    input.city,
    input.tier,
    normalizeHotelBookingOfferText(input.hotelName),
    input.periodStart,
    input.periodEnd,
    normalizeHotelBookingOfferText(input.roomBasis),
    normalizeHotelBookingOfferText(input.offerLabel ?? ""),
  ].join(":")
}

export function buildHotelBookingOfferTemplateCsv(
  hotels: HotelBookingOfferTemplateHotelRow[],
  hotelListings: HotelBookingOfferTemplateListingRow[] = []
): string {
  const listingSlugByIdentity = new Map(
    hotelListings.map((listing) => [
      normalizeHotelTemplateIdentity(listing.city, listing.tier, listing.name),
      listing.slug,
    ])
  )

  const rows = hotels.map((hotel) => {
    const listingSlug = listingSlugByIdentity.get(
      normalizeHotelTemplateIdentity(hotel.city, hotel.tier, hotel.label)
    ) ?? ""
    const notes = [hotel.sublabel?.trim(), hotel.distance?.trim()]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 800)

    return [
      hotel.city,
      hotel.tier,
      hotel.label,
      listingSlug,
      "",
      "",
      "",
      "",
      "per kamar per malam",
      "SAR",
      hotel.sarPerNight,
      "INACTIVE",
      notes,
      "Ketersediaan dan booking final setelah admin cek ke hotel",
    ]
  })

  return [HOTEL_BOOKING_OFFER_IMPORT_HEADERS, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")
}

export function parseHotelBookingOfferCsv(
  csvText: string,
  options: ParseHotelBookingOfferCsvOptions = {}
): HotelBookingOfferImportParseResult {
  const fileErrors: string[] = []
  const headers = new Set<string>()
  let records: Record<string, string>[] = []

  try {
    records = parse(csvText, {
      bom: true,
      columns: (rawHeaders: string[]) => {
        const normalizedHeaders = rawHeaders.map((header) => header.trim())
        for (const header of normalizedHeaders) headers.add(header)
        return normalizedHeaders
      },
      skip_empty_lines: true,
      trim: true,
    })
  } catch (error) {
    return emptyResult([error instanceof Error ? error.message : "CSV could not be parsed"])
  }

  for (const header of REQUIRED_HEADERS) {
    if (!headers.has(header)) fileErrors.push(`Missing required header: ${header}`)
  }

  const listingsBySlug = new Map(
    (options.hotelListings ?? []).map((listing) => [normalizeHotelBookingOfferText(listing.slug), listing])
  )
  const existingByKey = new Map<string, ExistingHotelBookingOfferImportRow>()
  for (const offer of options.existingOffers ?? []) {
    if (offer.importKey) existingByKey.set(offer.importKey, offer)
  }

  const parsedRows = records.map((record, index) => parseRecord(record, index + 2, listingsBySlug))
  const keyCounts = new Map<string, number>()
  for (const row of parsedRows) {
    if (!row.data) continue
    keyCounts.set(row.data.matchKey, (keyCounts.get(row.data.matchKey) ?? 0) + 1)
  }

  const rows = parsedRows.map((row): HotelBookingOfferImportRowResult => {
    if (!row.data) return row

    if ((keyCounts.get(row.data.matchKey) ?? 0) > 1) {
      return {
        ...row,
        status: "conflict",
        errors: ["duplicate row in uploaded CSV for the same hotel, period, room basis, and label"],
      }
    }

    const existing = existingByKey.get(row.data.matchKey)
    if (existing) return { ...row, status: "update", existingOfferId: existing.id }

    return row
  })

  if (fileErrors.length > 0) {
    for (const row of rows) {
      if (row.status === "create" || row.status === "update") {
        row.status = "invalid"
        row.errors = [...row.errors, ...fileErrors]
      }
    }
  }

  return {
    fileErrors,
    rows,
    summary: summarize(rows),
  }
}

function parseRecord(
  record: Record<string, string>,
  rowNumber: number,
  listingsBySlug: Map<string, HotelBookingOfferImportHotelListingRow>
): HotelBookingOfferImportRowResult {
  const errors: string[] = []
  const city = normalizeEnumValue(record.city)
  const tier = normalizeEnumValue(record.tier)
  const hotelName = normalizeBoundedText(record.hotel_name, 160)
  const hotelListingSlug = normalizeBoundedText(record.hotel_listing_slug, 120)
  const offerLabel = normalizeBoundedText(record.offer_label, 120)
  const periodStart = normalizeDate(record.period_start)
  const periodEnd = normalizeDate(record.period_end)
  const periodLabel = normalizeBoundedText(record.period_label, 120)
  const roomBasis = normalizeBoundedText(record.room_basis, 120)
  const currency = normalizeCurrency(record.currency)
  const priceAmount = parsePositiveInteger(record.price_amount)
  const status = normalizeEnumValue(record.status || "ACTIVE")
  const notes = normalizeBoundedText(record.notes, 800)
  const terms = normalizeBoundedText(record.terms, 800)
  const listing = hotelListingSlug ? listingsBySlug.get(normalizeHotelBookingOfferText(hotelListingSlug)) : undefined

  if (!CITIES.includes(city as City)) errors.push("city must be MAKKAH or MADINAH")
  if (!HOTEL_TIERS.includes(tier as HotelTier)) {
    errors.push("tier must be ECONOMY, STANDARD, PELATARAN, or PREMIUM")
  }
  if (!hotelName) errors.push("hotel_name is required")
  if (hotelName.length > 160) errors.push("hotel_name must be 160 characters or fewer")
  if (hotelListingSlug && !listing) errors.push("hotel_listing_slug does not match an existing hotel")
  if (!periodStart) errors.push("period_start must use YYYY-MM-DD")
  if (!periodEnd) errors.push("period_end must use YYYY-MM-DD")
  if (periodStart && periodEnd && periodStart > periodEnd) {
    errors.push("period_end must be on or after period_start")
  }
  if (!roomBasis) errors.push("room_basis is required")
  if (roomBasis.length > 120) errors.push("room_basis must be 120 characters or fewer")
  if (offerLabel.length > 120) errors.push("offer_label must be 120 characters or fewer")
  if (periodLabel.length > 120) errors.push("period_label must be 120 characters or fewer")
  if (!currency) errors.push("currency is required")
  if (!SUPPORTED_HOTEL_BOOKING_OFFER_CURRENCIES.includes(currency as HotelBookingOfferCurrency)) {
    errors.push("currency must be SAR, USD, or IDR")
  }
  if (priceAmount == null) errors.push("price_amount must be a positive number")
  if (!STATUSES.includes(status as HotelBookingOfferStatus)) {
    errors.push("status must be ACTIVE, UNAVAILABLE, or INACTIVE")
  }
  if (notes.length > 800) errors.push("notes must be 800 characters or fewer")
  if (terms.length > 800) errors.push("terms must be 800 characters or fewer")

  if (errors.length > 0 || !periodStart || !periodEnd || priceAmount == null) {
    return { rowNumber, status: "invalid", errors }
  }

  const data = {
    city: city as City,
    tier: tier as HotelTier,
    hotelName,
    hotelListingId: listing?.id ?? null,
    offerLabel,
    periodStart,
    periodEnd,
    periodLabel,
    roomBasis,
    currency,
    priceAmount,
    status: status as HotelBookingOfferStatus,
    notes,
    terms,
    matchKey: normalizeHotelBookingOfferImportKey({
      city: city as City,
      tier: tier as HotelTier,
      hotelName,
      periodStart,
      periodEnd,
      roomBasis,
      offerLabel,
    }),
  }

  return { rowNumber, status: "create", errors: [], data }
}

function normalizeEnumValue(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

function normalizeHotelTemplateIdentity(city: City, tier: HotelTier, hotelName: string): string {
  return `${city}:${tier}:${normalizeHotelBookingOfferText(hotelName)}`
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (!/[",\r\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function normalizeBoundedText(value: string | undefined, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength + 1)
}

function normalizeCurrency(value: string | undefined): string {
  return (value ?? "SAR").trim().toUpperCase()
}

function normalizeDate(value: string | undefined): string | null {
  const normalized = (value ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null

  const date = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.toISOString().slice(0, 10) !== normalized) return null

  return normalized
}

function parsePositiveInteger(value: string | undefined): number | null {
  const normalized = (value ?? "").trim().replace(/,/g, "")
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= HOTEL_BOOKING_OFFER_MAX_PRICE_AMOUNT
    ? parsed
    : null
}

function summarize(
  rows: HotelBookingOfferImportRowResult[]
): Record<HotelBookingOfferImportStatus, number> {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { create: 0, update: 0, invalid: 0, conflict: 0 }
  )
}

function emptyResult(fileErrors: string[]): HotelBookingOfferImportParseResult {
  return {
    fileErrors,
    rows: [],
    summary: { create: 0, update: 0, invalid: 0, conflict: 0 },
  }
}
