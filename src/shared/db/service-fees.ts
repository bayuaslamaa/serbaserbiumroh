import { SERVICE_KEYS, type ServiceKey } from '@/shared/types';

export interface ServiceFeeRow {
  key: ServiceKey;
  currency: 'SAR' | 'USD' | 'IDR';
  amount: number;
  label: string;
  enabled: boolean;
  divideByPax: boolean;
}

const SERVICE_FEE_CATALOGUE: Record<ServiceKey, Omit<ServiceFeeRow, 'key'>> = {
  VISA: {
    currency: 'USD',
    amount: 165,
    label: 'Visa Umroh Reguler',
    enabled: true,
    divideByPax: false,
  },
  SISKOPATUH: {
    currency: 'IDR',
    amount: 200000,
    label: 'Siskopatuh',
    enabled: true,
    divideByPax: false,
  },
  TASREH: {
    currency: 'SAR',
    amount: 25,
    label: 'Tasreh Raudhah',
    enabled: true,
    divideByPax: false,
  },
  TRANSPORT_JED_MAKKAH: {
    currency: 'SAR',
    amount: 400,
    label: 'Transportasi Jeddah → Makkah',
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_JED_MADINAH: {
    currency: 'SAR',
    amount: 650,
    label: 'Transportasi Jeddah → Madinah',
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_MAKKAH_MADINAH: {
    currency: 'SAR',
    amount: 550,
    label: 'Transportasi Makkah ↔ Madinah',
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_MAKKAH_JED: {
    currency: 'SAR',
    amount: 300,
    label: 'Transportasi Makkah → Jeddah',
    enabled: true,
    divideByPax: true,
  },
  TRANSPORT_MADINAH_JED: {
    currency: 'SAR',
    amount: 550,
    label: 'Transportasi Madinah → Jeddah',
    enabled: true,
    divideByPax: true,
  },
  TOUR_MAKKAH: {
    currency: 'SAR',
    amount: 150,
    label: 'Tour Ziarah Makkah',
    enabled: true,
    divideByPax: true,
  },
  TOUR_MADINAH: {
    currency: 'SAR',
    amount: 150,
    label: 'Tour Ziarah Madinah',
    enabled: true,
    divideByPax: true,
  },
  MUTHOWIF: { currency: 'SAR', amount: 0, label: 'Muthowif', enabled: false, divideByPax: true },
};

export const SERVICE_FEE_ROWS: ServiceFeeRow[] = SERVICE_KEYS.map((key) => ({
  key,
  ...SERVICE_FEE_CATALOGUE[key],
}));
