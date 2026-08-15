import { SERVICE_KEYS, type ServiceKey } from "@/shared/types"

export interface ServiceFeeRow {
  key: ServiceKey
  currency: "SAR" | "USD" | "IDR"
  amount: number
  label: string
  enabled: boolean
  divideByPax: boolean
}

// The catalogue every service_fees row is seeded from. Typed as a Record over ServiceKey on
// purpose: adding a key to SERVICE_KEYS without a price here is a compile error, so no key can be
// offered in the estimator that the database cannot price.
//
// The retired TRANSPORT ("Full Rute") key is absent on purpose: it is gone from SERVICE_KEYS, so
// this Record cannot name it, and syncServiceFees deletes any row left behind in a deployed
// database. Saved estimates that still reference it are expanded on read, not priced from here.
//
// Transport is priced per leg at the rates published on /transportasi, fees included (the page
// adds a 50 SAR SSU fee to every route and another 50 for an airport pickup, so these are 50-100
// above the basePrice fields behind it). Labels name the route, not the vehicle: there is one
// vehicle tier today, and burying "Staria" in six labels means six edits when that changes.
const SERVICE_FEE_CATALOGUE: Record<ServiceKey, Omit<ServiceFeeRow, "key">> = {
  VISA: { currency: "USD", amount: 165, label: "Visa Umroh Reguler", enabled: true, divideByPax: false },
  SISKOPATUH: { currency: "IDR", amount: 200000, label: "Siskopatuh", enabled: true, divideByPax: false },
  TASREH: { currency: "SAR", amount: 25, label: "Tasreh Raudhah", enabled: true, divideByPax: false },
  TRANSPORT_JED_MAKKAH: {
    currency: "SAR",
    amount: 400,
    label: "Transportasi Jeddah → Makkah",
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_JED_MADINAH: {
    currency: "SAR",
    amount: 650,
    label: "Transportasi Jeddah → Madinah",
    enabled: true,
    divideByPax: true,
  },
  // The published page quotes only the Makkah→Madinah direction; this rate is applied both ways.
  TRANSPORT_MAKKAH_MADINAH: {
    currency: "SAR",
    amount: 550,
    label: "Transportasi Makkah ↔ Madinah",
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_MAKKAH_JED: {
    currency: "SAR",
    amount: 300,
    label: "Transportasi Makkah → Jeddah",
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_MADINAH_JED: {
    currency: "SAR",
    amount: 550,
    label: "Transportasi Madinah → Jeddah",
    enabled: true,
    divideByPax: true,
  },
  TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Ziarah Makkah", enabled: true, divideByPax: true },
  TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Ziarah Madinah", enabled: true, divideByPax: true },
  // Seeded disabled, not at amount 0: the muthowif fee is still unconfirmed, and calculateBudget
  // skips a disabled service while it happily prices a zero-amount one. A "SAR 0" line would
  // otherwise reach a customer quote the moment muthowif joins the default service set. The admin
  // pricing screen is where the real figure gets set, which is why it must be enabled there first.
  MUTHOWIF: { currency: "SAR", amount: 0, label: "Muthowif", enabled: false, divideByPax: true },
}

export const SERVICE_FEE_ROWS: ServiceFeeRow[] = SERVICE_KEYS.map((key) => ({
  key,
  ...SERVICE_FEE_CATALOGUE[key],
}))
