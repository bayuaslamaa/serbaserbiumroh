import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CommunityStats } from '@/components/stats/CommunityStats'

interface HeroSectionProps {
  isAdmin?: boolean
  /**
   * Raw unique-visitor count, already resolved by the page. Null when
   * unreadable. Required on purpose — a default would let a caller drop the
   * prop and silently lose the pill with nothing failing.
   */
  visitorCount: number | null
}

export function HeroSection({ isAdmin = false, visitorCount }: HeroSectionProps) {
  return (
    <section className="py-16 text-center">
      {/*
        The H1 carries the search intent, not the brand. The brand name is
        already in the navbar, the logo, and every page title via
        title.template, so spending the strongest on-page signal on it was
        pure waste.
      */}
      <h1
        className="text-4xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Panduan Umroh Mandiri: Biaya, Hotel, Visa, dan Komunitas
      </h1>
      <p className="text-lg mb-2" style={{ color: 'var(--color-text-muted)' }}>
        Serba Serbi Umroh — partner setia umroh mandirimu
      </p>
      <p className="text-sm mb-8 max-w-xl mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        Rencanakan perjalanan umroh mandiri Anda dengan panduan lengkap, cerita nyata dari para jamaah,
        dan estimasi biaya yang akurat berbasis data riil.
      </p>

      <div className="mb-8">
        <CommunityStats visitorCount={visitorCount} />
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        <Link href="/cerita-jamaah">
          <Button style={{ backgroundColor: 'var(--color-gold)', color: '#0b1c12' }}>
            Lihat Cerita Jamaah
          </Button>
        </Link>
        <Link href="/komunitas">
          <Button variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
            Gabung Komunitas
          </Button>
        </Link>
        <Link href="/webinar-umroh-mandiri">
          <Button variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
            RSVP Webinar
          </Button>
        </Link>
        {isAdmin ? (
          <Link href="/estimate/new">
            <Button variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
              Buat Estimasi Biaya
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            disabled
            className="opacity-50 cursor-not-allowed text-[var(--color-text-muted)]"
            style={{ borderColor: 'var(--color-border)', cursor: 'not-allowed' }}
          >
            Buat Estimasi Biaya (Coming Soon)
          </Button>
        )}
      </div>
    </section>
  )
}
