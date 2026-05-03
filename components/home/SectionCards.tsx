import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, Hotel, Calculator } from 'lucide-react'

const sections = [
  {
    title: 'Panduan Umroh',
    description: 'Panduan lengkap tata cara umroh, manasik, dan doa dzikir',
    href: '/panduan',
    icon: BookOpen,
  },
  {
    title: 'Cerita Jamaah',
    description: 'Pengalaman nyata jamaah umroh mandiri lengkap dengan itinerary dan anggaran',
    href: '/cerita-jamaah',
    icon: Users,
  },
  {
    title: 'Hotel Nusuk',
    description: 'Direktori hotel dekat Masjidil Haram dan Masjid Nabawi pilihan jamaah',
    href: '/hotel-nusuk',
    icon: Hotel,
  },
  {
    title: 'Estimasi Biaya',
    description: 'Hitung estimasi biaya umroh mandiri dengan AI berbasis data riil',
    href: '/estimate/new',
    icon: Calculator,
  },
]

export function SectionCards() {
  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
        Mulai Perencanaan Umroh Anda
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card
                className="h-full hover:border-yellow-600 transition-colors cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
              >
                <CardHeader className="pb-2">
                  <Icon className="w-6 h-6 mb-2" style={{ color: 'var(--color-gold)' }} />
                  <CardTitle className="text-sm" style={{ color: 'var(--color-gold)' }}>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
