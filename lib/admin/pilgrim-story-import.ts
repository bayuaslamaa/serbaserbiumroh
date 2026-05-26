import { parse } from "csv-parse/sync"
import type { AirlineTier, HotelTier } from "@/types"

const HOTEL_TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]
const AIRLINE_TIERS: AirlineTier[] = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"]

const REQUIRED_HEADERS = [
  "slug",
  "author_name",
  "departure_city",
  "pax",
  "hotel_tier",
  "total_budget_idr",
] as const

export const PILGRIM_STORY_IMPORT_HEADERS = [
  "slug",
  "author_name",
  "departure_city",
  "travel_month",
  "travel_year",
  "pax",
  "hotel_tier",
  "airline_tier",
  "makkah_nights",
  "madinah_nights",
  "total_budget_idr",
  "narrative",
  "is_published",
  "is_featured",
] as const

export const PILGRIM_STORY_IMPORT_MAX_BYTES = 512 * 1024
export const PILGRIM_STORY_IMPORT_MAX_ROWS = 500

export const PILGRIM_STORY_IMPORT_TEMPLATE = [
  PILGRIM_STORY_IMPORT_HEADERS.join(","),
  [
    "inka-umroh-mandiri",
    "Inka",
    "Jakarta",
    "2",
    "2026",
    "2",
    "STANDARD",
    "STANDARD",
    "8",
    "4",
    "54000000",
    "Ringkasan perjalanan umroh mandiri, hotel, transport, dan catatan biaya dari dokumen sumber. Simpan ketidakpastian di sini agar admin bisa review ulang.",
    "false",
    "false",
  ].map(escapeCsvField).join(","),
  [
    "keluarga-zahra-umroh",
    "Zahra Shafiyah",
    "Surabaya",
    "12",
    "2025",
    "4",
    "PELATARAN",
    "",
    "7",
    "5",
    "128000000",
    "Contoh narasi panjang boleh memakai baris baru. Cantumkan sumber, asumsi, dan field yang diestimasi jika data tidak eksplisit.",
    "false",
    "false",
  ].map(escapeCsvField).join(","),
].join("\n")

export type PilgrimStoryImportStatus = "create" | "update" | "invalid" | "conflict"

export interface ExistingPilgrimStoryImportRow {
  id: string
  slug: string
}

export interface ParsedPilgrimStoryImportData {
  slug: string
  authorName: string
  departureCity: string
  travelMonth: number | null
  travelYear: number | null
  pax: number
  hotelTier: HotelTier
  airlineTier: AirlineTier | null
  makkahNights: number
  madinahNights: number
  totalBudgetIdr: number
  narrative: string
  isPublished: boolean
  isFeatured: boolean
  slugKey: string
}

export interface PilgrimStoryImportRowResult {
  rowNumber: number
  status: PilgrimStoryImportStatus
  errors: string[]
  data?: ParsedPilgrimStoryImportData
  existingStoryId?: string
}

export interface PilgrimStoryImportParseResult {
  fileErrors: string[]
  rows: PilgrimStoryImportRowResult[]
  summary: Record<PilgrimStoryImportStatus, number>
}

export interface ParsePilgrimStoryCsvOptions {
  existingStories?: ExistingPilgrimStoryImportRow[]
}

export function normalizePilgrimStorySlug(slug: string): string {
  return slug.trim().toLowerCase()
}

