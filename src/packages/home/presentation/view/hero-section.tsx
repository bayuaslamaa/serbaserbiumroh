import Link from 'next/link';
import { CommunityStats } from '@/packages/stats/presentation/view/community-stats';
import { FullBleed } from '@/components/templates/full-bleed';

interface HeroSectionProps {
  visitorCount: number | null;
}

export const HeroSection = ({ visitorCount }: HeroSectionProps) => {
  return (
    <FullBleed
      className="-mt-6 overflow-hidden"
      style={{
        background:
          'radial-gradient(1000px 420px at 50% -120px, rgba(201,168,76,0.10), transparent 70%), ' +
          'radial-gradient(700px 340px at 85% 110%, rgba(44,107,66,0.14), transparent 70%), ' +
          'var(--color-bg)',
      }}
    >
      <section className="relative px-6 py-14 text-center sm:py-16 md:pb-[76px] md:pt-[88px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(201,168,76,0.05) 0 1px, transparent 1px 28px), ' +
              'repeating-linear-gradient(-45deg, rgba(201,168,76,0.05) 0 1px, transparent 1px 28px)',
          }}
        />

        <div className="relative mx-auto flex max-w-[820px] flex-col items-center">
          <h1
            className="mb-3.5 font-bold text-gold [text-wrap:balance]"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(30px, 4.2vw, 46px)',
              lineHeight: 1.2,
            }}
          >
            Panduan Umroh Mandiri: Biaya, Hotel, Visa, dan Komunitas
          </h1>
          <p className="mb-2.5 text-[17px] text-[var(--color-text-soft)]">
            Serba Serbi Umroh — partner setia umroh mandirimu
          </p>
          <p className="mb-[26px] max-w-[560px] text-[14.5px] leading-relaxed text-[var(--color-text-muted)]">
            Rencanakan perjalanan umroh mandiri Anda dengan panduan lengkap, cerita nyata dari para
            jamaah, dan estimasi biaya berbasis data riil.
          </p>

          <div className="mb-[30px] flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/panduan"
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-7 py-[13px] text-[15px] font-bold text-[var(--color-bg)] shadow-[0_4px_24px_rgba(201,168,76,0.25)] transition-colors hover:bg-gold-hover"
            >
              Pelajari Panduan Umroh
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/cerita-jamaah"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-gold-muted)] px-6 py-3 text-[14.5px] font-semibold text-gold transition-colors hover:border-[var(--color-gold)] hover:bg-[rgba(201,168,76,0.06)]"
            >
              Lihat Cerita Jamaah
            </Link>
          </div>

          <CommunityStats visitorCount={visitorCount} variant="inline" />
        </div>
      </section>
    </FullBleed>
  );
};
