import { parse } from "csv-parse/sync"
import type { AirlineTier } from "@/types"

const AIRLINE_TIERS: AirlineTier[] = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"]

const REQUIRED_HEADERS = ["tier", "label", "base_idr_per_person"] as const
export const AIRLINE_PRICING_IMPORT_MAX_BYTES = 256 * 1024
export const AIRLINE_PRICING_IMPORT_MAX_ROWS = 500

export const AIRLINE_MONTH_COLUMNS = [
  { month: 1, column: "jan_idr" },
  { month: 2, column: "feb_idr" },
  { month: 3, column: "mar_idr" },
  { month: 4, column: "apr_idr" },
  { month: 5, column: "may_idr" },
  { month: 6, column: "jun_idr" },
  { month: 7, column: "jul_idr" },
  { month: 8, column: "aug_idr" },
  { month: 9, column: "sep_idr" },
  { month: 10, column: "oct_idr" },
  { month: 11, column: "nov_idr" },
  { month: 12, column: "dec_idr" },
] as const

export const AIRLINE_PRICING_IMPORT_HEADERS = [
  "tier",
  "label",
  "sublabel",
  "base_idr_per_person",
  "is_default",
  ...AIRLINE_MONTH_COLUMNS.map(({ column }) => column),
] as const

export const AIRLINE_PRICING_IMPORT_TEMPLATE = [
  AIRLINE_PRICING_IMPORT_HEADERS.join(","),
  [
    "BUDGET",
    '"Lion Air, AirAsia, Scoot, IndiGo, VietJet"',
    '"Transit, 1-2 stops via regional hubs"',
    "12500000",
    "true",
    "13500000",
    "14500000",
    "15500000",
    "13000000",
    "12500000",
    "12500000",
    "13000000",
    "13000000",
    "12500000",
    "12500000",
    "13000000",
    "14500000",
  ].join(","),
  [
    "STANDARD",
    '"Batik Air, Saudia, Qatar, Etihad, Emirates"',
    '"Full-service, direct and premium transit"',
    "14500000",
    "true",
    "16000000",
    "17500000",
    "19000000",
    "15500000",
    "14500000",
    "14500000",
    "15000000",
    "15000000",
    "14500000",
    "14500000",
    "15000000",
    "17000000",
  ].join(","),
  [
    "GARUDA",
    "Garuda Indonesia",
    '"Direct flight premium from major hubs"',
    "17000000",
    "true",
    "18500000",
    "20500000",
    "23000000",
    "18000000",
    "17000000",
    "17000000",
    "17500000",
    "17500000",
    "17000000",
    "17000000",
    "17500000",
    "20000000",
  ].join(","),
  [
    "BUSINESS",
    "Business Class",
    '"Flat-bed luxury cabin across all airlines"',
    "25000000",
    "true",
    "28000000",
    "32000000",
    "36000000",
    "27000000",
    "25000000",
    "25000000",
    "26000000",
    "26000000",
    "25000000",
    "25000000",
    "26000000",
    "32000000",
  ].join(","),
].join("\n")

export type AirlinePricingImportStatus = "create" | "update" | "invalid" | "conflict"

export interface ExistingAirlinePricingImportRow {
  id: string
  tier: AirlineTier
  label: string
  importKey?: string | null
  isDefault?: boolean | null
}

export interface ParsedAirlinePricingImportData {
  tier: AirlineTier
  label: string
  sublabel: string
  idr: number
  isDefault: boolean
  monthlyPrices: Record<number, number>
  matchKey: string
}

export interface AirlinePricingImportRowResult {
  rowNumber: number
  status: AirlinePricingImportStatus
  errors: string[]
  data?: ParsedAirlinePricingImportData
  existingAirlineId?: string
}

export interface AirlinePricingImportParseResult {
  fileErrors: string[]
  rows: AirlinePricingImportRowResult[]
  summary: Record<AirlinePricingImportStatus, number>
}

export interface ParseAirlinePricingCsvOptions {
  existingAirlines?: ExistingAirlinePricingImportRow[]
}

export function normalizeAirlinePricingLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ")
}

export function normalizeAirlinePricingImportKey(input: {
  tier: AirlineTier
  label: string
}): string {
  return `${input.tier}:${normalizeAirlinePricingLabel(input.label)}`
}