export function parsePilgrimStoryCsv(
  csvText: string,
  options: ParsePilgrimStoryCsvOptions = {}
): PilgrimStoryImportParseResult {
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

  const existingBySlug = new Map(
    (options.existingStories ?? []).map((story) => [normalizePilgrimStorySlug(story.slug), story])
  )
  const parsedRows = records.map((record, index) => parseRecord(record, index + 2))
  const slugCounts = new Map<string, number>()
  for (const row of parsedRows) {
    if (!row.data) continue
    slugCounts.set(row.data.slugKey, (slugCounts.get(row.data.slugKey) ?? 0) + 1)
  }

  const rows = parsedRows.map((row): PilgrimStoryImportRowResult => {
    if (!row.data) return row

    const errors = [...row.errors]
    if ((slugCounts.get(row.data.slugKey) ?? 0) > 1) {
      errors.push("duplicate row in uploaded CSV for the same slug")
    }

    if (errors.length > 0) {
      return { ...row, status: errors.some((error) => error.startsWith("duplicate")) ? "conflict" : "invalid", errors }
    }

    const existing = existingBySlug.get(row.data.slugKey)
    if (existing) {
      return { ...row, status: "update", existingStoryId: existing.id }
    }

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

function parseRecord(record: Record<string, string>, rowNumber: number): PilgrimStoryImportRowResult {
  const errors: string[] = []
  const slug = requiredText(record.slug, "slug", errors)
  const authorName = requiredText(record.author_name, "author_name", errors)
  const departureCity = requiredText(record.departure_city, "departure_city", errors)
  const pax = requiredInteger(record.pax, "pax", errors, { min: 1 })
  const hotelTier = parseHotelTier(record.hotel_tier, errors)
  const totalBudgetIdr = requiredInteger(record.total_budget_idr, "total_budget_idr", errors, { min: 0 })
  const travelMonth = optionalInteger(record.travel_month, "travel_month", errors, { min: 1, max: 12 })
  const travelYear = optionalInteger(record.travel_year, "travel_year", errors, { min: 1 })
  const makkahNights = optionalInteger(record.makkah_nights, "makkah_nights", errors, { min: 0 }) ?? 0
  const madinahNights = optionalInteger(record.madinah_nights, "madinah_nights", errors, { min: 0 }) ?? 0
  const airlineTier = parseOptionalAirlineTier(record.airline_tier, errors)
  const isPublished = parseBoolean(record.is_published, "is_published", errors) ?? false
  const isFeatured = parseBoolean(record.is_featured, "is_featured", errors) ?? false

  if (!slug || !authorName || !departureCity || pax == null || !hotelTier || totalBudgetIdr == null) {
    return { rowNumber, status: "invalid", errors }
  }

  if (errors.length > 0) {
    return { rowNumber, status: "invalid", errors }
  }

  return {
    rowNumber,
    status: "create",
    errors,
    data: {
      slug,
      authorName,
      departureCity,
      travelMonth,
      travelYear,
      pax,
      hotelTier,
      airlineTier,
      makkahNights,
      madinahNights,
      totalBudgetIdr,
      narrative: record.narrative?.trim() ?? "",
      isPublished,
      isFeatured,
      slugKey: normalizePilgrimStorySlug(slug),
    },
  }
}

function requiredText(value: string | undefined, field: string, errors: string[]): string | null {
  const text = value?.trim() ?? ""
  if (!text) {
    errors.push(`${field} is required`)
    return null
  }
  return text
}

function requiredInteger(
  value: string | undefined,
  field: string,
  errors: string[],
  range: { min?: number; max?: number } = {}
): number | null {
  const parsed = optionalInteger(value, field, errors, range)
  if (parsed == null && !errors.some((error) => error.startsWith(`${field} `))) {
    errors.push(`${field} is required`)
  }
  return parsed
}

function optionalInteger(
  value: string | undefined,
  field: string,
  errors: string[],
  range: { min?: number; max?: number } = {}
): number | null {
  const text = value?.trim() ?? ""
  if (!text) return null

  const parsed = Number(text)
  if (!Number.isInteger(parsed)) {
    errors.push(`${field} must be an integer`)
    return null
  }
  if (range.min != null && parsed < range.min) {
    errors.push(`${field} must be at least ${range.min}`)
  }
  if (range.max != null && parsed > range.max) {
    errors.push(`${field} must be at most ${range.max}`)
  }
  return parsed
}

function parseHotelTier(value: string | undefined, errors: string[]): HotelTier | null {
  const tier = value?.trim().toUpperCase() ?? ""
  if (!tier) {
    errors.push("hotel_tier is required")
    return null
  }
  if (!HOTEL_TIERS.includes(tier as HotelTier)) {
    errors.push("hotel_tier must be one of ECONOMY, STANDARD, PELATARAN, PREMIUM")
    return null
  }
  return tier as HotelTier
}

function parseOptionalAirlineTier(value: string | undefined, errors: string[]): AirlineTier | null {
  const tier = value?.trim().toUpperCase() ?? ""
  if (!tier) return null
  if (!AIRLINE_TIERS.includes(tier as AirlineTier)) {
    errors.push("airline_tier must be blank or one of BUDGET, STANDARD, GARUDA, BUSINESS")
    return null
  }
  return tier as AirlineTier
}

function parseBoolean(value: string | undefined, field: string, errors: string[]): boolean | null {
  const text = value?.trim().toLowerCase() ?? ""
  if (!text) return null
  if (["true", "yes", "1"].includes(text)) return true
  if (["false", "no", "0"].includes(text)) return false
  errors.push(`${field} must be true/false, yes/no, 1/0, or blank`)
  return null
}

function summarize(rows: PilgrimStoryImportRowResult[]): Record<PilgrimStoryImportStatus, number> {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { create: 0, update: 0, invalid: 0, conflict: 0 } as Record<PilgrimStoryImportStatus, number>
  )
}

function emptyResult(fileErrors: string[]): PilgrimStoryImportParseResult {
  return {
    fileErrors,
    rows: [],
    summary: { create: 0, update: 0, invalid: 0, conflict: 0 },
  }
}

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}
