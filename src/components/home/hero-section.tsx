import Link from 'next/link'
import { CommunityStats } from '@/components/stats/community-stats'
import { FullBleed } from '@/components/layout/full-bleed'

interface HeroSectionProps {
  /**
   * Raw unique-visitor count, already resolved by the page. Null when
   * unreadable. Required on purpose — a default would let a caller drop the
   * prop and silently lose the figure with nothing failing.
   */
  visitorCount: number | null
}

/**
 * The hero owns the page's atmosphere and exactly one primary action.
 *
 * The estimator call to action that used to sit here is gone: for everyone but
 * an admin it rendered as a disabled "Coming Soon" button, which spent a third
 * of the page's main action row on a control nobody could press. The estimator
 * still has a home in SectionCards, where its unfinished state reads as one
 * entry in a map rather than a dead primary button.
 */
export function HeroSection({ visitorCount }: HeroSectionProps) {
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
        {/*
          Two crossed hairline grids standing in for the geometric pattern the
          design calls for. Decorative and non-blocking, so it stays out of the
          accessibility tree and never eats a click meant for the buttons.
        */}
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
          {/*
            The H1 carries the search intent, not the brand. The brand name is
            already in the navbar, the logo, and every page title via
            title.template, so spending the strongest on-page signal on it was
            pure waste.

            Nothing may be added above this heading that carries a heading of
            its own — it has to stay the document's first.
          */}
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
  )
}
