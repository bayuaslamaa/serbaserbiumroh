import {
  BedDouble,
  Bus,
  HeartHandshake,
  Stamp,
  TrainFront,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { badalinPriceShort } from '@/packages/badalin/domain/content';

export const SSU_WHATSAPP_NUMBER = '6285161134844';

export const whatsappHref = (message: string): string => {
  return `https://wa.me/${SSU_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

export interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: LucideIcon;
  href: string;
  isNew?: boolean;
}

export const services: Service[] = [
  {
    id: 'visa',
    name: 'Visa Umroh',
    description: 'Pengurusan visa umroh mandiri, cepat dan resmi tanpa harus lewat travel.',
    price: 'Mulai USD 165',
    icon: Stamp,
    href: '/visa',
  },
  {
    id: 'badalin',
    name: 'Badalin — Badal Umroh',
    description: 'Badal umroh amanah dengan dokumentasi video lengkap dan sertifikat.',
    price: `Mulai ${badalinPriceShort}`,
    icon: HeartHandshake,
    href: '/badalin',
    isNew: true,
  },
  {
    id: 'transportasi',
    name: 'Sewa Transportasi',
    description: 'Antar-jemput bandara, Makkah–Madinah, dan city tour dengan driver Indonesia.',
    price: 'Mulai SAR 170',
    icon: Bus,
    href: '/transportasi',
  },
  {
    id: 'hotel',
    name: 'Booking Hotel',
    description: 'Pemesanan hotel Makkah & Madinah terverifikasi Nusuk, dekat Masjidil Haram.',
    price: 'Mulai Rp 900 rb/malam',
    icon: BedDouble,
    href: '/hotel-nusuk',
  },
  {
    id: 'hhr',
    name: 'Jasa Booking HHR',
    description:
      'Kami bantu pesan Tiket kereta cepat Haramain Makkah–Madinah tanpa ribet akun Saudi.',
    price: '+Rp 100 rb/orang (tidak termasuk tiket)',
    icon: TrainFront,
    href: whatsappHref('Assalamualaikum, saya ingin memesan tiket kereta cepat Haramain (HHR).'),
  },
  {
    id: 'muthowwif',
    name: 'Muthowwif',
    description: 'Pendamping ibadah berbahasa Indonesia untuk umroh yang tenang dan sah.',
    price: 'Mulai Rp 1,4 jt/sesi',
    icon: UserCheck,
    href: whatsappHref(
      'Assalamualaikum, saya ingin memesan layanan muthowwif (pendamping ibadah).',
    ),
  },
];

export const layananConsultHref = whatsappHref(
  'Assalamualaikum, saya ingin konsultasi layanan Serba Serbi Umroh.',
);

export const badalConsultHref = whatsappHref(
  'Assalamualaikum, saya ingin memesan layanan Badalin (badal umroh).',
);

export const isExternalHref = (href: string): boolean => {
  return href.startsWith('http');
};

export const serviceCardTreatment = (isNew?: boolean) => {
  return {
    borderColor: isNew ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.16)',
    background: isNew ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.02)',
  };
};
