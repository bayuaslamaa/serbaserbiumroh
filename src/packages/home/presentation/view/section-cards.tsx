import Link from 'next/link';
import { BookOpen, Calculator, Hotel, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { COMMUNITY_SIZE } from '@/packages/stats/domain/community';
import { services } from '@/packages/layanan/domain/catalog';

const primary = [
  {
    title: 'Panduan Umroh',
    description: 'Tata cara umroh, manasik, dan doa dzikir — dari niat sampai tahallul.',
    cta: 'Mulai belajar',
    href: '/panduan',
    icon: BookOpen,
  },
  {
    title: 'Cerita Jamaah',
    description: 'Pengalaman nyata lengkap dengan itinerary dan rincian anggaran riil.',
    cta: 'Baca pengalaman',
    href: '/cerita-jamaah',
    icon: Users,
  },
  {
    title: 'Komunitas',
    description: `Grup WhatsApp umroh mandiri yang dikurasi admin — ${COMMUNITY_SIZE} anggota.`,
    cta: 'Ajukan gabung',
    href: '/komunitas',
    icon: MessageCircle,
  },
];

const secondary = [
  {
    title: 'Hotel Nusuk',
    description: 'Direktori hotel dekat Haramain',
    href: '/hotel-nusuk',
    icon: Hotel,
  },
  {
    title: 'Visa Umroh',
    description: 'Reguler online & Siskopatuh',
    href: '/visa',
    icon: ShieldCheck,
  },
];

const stripLabels: Record<string, { short: string; withPrice: boolean }> = {
  visa: { short: 'Visa', withPrice: true },
  badalin: { short: 'Badalin', withPrice: false },
  transportasi: { short: 'Transportasi', withPrice: true },
  hotel: { short: 'Hotel', withPrice: true },
  hhr: { short: 'HHR', withPrice: false },
  muthowwif: { short: 'Muthowwif', withPrice: false },
};

const cardBase =
  'rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] transition-all';
const cardHover =
  'hover:border-[var(--color-gold-muted)] hover:shadow-[0_0_24px_rgba(201,168,76,0.10)]';
const rowBase = 'flex items-center gap-3.5 rounded-[10px] border px-[18px] py-4 transition-colors';

interface SectionCardsProps {
  isAdmin?: boolean;
}

export const SectionCards = ({ isAdmin = false }: SectionCardsProps) => {
  return (
    <section className="pb-3 pt-14">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <h2
          className="text-2xl font-bold text-gold sm:text-[28px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Mulai Perencanaan Umroh Anda
        </h2>
        <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">
          3 langkah: belajar &rarr; lihat pengalaman &rarr; gabung
        </span>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${cardBase} ${cardHover} flex flex-col gap-2.5 px-6 py-[26px]`}
            >
              <span className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[rgba(201,168,76,0.10)]">
                <Icon className="h-[21px] w-[21px] text-gold" />
              </span>
              <span className="text-[17px] font-bold text-[var(--color-text)]">{item.title}</span>
              <span className="text-[13.5px] leading-relaxed text-[var(--color-text-muted)]">
                {item.description}
              </span>
              <span className="mt-auto pt-1 text-[13px] font-semibold text-gold">
                {item.cta} <span aria-hidden>&rarr;</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {secondary.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${rowBase} border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--color-gold-muted)]`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-gold" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-[var(--color-text)]">{item.title}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{item.description}</span>
              </span>
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/estimate/new"
            className={`${rowBase} border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--color-gold-muted)]`}
          >
            <Calculator className="h-[18px] w-[18px] shrink-0 text-gold" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[var(--color-text)]">Estimasi Biaya</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                Kalkulator AI berbasis data riil
              </span>
            </span>
          </Link>
        ) : (
          <div
            className={`${rowBase} border-dashed border-[rgba(201,168,76,0.25)] bg-[rgba(255,255,255,0.015)]`}
          >
            <Calculator className="h-[18px] w-[18px] shrink-0 text-[var(--color-green-text)]" />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-soft)]">
                  Estimasi Biaya
                </span>
                <span className="rounded-full border border-[var(--color-gold-muted)] px-2 py-px text-[10.5px] font-bold tracking-wider text-gold">
                  SEGERA
                </span>
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                Kalkulator AI berbasis data riil
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="mt-[18px] flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] bg-[linear-gradient(90deg,rgba(201,168,76,0.05),rgba(44,107,66,0.06))] px-5 py-[15px] sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-[var(--color-text-soft)]">
          <span className="text-[13px] font-bold text-gold">Layanan kami:</span>

          {services
            .flatMap((service) => {
              const label = stripLabels[service.id];
              return label ? [{ service, label }] : [];
            })
            .map(({ service, label }, index) => (
              <span key={service.id} className="flex items-center gap-2.5">
                {index > 0 && (
                  <span aria-hidden className="text-[rgba(201,168,76,0.35)]">
                    &middot;
                  </span>
                )}
                <span>
                  {label.short}
                  {label.withPrice && (
                    <span className="text-[var(--color-text-muted)]"> {service.price}</span>
                  )}
                  {service.isNew && (
                    <span className="ml-1.5 rounded-full bg-gold px-1.5 py-px align-[1px] text-[10px] font-bold text-[var(--color-bg)]">
                      BARU
                    </span>
                  )}
                </span>
              </span>
            ))}
        </span>
        <Link
          href="/layanan"
          className="shrink-0 text-[13px] font-bold text-gold hover:text-gold-hover"
        >
          Lihat semua layanan <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </section>
  );
};
