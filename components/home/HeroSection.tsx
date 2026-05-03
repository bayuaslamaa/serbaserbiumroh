import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="py-16 text-center">
      <h1
        className="text-4xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Umroh Mandiri
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
        <Link href="/estimate/new">
          <Button variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
            Buat Estimasi Biaya
          </Button>
        </Link>
      </div>
    </section>
  )
}
