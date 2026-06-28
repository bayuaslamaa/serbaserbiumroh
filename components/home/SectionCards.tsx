import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, Hotel, Calculator, MessageCircle, ShieldCheck, BedDouble } from 'lucide-react'

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
    title: 'Pesan Hotel',
    description: 'Katalog offer hotel yang bisa direquest manual via WhatsApp',
    href: '/pesan-hotel',
    icon: BedDouble,
  },
  {
    title: 'Visa Umroh',
    description: 'Layanan penerbitan visa umroh reguler online & Siskopatuh',
    href: '/visa',
    icon: ShieldCheck,
  },
  {
    title: 'Komunitas',
    description: 'Ajukan masuk grup WhatsApp umroh mandiri yang dicek admin',
    href: '/komunitas',
    icon: MessageCircle,
  },
  {
    title: 'Estimasi Biaya',
    description: 'Hitung estimasi biaya umroh mandiri dengan AI berbasis data riil',
    href: '/estimate/new',
    icon: Calculator,
    disabled: true,
    badge: 'Coming Soon',
  },
]

interface SectionCardsProps {
  isAdmin?: boolean
}

export function SectionCards({ isAdmin = false }: SectionCardsProps) {
  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
        Mulai Perencanaan Umroh Anda
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          const isDisabled = section.disabled && !isAdmin
          
          const CardContentComp = (
            <Card
              className={`h-full transition-colors flex flex-col justify-between ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-yellow-600 cursor-pointer'
              }`}
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-6 h-6" style={{ color: 'var(--color-gold)' }} />
                    {section.badge && !isAdmin && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: 'var(--color-gold)',
                          color: 'var(--color-gold)',
                          fontSize: '9px',
                          padding: '0 6px',
                        }}
                      >
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {section.description}
                  </p>
                </CardContent>
              </div>
            </Card>
          )

          if (isDisabled) {
            return (
              <div key={section.title}>
                {CardContentComp}
              </div>
            )
          }

          return (
            <Link key={section.href} href={section.href}>
              {CardContentComp}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
