import { parse } from "csv-parse/sync"
import type { City, HotelTier } from "@/types"

const CITIES: City[] = ["MAKKAH", "MADINAH"]
const HOTEL_TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

const REQUIRED_HEADERS = ["city", "tier", "label", "base_sar_per_night"] as const
export const HOTEL_PRICING_IMPORT_MAX_BYTES = 256 * 1024
export const HOTEL_PRICING_IMPORT_MAX_ROWS = 500

export const MONTH_COLUMNS = [
  { month: 1, column: "jan_sar" },
  { month: 2, column: "feb_sar" },
  { month: 3, column: "mar_sar" },
  { month: 4, column: "apr_sar" },
  { month: 5, column: "may_sar" },
  { month: 6, column: "jun_sar" },
  { month: 7, column: "jul_sar" },
  { month: 8, column: "aug_sar" },
  { month: 9, column: "sep_sar" },
  { month: 10, column: "oct_sar" },
  { month: 11, column: "nov_sar" },
  { month: 12, column: "dec_sar" },
] as const

export const HOTEL_PRICING_IMPORT_HEADERS = [
  "city",
  "tier",
  "label",
  "sublabel",
  "distance",
  "base_sar_per_night",
  ...MONTH_COLUMNS.map(({ column }) => column),
] as const

export const HOTEL_PRICING_IMPORT_TEMPLATE = [
  HOTEL_PRICING_IMPORT_HEADERS.join(","),
  [
    "MAKKAH",
    "ECONOMY",
    "Makkah Economy Example",
    "Contoh tier ECONOMY",
    "shuttle area",
    "900",
    "900",
    "900",
    "1100",
    "1000",
    "900",
    "900",
    "950",
    "950",
    "900",
    "900",
    "900",
    "1000",
  ].join(","),
  [
    "MAKKAH",
    "STANDARD",
    "Safwa Tower 3",
    "3 star dekat Haram",
    "250m jalan kaki",
    "1300",
    "1300",
    "1300",
    "1600",
    "1450",
    "1300",
    "1300",
    "1400",
    "1400",
    "1300",
    "1300",
    "1300",
    "1500",
  ].join(","),
  [
    "MAKKAH",
    "PELATARAN",
    "Makkah Pelataran Example",
    "Contoh tier PELATARAN",
    "pelataran/ring 1",
    "1800",
    "1800",
    "1800",
    "2200",
    "2000",
    "1800",
    "1800",
    "1900",
    "1900",
    "1800",
    "1800",
    "1800",
    "2000",
  ].join(","),
  [
    "MAKKAH",
    "PREMIUM",
    "Makkah Premium Example",
    "Contoh tier PREMIUM",
    "ring 1 tower",
    "2600",
    "2600",
    "2600",
    "3200",
    "2900",
    "2600",
    "2600",
    "2800",
    "2800",
    "2600",
    "2600",
    "2600",
    "3000",
  ].join(","),
  [
    "MADINAH",
    "ECONOMY",
    "Madinah Economy Example",
    "Contoh tier ECONOMY",
    "shuttle area",
    "450",
    "450",
    "450",
    "600",
    "550",
    "450",
    "450",
    "500",
    "500",
    "450",
    "450",
    "450",
    "550",
  ].join(","),
  [
    "MADINAH",
    "STANDARD",
    "Grand Plaza Badr Maqam",
    "4 star dekat Nabawi",
    "300m jalan kaki",
    "650",
    "650",
    "650",
    "850",
    "750",
    "650",
    "650",
    "700",
    "700",
    "650",
    "650",
    "650",
    "750",
  ].join(","),
  [
    "MADINAH",
    "PELATARAN",
    "Madinah Pelataran Example",
    "Contoh tier PELATARAN",
    "pelataran/ring 1",
    "1100",
    "1100",
    "1100",
    "1400",
    "1250",
    "1100",
    "1100",
    "1200",
    "1200",
    "1100",
    "1100",
    "1100",
    "1250",
  ].join(","),
  [
    "MADINAH",
    "PREMIUM",
    "Madinah Premium Example",
    "Contoh tier PREMIUM",
    "ring 1 dekat Nabawi",
    "1800",
    "1800",
    "1800",
    "2300",
    "2050",
    "1800",
    "1800",
    "1950",
    "1950",
    "1800",
    "1800",
    "1800",
    "2100",
  ].join(","),
].join("\n")

export type HotelPricingImportStatus = "create" | "update" | "invalid" | "conflict"

export interface ExistingHotelPricingImportRow {
  id: string
  city: City
  tier: HotelTier
  label: string
  importKey?: string | null
}

