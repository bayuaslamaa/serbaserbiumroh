import type {
  BudgetBreakdown,
  BreakdownDisplay,
  BreakdownDisplayRow,
  ManualOverrides,
  RowOverride,
} from "@/types"
import {
  FLIGHT_ROW_KEY,
  HOTEL_MADINAH_ROW_KEY,
  HOTEL_MAKKAH_ROW_KEY,
  serviceRowKey,
} from "@/types"

// A computed breakdown row before any override is applied.
interface BaseRow {
  key: string
  defaultLabel: string // verbose label for UI/PDF when not overridden
  plainLabel: string // verbose label to use when the amount is overridden (drops foreign-currency suffix)
  defaultShortLabel: string // compact label for WhatsApp
  amountDisplay?: string // foreign-currency display for services
  baseIdr: number
  baseUnitPrice: number // native per-unit rate (SAR/USD/IDR); the "quantity" is baseIdr / baseUnitPrice
  unitCurrency: string // "SAR" | "USD" | "IDR"
  hotelDetail?: BudgetBreakdown["hotelMadinahDetail"]
  shared: boolean // divide-by-pax service → drives the ÷pax badge
}

// Flatten the fixed BudgetBreakdown fields into ordered, keyed base rows.
// Order matches the current UI/PDF/WhatsApp rendering: Madinah, Makkah, services…, flight.
export function breakdownToBaseRows(breakdown: BudgetBreakdown): BaseRow[] {
  const rows: BaseRow[] = [
    {
      key: HOTEL_MADINAH_ROW_KEY,
      defaultLabel: `Hotel Madinah - ${breakdown.hotelMadinahDetail.label}`,
      plainLabel: `Hotel Madinah - ${breakdown.hotelMadinahDetail.label}`,
      defaultShortLabel: "Hotel Madinah:",
      baseIdr: breakdown.hotelMadinahIdr,
      baseUnitPrice: breakdown.hotelMadinahDetail.sarPerNight,
      unitCurrency: "SAR",
      hotelDetail: breakdown.hotelMadinahDetail,
      shared: false,
    },
    {
      key: HOTEL_MAKKAH_ROW_KEY,
      defaultLabel: `Hotel Makkah - ${breakdown.hotelMakkahDetail.label}`,
      plainLabel: `Hotel Makkah - ${breakdown.hotelMakkahDetail.label}`,
      defaultShortLabel: "Hotel Makkah:",
      baseIdr: breakdown.hotelMakkahIdr,
      baseUnitPrice: breakdown.hotelMakkahDetail.sarPerNight,
      unitCurrency: "SAR",
      hotelDetail: breakdown.hotelMakkahDetail,
      shared: false,
    },
  ]

  for (const svc of breakdown.serviceItems) {
    rows.push({
      key: serviceRowKey(svc.key),
      defaultLabel: `${svc.label} (${svc.amountDisplay})`,
      plainLabel: svc.label,
      defaultShortLabel: `${svc.label}:`,
      amountDisplay: svc.amountDisplay,
      baseIdr: svc.idr,
      baseUnitPrice: svc.unitAmount,
      unitCurrency: svc.currency,
      shared: svc.divideByPax,
    })
  }

  rows.push({
    key: FLIGHT_ROW_KEY,
    defaultLabel: "Penerbangan",
    plainLabel: "Penerbangan",
    defaultShortLabel: "Pesawat:",
    baseIdr: breakdown.flightIdr,
    baseUnitPrice: breakdown.flightIdr, // flight is a plain IDR total (quantity 1)
    unitCurrency: "IDR",
    shared: false,
  })

  return rows
}

// True when there is nothing to persist — lets callers store null instead of an empty object.
export function isEmptyOverrides(overrides: ManualOverrides | null | undefined): boolean {
  if (!overrides) return true
  const overrideKeys = Object.keys(overrides.overrides ?? {})
  const hasOverride = overrideKeys.some((k) => {
    const o = overrides.overrides[k]
    return o && (o.label != null || o.idr != null || o.unitPrice != null || o.hidden === true)
  })
  return !hasOverride && (overrides.customRows?.length ?? 0) === 0
}

