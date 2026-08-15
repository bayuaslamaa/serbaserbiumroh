import type {
  BudgetBreakdown,
  BreakdownDisplay,
  BreakdownDisplayRow,
  ManualOverrides,
  RowOverride,
} from '@/shared/types';
import {
  FLIGHT_ROW_KEY,
  HOTEL_MADINAH_ROW_KEY,
  HOTEL_MAKKAH_ROW_KEY,
  serviceRowKey,
} from '@/shared/types';

interface BaseRow {
  key: string;
  defaultLabel: string;
  plainLabel: string;
  defaultShortLabel: string;
  amountDisplay?: string;
  baseIdr: number;
  baseUnitPrice: number;
  unitCurrency: string;
  hotelDetail?: BudgetBreakdown['hotelMadinahDetail'];
  shared: boolean;
}

export const breakdownToBaseRows = (breakdown: BudgetBreakdown): BaseRow[] => {
  const rows: BaseRow[] = [
    {
      key: HOTEL_MADINAH_ROW_KEY,
      defaultLabel: `Hotel Madinah - ${breakdown.hotelMadinahDetail.label}`,
      plainLabel: `Hotel Madinah - ${breakdown.hotelMadinahDetail.label}`,
      defaultShortLabel: 'Hotel Madinah:',
      baseIdr: breakdown.hotelMadinahIdr,
      baseUnitPrice: breakdown.hotelMadinahDetail.sarPerNight,
      unitCurrency: 'SAR',
      hotelDetail: breakdown.hotelMadinahDetail,
      shared: false,
    },
    {
      key: HOTEL_MAKKAH_ROW_KEY,
      defaultLabel: `Hotel Makkah - ${breakdown.hotelMakkahDetail.label}`,
      plainLabel: `Hotel Makkah - ${breakdown.hotelMakkahDetail.label}`,
      defaultShortLabel: 'Hotel Makkah:',
      baseIdr: breakdown.hotelMakkahIdr,
      baseUnitPrice: breakdown.hotelMakkahDetail.sarPerNight,
      unitCurrency: 'SAR',
      hotelDetail: breakdown.hotelMakkahDetail,
      shared: false,
    },
  ];

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
    });
  }

  rows.push({
    key: FLIGHT_ROW_KEY,
    defaultLabel: 'Penerbangan',
    plainLabel: 'Penerbangan',
    defaultShortLabel: 'Pesawat:',
    baseIdr: breakdown.flightIdr,
    baseUnitPrice: breakdown.flightIdr,
    unitCurrency: 'IDR',
    shared: false,
  });

  return rows;
};

export const isEmptyOverrides = (overrides: ManualOverrides | null | undefined): boolean => {
  if (!overrides) return true;
  const overrideKeys = Object.keys(overrides.overrides ?? {});
  const hasOverride = overrideKeys.some((k) => {
    const o = overrides.overrides[k];
    return o && (o.label != null || o.idr != null || o.unitPrice != null || o.hidden === true);
  });
  return !hasOverride && (overrides.customRows?.length ?? 0) === 0;
};

const resolveBaseRow = (base: BaseRow, ov: RowOverride | undefined): BreakdownDisplayRow => {
  const valueOverridden = ov?.idr != null;
  const unitOverridden = ov?.unitPrice != null;
  const amountOverridden = valueOverridden || unitOverridden;
  const labelOverridden = ov?.label != null;
  const hidden = ov?.hidden === true;

  const factor = base.baseUnitPrice > 0 ? base.baseIdr / base.baseUnitPrice : 1;
  const unitEditable = base.unitCurrency === 'IDR' || base.baseUnitPrice > 0;
  const unitPrice = unitOverridden ? (ov!.unitPrice as number) : base.baseUnitPrice;
  const idr = valueOverridden
    ? (ov!.idr as number)
    : unitOverridden
      ? Math.round(unitPrice * factor)
      : base.baseIdr;

  const label = labelOverridden
    ? (ov!.label as string)
    : amountOverridden
      ? base.plainLabel
      : base.defaultLabel;
  const shortLabel = labelOverridden ? `${ov!.label}:` : base.defaultShortLabel;

  const amountDisplay = amountOverridden ? undefined : base.amountDisplay;
  const hotelDetail =
    base.hotelDetail && !valueOverridden
      ? unitOverridden
        ? { ...base.hotelDetail, sarPerNight: unitPrice }
        : base.hotelDetail
      : undefined;

  const stale = ov?.autoIdrAtOverride != null && ov.autoIdrAtOverride !== base.baseIdr;

  const source: BreakdownDisplayRow['source'] =
    amountOverridden || labelOverridden || hidden ? 'overridden' : 'computed';

  return {
    key: base.key,
    label,
    shortLabel,
    amountDisplay,
    unitPrice,
    unitCurrency: base.unitCurrency,
    unitEditable,
    idr,
    hotelDetail,
    shared: base.shared,
    hidden,
    stale,
    source,
  };
};

export const applyOverrides = (
  breakdown: BudgetBreakdown,
  overrides: ManualOverrides | null | undefined,
  pax: number,
): BreakdownDisplay => {
  const safePax = Math.max(1, pax);
  const overrideMap = overrides?.overrides ?? {};
  const customRows = overrides?.customRows ?? [];

  const rows: BreakdownDisplayRow[] = breakdownToBaseRows(breakdown).map((base) =>
    resolveBaseRow(base, overrideMap[base.key]),
  );

  for (const custom of customRows) {
    rows.push({
      key: `custom:${custom.id}`,
      label: custom.label,
      shortLabel: `${custom.label}:`,
      amountDisplay: undefined,
      unitPrice: custom.idr,
      unitCurrency: 'IDR',
      unitEditable: true,
      idr: custom.idr,
      hotelDetail: undefined,
      shared: false,
      hidden: false,
      stale: false,
      source: 'custom',
    });
  }

  let totalIdrPax = 0;
  let totalIdrGrp = 0;
  for (const row of rows) {
    if (row.hidden) continue;
    totalIdrPax += row.idr;
    totalIdrGrp += row.idr * safePax;
  }

  return {
    rows,
    totalIdrPax,
    totalIdrGrp,
    sarRate: breakdown.sarRate,
    usdRate: breakdown.usdRate,
  };
};
