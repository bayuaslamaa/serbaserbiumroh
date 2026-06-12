import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  isAdmin?: boolean
}

export function HeroSection({ isAdmin = false }: HeroSectionProps) {
  return (
    <section className="py-16 text-center">
      <h1
        className="text-4xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Serba Serbi Umroh
      </h1>
      <p className="text-lg mb-2" style={{ color: 'var(--color-text-muted)' }}>
        Panduan Lengkap Ibadah Umroh Secara Mandiri
      </p>
      <p className="text-sm mb-8 max-w-xl mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        Rencanakan perjalanan umroh mandiri Anda dengan panduan lengkap, cerita nyata dari para jamaah,
        dan estimasi biaya yang akurat berbasis data riil.
      </p>
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