export function parseAirlinePricingCsv(
  csvText: string,
  options: ParseAirlinePricingCsvOptions = {}
): AirlinePricingImportParseResult {
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

  const existingByKey = new Map<string, ExistingAirlinePricingImportRow>()
  for (const airline of options.existingAirlines ?? []) {
    existingByKey.set(
      airline.importKey ?? normalizeAirlinePricingImportKey(airline),
      airline
    )
  }

  const parsedRows = records.map((record, index) => parseRecord(record, index + 2))
  const keyCounts = new Map<string, number>()
  const defaultCounts = new Map<AirlineTier, number>()

  for (const row of parsedRows) {
    if (!row.data) continue
    keyCounts.set(row.data.matchKey, (keyCounts.get(row.data.matchKey) ?? 0) + 1)
    if (row.data.isDefault) {
      defaultCounts.set(row.data.tier, (defaultCounts.get(row.data.tier) ?? 0) + 1)
    }
  }

  const rows = parsedRows.map((row): AirlinePricingImportRowResult => {
    if (!row.data) return row

    const errors = [...row.errors]
    if ((keyCounts.get(row.data.matchKey) ?? 0) > 1) {
      errors.push("duplicate row in uploaded CSV for the same tier and label")
    }
    if (row.data.isDefault && (defaultCounts.get(row.data.tier) ?? 0) > 1) {
      errors.push("only one default airline option is allowed per tier in one CSV")
    }

    if (errors.length > 0) {
      return { ...row, status: "conflict", errors }
    }

    const existing = existingByKey.get(row.data.matchKey)
    if (existing) {
      return { ...row, status: "update", existingAirlineId: existing.id }
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

function parseRecord(record: Record<string, string>, rowNumber: number): AirlinePricingImportRowResult {
  const errors: string[] = []
  const tier = normalizeEnumValue(record.tier)
  const label = (record.label ?? "").trim()
  const sublabel = (record.sublabel ?? "").trim()
  const idr = parsePositiveInteger(record.base_idr_per_person)
  const isDefault = parseBoolean(record.is_default)

  if (!AIRLINE_TIERS.includes(tier as AirlineTier)) {
    errors.push("tier must be BUDGET, STANDARD, GARUDA, or BUSINESS")
  }
  if (!label) errors.push("label is required")
  if (idr == null) errors.push("base_idr_per_person must be a positive number")
  if (isDefault == null) errors.push("is_default must be true or false when provided")

  const monthlyPrices: Record<number, number> = {}
  for (const { month, column } of AIRLINE_MONTH_COLUMNS) {
    const raw = record[column]
    if (raw == null || raw.trim() === "") continue

    const monthly = parsePositiveInteger(raw)
    if (monthly == null) {
      errors.push(`${column} must be a positive number when provided`)
    } else {
      monthlyPrices[month] = monthly
    }
  }

  if (errors.length > 0 || idr == null || isDefault == null) {
    return { rowNumber, status: "invalid", errors }
  }

  for (const { month } of AIRLINE_MONTH_COLUMNS) {
    monthlyPrices[month] ??= idr
  }

  const data = {
    tier: tier as AirlineTier,
    label,
    sublabel,
    idr,
    isDefault,
    monthlyPrices,
    matchKey: normalizeAirlinePricingImportKey({
      tier: tier as AirlineTier,
      label,
    }),
  }

  return { rowNumber, status: "create", errors: [], data }
}

function normalizeEnumValue(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

function parsePositiveInteger(value: string | undefined): number | null {
  const normalized = (value ?? "").trim().replace(/,/g, "")
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function parseBoolean(value: string | undefined): boolean | null {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "") return false
  if (["true", "yes", "y", "1"].includes(normalized)) return true
  if (["false", "no", "n", "0"].includes(normalized)) return false
  return null
}

function summarize(rows: AirlinePricingImportRowResult[]): Record<AirlinePricingImportStatus, number> {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { create: 0, update: 0, invalid: 0, conflict: 0 }
  )
}

function emptyResult(fileErrors: string[]): AirlinePricingImportParseResult {
  return {
    fileErrors,
    rows: [],
    summary: { create: 0, update: 0, invalid: 0, conflict: 0 },
  }
}