function resolveBaseRow(base: BaseRow, ov: RowOverride | undefined): BreakdownDisplayRow {
  const valueOverridden = ov?.idr != null
  const unitOverridden = ov?.unitPrice != null
  const amountOverridden = valueOverridden || unitOverridden
  const labelOverridden = ov?.label != null
  const hidden = ov?.hidden === true

  // The row's fixed multiplier (nights × rooms ÷ pax × rate for hotels/services, 1 for
  // plain-IDR rows), captured as value ÷ unit so an edited unit price re-derives the
  // final amount linearly. A direct `idr` override wins over the unit price.
  const factor = base.baseUnitPrice > 0 ? base.baseIdr / base.baseUnitPrice : 1
  const unitPrice = unitOverridden ? (ov!.unitPrice as number) : base.baseUnitPrice
  const idr = valueOverridden
    ? (ov!.idr as number)
    : unitOverridden
      ? Math.round(unitPrice * factor)
      : base.baseIdr

  const label = labelOverridden
    ? (ov!.label as string)
    : amountOverridden
      ? base.plainLabel
      : base.defaultLabel
  const shortLabel = labelOverridden ? `${ov!.label}:` : base.defaultShortLabel

  // Show the foreign-currency display only while the amount is auto.
  const amountDisplay = amountOverridden ? undefined : base.amountDisplay
  // Keep the hotel formula while the amount is auto or unit-price-driven (reflecting the
  // overridden SAR rate); drop it only when the final IDR value is set directly.
  const hotelDetail = base.hotelDetail && !valueOverridden
    ? unitOverridden
      ? { ...base.hotelDetail, sarPerNight: unitPrice }
      : base.hotelDetail
    : undefined

  const stale =
    ov?.autoIdrAtOverride != null && ov.autoIdrAtOverride !== base.baseIdr

  const source: BreakdownDisplayRow["source"] =
    amountOverridden || labelOverridden || hidden ? "overridden" : "computed"

  return {
    key: base.key,
    label,
    shortLabel,
    amountDisplay,
    unitPrice,
    unitCurrency: base.unitCurrency,
    idr,
    hotelDetail,
    shared: base.shared,
    hidden,
    stale,
    source,
  }
}

// Merge computed breakdown + manual overrides into the single display model every
// surface (UI, Copy, WhatsApp, PDF) and the persisted totals route through.
// A null/empty override layer yields rows and totals identical to the raw breakdown.
export function applyOverrides(
  breakdown: BudgetBreakdown,
  overrides: ManualOverrides | null | undefined,
  pax: number,
): BreakdownDisplay {
  const safePax = Math.max(1, pax)
  const overrideMap = overrides?.overrides ?? {}
  const customRows = overrides?.customRows ?? []

  const rows: BreakdownDisplayRow[] = breakdownToBaseRows(breakdown).map((base) =>
    resolveBaseRow(base, overrideMap[base.key]),
  )

  for (const custom of customRows) {
    rows.push({
      key: `custom:${custom.id}`,
      label: custom.label,
      shortLabel: `${custom.label}:`,
      amountDisplay: undefined,
      unitPrice: custom.idr, // plain IDR line, quantity 1 → unit price equals the amount
      unitCurrency: "IDR",
      idr: custom.idr,
      hotelDetail: undefined,
      shared: false,
      hidden: false,
      stale: false,
      source: "custom",
    })
  }

  let totalIdrPax = 0
  let totalIdrGrp = 0
  for (const row of rows) {
    if (row.hidden) continue
    totalIdrPax += row.idr
    totalIdrGrp += row.idr * safePax
  }

  return {
    rows,
    totalIdrPax,
    totalIdrGrp,
    sarRate: breakdown.sarRate,
    usdRate: breakdown.usdRate,
  }
}