export interface ParsedHotelPricingImportData {
  city: City
  tier: HotelTier
  label: string
  sublabel: string
  distance: string | null
  sarPerNight: number
  monthlyPrices: Record<number, number>
  matchKey: string
}

export interface HotelPricingImportRowResult {
  rowNumber: number
  status: HotelPricingImportStatus
  errors: string[]
  data?: ParsedHotelPricingImportData
  existingHotelId?: string
}

export interface HotelPricingImportParseResult {
  fileErrors: string[]
  rows: HotelPricingImportRowResult[]
  summary: Record<HotelPricingImportStatus, number>
}

export interface ParseHotelPricingCsvOptions {
  existingHotels?: ExistingHotelPricingImportRow[]
}

export function normalizeHotelPricingLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ")
}

export function normalizeHotelPricingImportKey(input: {
  city: City
  tier: HotelTier
  label: string
}): string {
  return `${input.city}:${input.tier}:${normalizeHotelPricingLabel(input.label)}`
}

export function parseHotelPricingCsv(
  csvText: string,
  options: ParseHotelPricingCsvOptions = {}
): HotelPricingImportParseResult {
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

  const existingByKey = new Map<string, ExistingHotelPricingImportRow>()
  for (const hotel of options.existingHotels ?? []) {
    existingByKey.set(
      hotel.importKey ?? normalizeHotelPricingImportKey(hotel),
      hotel
    )
  }

  const parsedRows = records.map((record, index) => parseRecord(record, index + 2))
  const keyCounts = new Map<string, number>()
  for (const row of parsedRows) {
    if (!row.data) continue
    keyCounts.set(row.data.matchKey, (keyCounts.get(row.data.matchKey) ?? 0) + 1)
  }

  const rows = parsedRows.map((row): HotelPricingImportRowResult => {
    if (!row.data) return row

    if ((keyCounts.get(row.data.matchKey) ?? 0) > 1) {
      return {
        ...row,
        status: "conflict",
        errors: ["duplicate row in uploaded CSV for the same city, tier, and label"],
      }
    }

    const existing = existingByKey.get(row.data.matchKey)
    if (existing) {
      return { ...row, status: "update", existingHotelId: existing.id }
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

function parseRecord(record: Record<string, string>, rowNumber: number): HotelPricingImportRowResult {
  const errors: string[] = []
  const city = normalizeEnumValue(record.city)
  const tier = normalizeEnumValue(record.tier)
  const label = (record.label ?? "").trim()
  const sublabel = (record.sublabel ?? "").trim()
  const distance = normalizeOptionalText(record.distance)
  const sarPerNight = parsePositiveInteger(record.base_sar_per_night)

  if (!CITIES.includes(city as City)) errors.push("city must be MAKKAH or MADINAH")
  if (!HOTEL_TIERS.includes(tier as HotelTier)) {
    errors.push("tier must be ECONOMY, STANDARD, PELATARAN, or PREMIUM")
  }
  if (!label) errors.push("label is required")
  if (sarPerNight == null) errors.push("base_sar_per_night must be a positive number")

  const monthlyPrices: Record<number, number> = {}
  for (const { month, column } of MONTH_COLUMNS) {
    const raw = record[column]
    if (raw == null || raw.trim() === "") continue

    const monthly = parsePositiveInteger(raw)
    if (monthly == null) {
      errors.push(`${column} must be a positive number when provided`)
    } else {
      monthlyPrices[month] = monthly
    }
  }

  if (errors.length > 0 || sarPerNight == null) {
    return { rowNumber, status: "invalid", errors }
  }

  for (const { month } of MONTH_COLUMNS) {
    monthlyPrices[month] ??= sarPerNight
  }

  const data = {
    city: city as City,
    tier: tier as HotelTier,
    label,
    sublabel,
    distance,
    sarPerNight,
    monthlyPrices,
    matchKey: normalizeHotelPricingImportKey({
      city: city as City,
      tier: tier as HotelTier,
      label,
    }),
  }

  return { rowNumber, status: "create", errors: [], data }
}

function normalizeEnumValue(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = (value ?? "").trim()
  return normalized.length > 0 ? normalized : null
}

function parsePositiveInteger(value: string | undefined): number | null {
  const normalized = (value ?? "").trim().replace(/,/g, "")
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function summarize(rows: HotelPricingImportRowResult[]): Record<HotelPricingImportStatus, number> {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { create: 0, update: 0, invalid: 0, conflict: 0 }
  )
}

function emptyResult(fileErrors: string[]): HotelPricingImportParseResult {
  return {
    fileErrors,
    rows: [],
    summary: { create: 0, update: 0, invalid: 0, conflict: 0 },
  }
}
